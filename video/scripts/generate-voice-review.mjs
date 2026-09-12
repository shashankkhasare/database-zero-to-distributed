import { mkdir, readFile, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import { env } from "@huggingface/transformers";
import { KokoroTTS } from "kokoro-js";
import { parse } from "yaml";

const lessonId = process.argv[2];

if (!lessonId) throw new Error("usage: npm run video:voice-review -- <lesson-id>");

const lessonDirectory = (await readdir("lessons")).find((name) =>
  name.startsWith(`${lessonId}-`),
);
if (!lessonDirectory) throw new Error(`unknown lesson id: ${lessonId}`);

const lessonPath = path.join("lessons", lessonDirectory);
const metadata = parse(await readFile(path.join(lessonPath, "lesson.yaml"), "utf8"));
const narration = await readFile(metadata.narration, "utf8");
const pronunciation = JSON.parse(
  await readFile(path.join("video", "pronunciation.json"), "utf8"),
);
const review = metadata.audio.voice_review;

if (!review?.scene || !Array.isArray(review.paragraphs)) {
  throw new Error("lesson audio.voice_review must declare a scene and paragraph range");
}
if (!Array.isArray(review.candidates) || review.candidates.length < 2) {
  throw new Error("lesson audio.voice_review must declare at least two candidates");
}

const sections = parseNarration(narration);
const paragraphs = sections.get(review.scene);
if (!paragraphs) throw new Error(`unknown review scene: ${review.scene}`);

const [first, last] = review.paragraphs;
if (!Number.isInteger(first) || !Number.isInteger(last) || first < 1 || last < first) {
  throw new Error("voice review paragraphs must be a valid one-based range");
}

const writtenText = paragraphs.slice(first - 1, last).join(" ");
if (!writtenText) throw new Error("voice review paragraph range is empty");
const spokenText = prepareSpokenText(writtenText, pronunciation);

const cacheDirectory =
  process.env.KOKORO_CACHE_DIR ??
  path.join(homedir(), ".cache", "database-zero-to-distributed", "kokoro");
env.cacheDir = cacheDirectory;
env.remotePathTemplate = `{model}/resolve/${metadata.audio.revision}/`;

const tts = await KokoroTTS.from_pretrained(metadata.audio.model, {
  dtype: metadata.audio.dtype,
  device: metadata.audio.device,
});
const outputDirectory = path.join("build", "video", lessonId, "voice-review");
await mkdir(outputDirectory, { recursive: true });

for (const candidate of review.candidates) {
  const audio = await tts.generate(spokenText, {
    voice: candidate.voice,
    speed: candidate.speed,
  });
  const output = path.join(outputDirectory, `${candidate.name}.wav`);
  await audio.save(output);
  await waitForCompleteFile(output);
  console.log(`${candidate.name}: ${candidate.voice} at ${candidate.speed} -> ${output}`);
}

console.log(`Excerpt: ${review.scene} paragraphs ${first}-${last}`);

function parseNarration(markdown) {
  const sections = new Map();
  for (const part of markdown.split(/^## /m).slice(1)) {
    const newline = part.indexOf("\n");
    const title = part.slice(0, newline).trim();
    const scene = title
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const body = part.slice(newline + 1).trim();
    sections.set(
      scene,
      body.split(/\r?\n\s*\r?\n/).map((paragraph) =>
        paragraph.replaceAll(/\r?\n/g, " ").trim(),
      ),
    );
  }
  return sections;
}

function applyPronunciation(text, replacements) {
  return Object.entries(replacements).reduce(
    (result, [written, spoken]) => result.replaceAll(written, spoken),
    text,
  );
}

function prepareSpokenText(text, replacements) {
  return applyPronunciation(text, replacements).replaceAll(/[*_`]/g, "");
}

async function waitForCompleteFile(filePath) {
  let previousSize = -1;

  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      const information = await stat(filePath);
      if (information.size > 44 && information.size === previousSize) return;
      previousSize = information.size;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(`audio file was not written completely: ${filePath}`);
}
