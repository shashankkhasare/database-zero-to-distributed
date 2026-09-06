import { spawn } from "node:child_process";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { parse as parseYaml } from "yaml";

const REPOSITORY_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const lessonId = process.argv[2];
if (!lessonId) throw new Error("usage: npm run video:review -- <lesson-id>");
const lessonDirectory = await findLessonDirectory(lessonId);
const lesson = parseYaml(await readFile(join(lessonDirectory, "lesson.yaml"), "utf8"));
const timing = JSON.parse(await readFile(
  join(REPOSITORY_ROOT, "build", "video", lessonId, "timing.json"),
  "utf8",
));
const editorialTimes = lesson.review?.checkpoints ?? [];
if (!editorialTimes.every(Number.isFinite)) {
  throw new Error("lesson review.checkpoints must contain only numbers");
}
const reviewDirectory = join(REPOSITORY_ROOT, "build", "video", lessonId, "review");
await mkdir(reviewDirectory, { recursive: true });

const specifications = [lesson.ident, ...lesson.scenes, lesson.outro].filter(Boolean);
for (const scene of specifications) {
  const beats = timing.beats.filter((beat) => beat.scene === scene.id);
  const sceneStart = beats[0]?.start ?? 0;
  const duration = beats.length
    ? beats.at(-1).end + beats.at(-1).pauseAfter - sceneStart
    : scene.duration;
  const times = beats.length
    ? uniqueTimes([
        0.1,
        ...beats.flatMap((beat) => [beat.start - sceneStart + 0.1, beat.end - sceneStart - 0.1]),
        ...editorialTimes
          .filter((time) => time >= sceneStart && time <= sceneStart + duration)
          .map((time) => time - sceneStart),
        duration - 0.1,
      ], duration)
    : uniqueTimes([0.5, duration / 2, duration - 0.5], duration);

  await runNode("video/scripts/render-scenes.mjs", [
    lessonId,
    scene.id,
    "--times",
    times.join(","),
  ]);

  const frameDirectory = join(
    REPOSITORY_ROOT,
    "build",
    "video",
    lessonId,
    "frames",
    scene.id,
    "review",
  );
  const manifest = JSON.parse(await readFile(join(frameDirectory, "manifest.json"), "utf8"));
  await createContactSheet(scene.id, frameDirectory, manifest.frames);
}

async function createContactSheet(sceneId, frameDirectory, frames) {
  const cards = [];
  for (const frame of frames) {
    const image = await readFile(join(frameDirectory, frame.file));
    cards.push(`<figure><img src="data:image/png;base64,${image.toString("base64")}"><figcaption>${frame.time.toFixed(3)}s</figcaption></figure>`);
  }
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><style>
      *{box-sizing:border-box}body{margin:0;padding:28px;background:#0b1116;color:#eee5d3;font:18px Segoe UI,sans-serif}
      h1{margin:0 0 24px;font:36px Georgia,serif}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
      figure{margin:0;padding:10px;background:#17232a;border:1px solid #42575d;border-radius:10px}
      img{display:block;width:100%;aspect-ratio:16/9}figcaption{padding:9px 3px 1px;color:#edbd70}
    </style><h1>${sceneId}</h1><div class="grid">${cards.join("")}</div>`);
    await page.screenshot({
      path: join(reviewDirectory, `${sceneId}-contact-sheet.png`),
      fullPage: true,
      type: "png",
    });
  } finally {
    await browser.close();
  }
  console.log(`Contact sheet: ${join(reviewDirectory, `${sceneId}-contact-sheet.png`)}`);
}

function uniqueTimes(values, duration) {
  return [...new Set(values
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= duration)
    .map((value) => Number(value.toFixed(3))))].sort((left, right) => left - right);
}

async function findLessonDirectory(id) {
  const entries = await readdir(join(REPOSITORY_ROOT, "lessons"), { withFileTypes: true });
  const matches = entries.filter((entry) => entry.isDirectory() && entry.name.startsWith(`${id}-`));
  if (matches.length !== 1) throw new Error(`Expected exactly one lesson directory beginning with ${id}-`);
  return join(REPOSITORY_ROOT, "lessons", matches[0].name);
}

function runNode(script, arguments_) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [join(REPOSITORY_ROOT, script), ...arguments_], {
      cwd: REPOSITORY_ROOT,
      stdio: "inherit",
    });
    child.once("error", rejectRun);
    child.once("exit", (code) => code === 0
      ? resolveRun()
      : rejectRun(new Error(`${script} exited with code ${code}`)));
  });
}
