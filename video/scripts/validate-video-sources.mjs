import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";

const REPOSITORY_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const lessonId = process.argv[2];
if (!lessonId) throw new Error("usage: npm run video:validate-sources -- <lesson-id>");
const lessonDirectory = await findLessonDirectory(lessonId);
const manifestPath = join(lessonDirectory, "lesson.yaml");
const lesson = parseYaml(await readFile(manifestPath, "utf8"));

for (const field of ["chapter", "narration", "narration_beats", "scene_plan", "expected_output"]) {
  requireFile(lesson[field], field);
}

if (!Array.isArray(lesson.scenes) || lesson.scenes.length === 0) {
  throw new Error("lesson.yaml must list at least one scene");
}

const timingPath = join(REPOSITORY_ROOT, "build", "video", lessonId, "timing.json");
if (!existsSync(timingPath)) {
  throw new Error(`Generate audio timing before validation: ${timingPath}`);
}
const timing = JSON.parse(await readFile(timingPath, "utf8"));
const timingSceneIds = [...new Set(timing.beats.map((beat) => beat.scene))];
const manifestSceneIds = lesson.scenes.map((scene) => scene.id);

for (const [name, silentScene] of [["ident", lesson.ident], ["outro", lesson.outro]]) {
  if (!silentScene) continue;
  const modulePath = requireFile(silentScene.module, `${name} module`);
  const sceneModule = await import(pathToFileURL(modulePath));
  if (typeof sceneModule.renderScene !== "function" || !Number.isFinite(sceneModule.duration)) {
    throw new Error(`${name} module does not implement renderScene and duration: ${silentScene.module}`);
  }
  if (Math.abs(sceneModule.duration - silentScene.duration) > 0.001) {
    throw new Error(`${name} manifest duration does not match its scene module`);
  }
  console.log(`${silentScene.id}: ${sceneModule.duration.toFixed(3)}s (${silentScene.module})`);
}

if (new Set(manifestSceneIds).size !== manifestSceneIds.length) {
  throw new Error("lesson.yaml contains duplicate scene IDs");
}
if (JSON.stringify(timingSceneIds) !== JSON.stringify(manifestSceneIds)) {
  throw new Error([
    "Scene order does not match narration timing.",
    `Manifest: ${manifestSceneIds.join(", ")}`,
    `Timing: ${timingSceneIds.join(", ")}`,
  ].join("\n"));
}

for (const scene of lesson.scenes) {
  if (!scene.module) {
    throw new Error(`Scene is not implemented: ${scene.id}`);
  }
  const modulePath = requireFile(scene.module, `module for ${scene.id}`);
  const sceneModule = await import(pathToFileURL(modulePath));
  if (typeof sceneModule.renderScene !== "function" || !Number.isFinite(sceneModule.duration)) {
    throw new Error(`Scene module does not implement renderScene and duration: ${scene.module}`);
  }

  const beats = timing.beats.filter((beat) => beat.scene === scene.id);
  const first = beats[0];
  const last = beats.at(-1);
  const audioDuration = last.end + last.pauseAfter - first.start;
  if (Math.abs(sceneModule.duration - audioDuration) > 0.001) {
    throw new Error(
      `${scene.id} duration ${sceneModule.duration} does not match audio ${audioDuration}`,
    );
  }
  console.log(`${scene.id}: ${sceneModule.duration.toFixed(3)}s (${scene.module})`);
}

console.log(`Validated ${lesson.scenes.length} scenes for lesson ${lessonId}`);
const validationDirectory = join(REPOSITORY_ROOT, "build", "video", lessonId);
await mkdir(validationDirectory, { recursive: true });
await writeFile(
  join(validationDirectory, "validated-sources.json"),
  `${JSON.stringify({ silentScenes: [lesson.ident, lesson.outro].filter(Boolean) }, null, 2)}\n`,
);

async function findLessonDirectory(id) {
  const lessonsDirectory = join(REPOSITORY_ROOT, "lessons");
  const entries = await readdir(lessonsDirectory, { withFileTypes: true });
  const matches = entries.filter((entry) => entry.isDirectory() && entry.name.startsWith(`${id}-`));
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one lesson directory beginning with ${id}-`);
  }
  return join(lessonsDirectory, matches[0].name);
}

function requireFile(path, description) {
  if (typeof path !== "string" || path.length === 0) {
    throw new Error(`Missing ${description} path in lesson.yaml`);
  }
  const resolvedPath = resolve(REPOSITORY_ROOT, path);
  if (!resolvedPath.startsWith(`${REPOSITORY_ROOT}${sep}`) || !existsSync(resolvedPath)) {
    throw new Error(`Missing or unsafe ${description}: ${path}`);
  }
  return resolvedPath;
}
