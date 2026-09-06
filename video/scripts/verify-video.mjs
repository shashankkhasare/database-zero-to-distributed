import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { parse as parseYaml } from "yaml";

const run = promisify(execFile);
const repositoryRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const lessonId = process.argv[2];
if (!/^\d{3}$/.test(lessonId ?? "")) {
  throw new Error("usage: npm run video:verify -- <lesson-id>");
}

const lessonDirectory = await findLessonDirectory(lessonId);
const lesson = parseYaml(await readFile(join(lessonDirectory, "lesson.yaml"), "utf8"));
const timing = JSON.parse(await readFile(join(repositoryRoot, "build", "video", lessonId, "timing.json"), "utf8"));
const output = resolve(repositoryRoot, lesson.video.output);
const { stdout } = await run("ffprobe", [
  "-v", "error", "-show_format", "-show_streams", "-of", "json", output,
], { cwd: repositoryRoot, maxBuffer: 10 * 1024 * 1024 });
const probe = JSON.parse(stdout);
const video = probe.streams.find((stream) => stream.codec_type === "video");
const audio = probe.streams.find((stream) => stream.codec_type === "audio");
const subtitle = probe.streams.find((stream) => stream.codec_type === "subtitle");
const expectedDuration = Number(lesson.ident?.duration ?? 0)
  + timing.duration
  + Number(lesson.outro?.duration ?? 0);
const actualFps = fraction(video?.avg_frame_rate);

assert(video?.codec_name === "h264", "final video codec must be H.264");
assert(video?.width === lesson.video.width && video?.height === lesson.video.height,
  `final resolution must be ${lesson.video.width}x${lesson.video.height}`);
assert(Math.abs(actualFps - lesson.video.fps) < 0.01, `final frame rate must be ${lesson.video.fps} FPS`);
assert(audio?.codec_name === "aac", "final audio codec must be AAC");
assert(subtitle?.codec_name === "mov_text", "final video must contain mov_text captions");
assert(Math.abs(Number(probe.format.duration) - expectedDuration) < 0.25,
  `final duration must be within 0.25 seconds of ${expectedDuration.toFixed(3)}`);

const { stdout: demoOutput } = await run("cargo", ["run", "--quiet"], { cwd: repositoryRoot });
const expectedOutput = await readFile(resolve(repositoryRoot, lesson.expected_output), "utf8");
assert(normalize(demoOutput) === normalize(expectedOutput), "lesson demo output does not match expected output");

console.log(`Verified ${lesson.video.output}`);
console.log(`${video.width}x${video.height}, ${actualFps.toFixed(3)} FPS, ${Number(probe.format.duration).toFixed(3)}s`);
console.log(`Streams: ${video.codec_name} video, ${audio.codec_name} audio, ${subtitle.codec_name} captions`);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fraction(value) {
  const [numerator, denominator] = String(value).split("/").map(Number);
  return numerator / denominator;
}

function normalize(value) {
  return value.replaceAll("\r\n", "\n").trim();
}

async function findLessonDirectory(id) {
  const lessons = join(repositoryRoot, "lessons");
  const entries = await readdir(lessons, { withFileTypes: true });
  const match = entries.find((entry) => entry.isDirectory() && entry.name.startsWith(`${id}-`));
  if (!match) throw new Error(`Unknown lesson: ${id}`);
  return join(lessons, match.name);
}
