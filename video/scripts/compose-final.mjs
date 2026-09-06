import { spawn } from "node:child_process";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const repositoryRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const lessonId = process.argv[2];
if (!/^\d{3}$/.test(lessonId ?? "")) {
  throw new Error("usage: npm run video:compose -- <lesson-id>");
}

const lessonDirectory = await findLessonDirectory(lessonId);
const lesson = parseYaml(await readFile(join(lessonDirectory, "lesson.yaml"), "utf8"));
const preview = join(repositoryRoot, "build", "video", lessonId, "preview.mp4");
const captions = join(repositoryRoot, "build", "video", lessonId, "captions", "lesson.srt");
const output = resolve(repositoryRoot, lesson.video.output);
await mkdir(dirname(output), { recursive: true });

await run("ffmpeg", [
  "-y", "-i", preview, "-i", captions,
  "-map", "0:v:0", "-map", "0:a:0", "-map", "1:0",
  "-c:v", "copy", "-c:a", "copy", "-c:s", "mov_text",
  "-metadata:s:s:0", `language=${lesson.video.caption_language ?? "eng"}`,
  "-metadata:s:s:0", "title=English",
  "-disposition:s:0", "default",
  "-movflags", "+faststart",
  output,
]);
console.log(`Final video: ${output}`);

function run(command, arguments_) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, arguments_, { cwd: repositoryRoot, stdio: "inherit" });
    child.once("error", rejectRun);
    child.once("exit", (code) => code === 0
      ? resolveRun()
      : rejectRun(new Error(`${command} exited with code ${code}`)));
  });
}

async function findLessonDirectory(id) {
  const lessons = join(repositoryRoot, "lessons");
  const entries = await readdir(lessons, { withFileTypes: true });
  const match = entries.find((entry) => entry.isDirectory() && entry.name.startsWith(`${id}-`));
  if (!match) throw new Error(`Unknown lesson: ${id}`);
  return join(lessons, match.name);
}
