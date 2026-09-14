import { spawn } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const REPOSITORY_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const lessonId = process.argv[2];
const sceneName = process.argv[3];
if (!lessonId || !sceneName) {
  throw new Error("usage: npm run video:scene-preview -- <lesson-id> <scene-id> [fps]");
}
const fps = Number(process.argv[4] ?? 12);

if (!Number.isInteger(fps) || fps <= 0 || fps > 60) {
  throw new Error("FPS must be an integer from 1 through 60");
}

const timingPath = join(REPOSITORY_ROOT, "build", "video", lessonId, "timing.json");
const timing = JSON.parse(await readFile(timingPath, "utf8"));
const lessonDirectory = await findLessonDirectory(lessonId);
const lesson = parseYaml(await readFile(join(lessonDirectory, "lesson.yaml"), "utf8"));
const sceneBeats = timing.beats.filter((beat) => beat.scene === sceneName);
const validated = JSON.parse(await readFile(
  join(REPOSITORY_ROOT, "build", "video", lessonId, "validated-sources.json"),
  "utf8",
).catch(() => "null"));
const start = sceneBeats[0]?.start ?? 0;
const lastBeat = sceneBeats.at(-1);
const silentScene = validated?.silentScenes?.find((scene) => scene.id === sceneName);
const duration = lastBeat
  ? lastBeat.end + lastBeat.pauseAfter - start
  : silentScene?.duration;
if (!Number.isFinite(duration)) {
  throw new Error(`No timing information found for scene: ${sceneName}`);
}
const framesDirectory = join(
  REPOSITORY_ROOT,
  "build",
  "video",
  lessonId,
  "frames",
  sceneName,
  `frames-${fps}fps`,
);
const audioPath = join(REPOSITORY_ROOT, "build", "video", lessonId, "audio-review.wav");
const outputPath = join(REPOSITORY_ROOT, "build", "video", lessonId, `${sceneName}-preview.mp4`);

const music = sceneName === lesson.ident?.id
  ? lesson.music?.ident
  : sceneName === lesson.outro?.id
    ? lesson.music?.outro
    : undefined;
const audioArguments = sceneBeats.length > 0
  ? ["-ss", start.toFixed(3), "-t", duration.toFixed(3), "-i", audioPath]
  : music
    ? ["-t", duration.toFixed(3), "-i", resolve(REPOSITORY_ROOT, music.file)]
    : ["-f", "lavfi", "-t", duration.toFixed(3), "-i", "anullsrc=r=24000:cl=mono"];
const audioFilter = music
  ? ["-af", `volume=${music.gain_db}dB,afade=t=in:st=0:d=${music.fade_in},afade=t=out:st=${duration - music.fade_out}:d=${music.fade_out},atrim=duration=${duration}`]
  : [];

await run("ffmpeg", [
  "-y",
  "-framerate", String(fps),
  "-i", join(framesDirectory, "frame-%06d.png"),
  ...audioArguments,
  ...audioFilter,
  "-c:v", "libx264",
  "-preset", "medium",
  "-crf", "18",
  "-pix_fmt", "yuv420p",
  "-c:a", "aac",
  "-b:a", "192k",
  "-shortest",
  outputPath,
]);

console.log(`Scene preview: ${outputPath}`);

function run(command, arguments_) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, arguments_, { stdio: "inherit" });
    child.once("error", rejectRun);
    child.once("exit", (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function findLessonDirectory(id) {
  const lessonsDirectory = join(REPOSITORY_ROOT, "lessons");
  const entries = await readdir(lessonsDirectory, { withFileTypes: true });
  const matches = entries.filter((entry) => entry.isDirectory() && entry.name.startsWith(`${id}-`));
  if (matches.length !== 1) throw new Error(`Expected exactly one lesson directory beginning with ${id}-`);
  return join(lessonsDirectory, matches[0].name);
}
