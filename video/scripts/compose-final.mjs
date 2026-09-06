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
const timing = JSON.parse(await readFile(join(repositoryRoot, "build", "video", lessonId, "timing.json"), "utf8"));
const output = resolve(repositoryRoot, lesson.video.output);
await mkdir(dirname(output), { recursive: true });

const music = lesson.music;
const mediaInputs = ["-i", preview, "-i", captions];
const audioArguments = music ? musicMixArguments(music, timing) : ["-map", "0:a:0", "-c:a", "copy"];

await run("ffmpeg", [
  "-y", ...mediaInputs,
  ...(music ? ["-i", resolve(repositoryRoot, music.ident.file), "-i", resolve(repositoryRoot, music.outro.file)] : []),
  ...audioArguments,
  "-map", "0:v:0", "-map", "1:0",
  "-c:v", "copy", "-c:s", "mov_text",
  "-metadata:s:s:0", `language=${lesson.video.caption_language ?? "eng"}`,
  "-metadata:s:s:0", "title=English",
  "-disposition:s:0", "default",
  "-movflags", "+faststart",
  output,
]);
console.log(`Final video: ${output}`);

function musicMixArguments(settings, timing) {
  const identDuration = Number(lesson.ident.duration);
  const outroDuration = Number(lesson.outro.duration);
  const outroStart = identDuration + timing.duration;
  const ident = settings.ident;
  const outro = settings.outro;
  const values = [ident.gain_db, ident.fade_in, ident.fade_out, outro.gain_db, outro.fade_in, outro.fade_out];
  if (!values.every(Number.isFinite)) throw new Error("Music mix settings must be numbers");
  const filter = [
    `[0:a]aresample=${settings.sample_rate}[base]`,
    `[2:a]volume=${ident.gain_db}dB,afade=t=in:st=0:d=${ident.fade_in},afade=t=out:st=${identDuration - ident.fade_out}:d=${ident.fade_out},atrim=duration=${identDuration}[ident]`,
    `[3:a]volume=${outro.gain_db}dB,afade=t=in:st=0:d=${outro.fade_in},afade=t=out:st=${outroDuration - outro.fade_out}:d=${outro.fade_out},atrim=duration=${outroDuration},adelay=${Math.round(outroStart * 1000)}[outro]`,
    "[base][ident][outro]amix=inputs=3:duration=first:normalize=0[audio]",
  ].join(";");
  return ["-filter_complex", filter, "-map", "[audio]", "-c:a", "aac", "-b:a", "192k"];
}

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
