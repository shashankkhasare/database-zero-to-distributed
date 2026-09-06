import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const REPOSITORY_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const lessonId = process.argv[2];
if (!lessonId) throw new Error("usage: npm run video:preview -- <lesson-id> [fps]");
const fps = Number(process.argv[3] ?? 12);
if (!Number.isInteger(fps) || fps <= 0 || fps > 60) {
  throw new Error("FPS must be an integer from 1 through 60");
}

const lessonDirectory = await findLessonDirectory(lessonId);
const lesson = parseYaml(await readFile(join(lessonDirectory, "lesson.yaml"), "utf8"));
const timingPath = join(REPOSITORY_ROOT, "build", "video", lessonId, "timing.json");
const timing = JSON.parse(await readFile(timingPath, "utf8"));
const buildDirectory = join(REPOSITORY_ROOT, "build", "video", lessonId);
await mkdir(buildDirectory, { recursive: true });
const defaultWorkerCount = fps >= 24 ? 1 : 2;
const workerCount = Math.max(1, Math.min(4, Number(process.env.VIDEO_RENDER_WORKERS ?? defaultWorkerCount)));

await runNode("video/scripts/validate-video-sources.mjs", [lessonId]);

const clips = [];
const sceneJobs = [lesson.ident, ...lesson.scenes, lesson.outro].filter(Boolean).map((scene) => async () => {
  const beats = timing.beats.filter((beat) => beat.scene === scene.id);
  const first = beats[0];
  const last = beats.at(-1);
  const duration = last ? last.end + last.pauseAfter - first.start : scene.duration;
  const frameDirectory = join(
    buildDirectory,
    "frames",
    scene.id,
    `frames-${fps}fps`,
  );
  const expectedFrames = Math.ceil(duration * fps);
  const fingerprint = await sceneFingerprint(scene, beats, fps);
  const clipPath = join(buildDirectory, `${scene.id}-preview.mp4`);
  const clipStatePath = join(buildDirectory, `${scene.id}-preview.json`);

  if (await hasCompleteClip(clipPath, clipStatePath, fingerprint, fps)) {
    console.log(`Reusing encoded ${fps} FPS clip for ${scene.id}`);
    return clipPath;
  }

  if (!(await hasCompleteFrameSet(frameDirectory, expectedFrames, fingerprint))) {
    await runNode("video/scripts/render-scenes.mjs", [lessonId, scene.id, "--fps", String(fps)]);
    await writeFile(
      join(frameDirectory, "source-fingerprint.json"),
      `${JSON.stringify({ fingerprint, expectedFrames }, null, 2)}\n`,
    );
  } else {
    console.log(`Reusing ${expectedFrames} frames for ${scene.id}`);
  }

  await runNode("video/scripts/compose-scene-preview.mjs", [lessonId, scene.id, String(fps)]);
  await writeFile(
    clipStatePath,
    `${JSON.stringify({ fingerprint, fps, duration }, null, 2)}\n`,
  );
  if (process.env.VIDEO_KEEP_FRAMES !== "1") {
    await rm(frameDirectory, { recursive: true, force: true });
  }
  return clipPath;
});
clips.push(...await runWithConcurrency(sceneJobs, workerCount));

const concatPath = join(buildDirectory, "preview-clips.txt");
const concatText = clips
  .map((path) => `file '${path.replaceAll("\\", "/").replaceAll("'", "'\\''")}'`)
  .join("\n");
await writeFile(concatPath, `${concatText}\n`);

const outputPath = join(buildDirectory, "preview.mp4");
await run("ffmpeg", [
  "-y",
  "-f", "concat",
  "-safe", "0",
  "-i", concatPath,
  "-c", "copy",
  "-movflags", "+faststart",
  outputPath,
]);

console.log(`Lesson preview: ${outputPath}`);

async function hasCompleteFrameSet(directory, expectedFrames, fingerprint) {
  if (!existsSync(directory)) return false;
  const entries = await readdir(directory);
  const frameCount = entries.filter((name) => /^frame-\d{6}\.png$/.test(name)).length;
  if (frameCount !== expectedFrames) return false;
  try {
    const metadata = JSON.parse(await readFile(join(directory, "source-fingerprint.json"), "utf8"));
    return metadata.fingerprint === fingerprint && metadata.expectedFrames === expectedFrames;
  } catch {
    return false;
  }
}

async function hasCompleteClip(clipPath, statePath, fingerprint, frameRate) {
  if (!existsSync(clipPath) || !existsSync(statePath)) return false;
  try {
    const metadata = JSON.parse(await readFile(statePath, "utf8"));
    return metadata.fingerprint === fingerprint && metadata.fps === frameRate;
  } catch {
    return false;
  }
}

async function sceneFingerprint(scene, beats, frameRate) {
  const sharedDirectories = ["video/components", "video/styles"];
  const paths = [scene.module, "video/player.html", "video/player.mjs"];
  for (const directory of sharedDirectories) {
    const entries = await readdir(join(REPOSITORY_ROOT, directory), { withFileTypes: true });
    paths.push(...entries.filter((entry) => entry.isFile()).map((entry) => `${directory}/${entry.name}`));
  }
  const hash = createHash("sha256");
  hash.update(JSON.stringify({ scene, beats, frameRate, width: 1920, height: 1080 }));
  for (const path of paths.sort()) {
    hash.update(path);
    hash.update(await readFile(join(REPOSITORY_ROOT, path)));
  }
  return hash.digest("hex");
}

async function runWithConcurrency(jobPromises, limit) {
  const results = new Array(jobPromises.length);
  let next = 0;
  async function worker() {
    while (next < jobPromises.length) {
      const index = next++;
      results[index] = await jobPromises[index]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, jobPromises.length) }, worker));
  return results;
}

async function findLessonDirectory(id) {
  const lessonsDirectory = join(REPOSITORY_ROOT, "lessons");
  const entries = await readdir(lessonsDirectory, { withFileTypes: true });
  const matches = entries.filter((entry) => entry.isDirectory() && entry.name.startsWith(`${id}-`));
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one lesson directory beginning with ${id}-`);
  }
  return join(lessonsDirectory, matches[0].name);
}

function runNode(script, arguments_) {
  return run(process.execPath, [join(REPOSITORY_ROOT, script), ...arguments_]);
}

function run(command, arguments_) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, arguments_, { cwd: REPOSITORY_ROOT, stdio: "inherit" });
    child.once("error", rejectRun);
    child.once("exit", (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${command} exited with code ${code}`));
    });
  });
}
