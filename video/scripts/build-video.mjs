import { readFile, readdir, rm } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const repositoryRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const lessonId = process.argv[2];
const clean = process.argv.includes("--clean");
if (!/^\d{3}$/.test(lessonId ?? "")) {
  throw new Error("usage: npm run video:render -- <lesson-id> [--clean]");
}

const lessonDirectory = await findLessonDirectory(lessonId);
const lesson = parseYaml(await readFile(join(lessonDirectory, "lesson.yaml"), "utf8"));
const fps = Number(lesson.video?.fps);
if (!Number.isInteger(fps) || fps < 1 || fps > 60) {
  throw new Error("lesson video.fps must be an integer from 1 through 60");
}

if (clean) {
  await removeInsideRepository(join(repositoryRoot, "build", "video", lessonId));
  await removeInsideRepository(resolve(repositoryRoot, lesson.video.output));
  console.log(`Removed generated artifacts for lesson ${lessonId}`);
}

await runScript("generate-audio.mjs", [lessonId]);
await runScript("compose-audio.mjs", [lessonId]);
await runScript("generate-captions.mjs", [lessonId]);
await runScript("render-preview.mjs", [lessonId, String(fps)]);
await runScript("compose-final.mjs", [lessonId]);
await runScript("verify-video.mjs", [lessonId]);

async function runScript(name, arguments_) {
  const script = join(repositoryRoot, "video", "scripts", name);
  const child = await import("node:child_process");
  await new Promise((resolveRun, rejectRun) => {
    const childProcess = child.spawn(process.execPath, [script, ...arguments_], {
      cwd: repositoryRoot,
      env: process.env,
      stdio: "inherit",
    });
    childProcess.once("error", rejectRun);
    childProcess.once("exit", (code) => code === 0
      ? resolveRun()
      : rejectRun(new Error(`${name} exited with code ${code}`)));
  });
}

async function removeInsideRepository(target) {
  const resolved = resolve(target);
  if (!resolved.startsWith(`${repositoryRoot}${sep}`)) {
    throw new Error(`Refusing to remove path outside repository: ${resolved}`);
  }
  await rm(resolved, { recursive: true, force: true });
}

async function findLessonDirectory(id) {
  const lessons = join(repositoryRoot, "lessons");
  const entries = await readdir(lessons, { withFileTypes: true });
  const matches = entries.filter((entry) => entry.isDirectory() && entry.name.startsWith(`${id}-`));
  if (matches.length !== 1) throw new Error(`Expected exactly one lesson beginning with ${id}-`);
  return join(lessons, matches[0].name);
}
