import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const lessonId = process.argv[2];
if (!lessonId) throw new Error("usage: npm run video:audio-review -- <lesson-id>");

const buildDirectory = path.join("build", "video", lessonId);
const timing = JSON.parse(
  await readFile(path.join(buildDirectory, "timing.json"), "utf8"),
);
const outputPath = path.join(buildDirectory, "audio-review.wav");
const inputs = timing.beats.flatMap((beat) => ["-i", beat.audio]);
const filters = timing.beats.map((beat, index) => {
  const length = beat.duration + beat.pauseAfter;
  return `[${index}:a]apad=pad_dur=${beat.pauseAfter},atrim=duration=${length}[a${index}]`;
});
const streams = timing.beats.map((_, index) => `[a${index}]`).join("");
const filterGraph = `${filters.join(";")};${streams}concat=n=${timing.beats.length}:v=0:a=1[out]`;

await run(
  "ffmpeg",
  [
    "-y",
    ...inputs,
    "-filter_complex",
    filterGraph,
    "-map",
    "[out]",
    "-c:a",
    "pcm_f32le",
    outputPath,
  ],
  { maxBuffer: 10 * 1024 * 1024 },
);

const { stdout } = await run("ffprobe", [
  "-v",
  "error",
  "-show_entries",
  "format=duration",
  "-of",
  "default=noprint_wrappers=1:nokey=1",
  outputPath,
]);
const actualDuration = Number.parseFloat(stdout.trim());
const difference = Math.abs(actualDuration - timing.duration);

if (difference > 0.01) {
  throw new Error(
    `joined duration ${actualDuration} differs from timing ${timing.duration}`,
  );
}

console.log(`Generated ${outputPath.replaceAll("\\", "/")}`);
console.log(`Duration: ${actualDuration.toFixed(3)} seconds`);
