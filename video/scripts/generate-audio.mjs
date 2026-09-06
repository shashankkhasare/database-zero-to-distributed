import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { env } from "@huggingface/transformers";
import { KokoroTTS } from "kokoro-js";
import { parse } from "yaml";

const run = promisify(execFile);
const lessonId = process.argv[2];

if (!lessonId) throw new Error("usage: npm run video:audio -- <lesson-id>");

const lessonRoot = "lessons";
const lessonDirectory = (await readdir(lessonRoot)).find((name) =>
  name.startsWith(`${lessonId}-`),
);
if (!lessonDirectory) throw new Error(`unknown lesson id: ${lessonId}`);

const lessonPath = path.join(lessonRoot, lessonDirectory);
const metadata = parse(await readFile(path.join(lessonPath, "lesson.yaml"), "utf8"));
const beatSource = JSON.parse(
  await readFile(path.join(lessonPath, "narration-beats.json"), "utf8"),
);
const pronunciation = JSON.parse(
  await readFile(path.join("video", "pronunciation.json"), "utf8"),
);
const narration = await readFile(metadata.narration, "utf8");
const paragraphs = parseNarration(narration);

validateBeats(beatSource.beats, paragraphs);

const beats = beatSource.beats.map((beat) => ({
  ...beat,
  text: paragraphs.get(beat.scene)?.[beat.paragraph - 1],
}));

for (const beat of beats) {
  if (!beat.text) {
    throw new Error(`missing narration for ${beat.id}`);
  }
}

const settings = metadata.audio;
if (!/^[0-9a-f]{40}$/.test(settings.revision ?? "")) {
  throw new Error("lesson audio.revision must be a full model commit hash");
}
const cacheDirectory =
  process.env.KOKORO_CACHE_DIR ??
  path.join(homedir(), ".cache", "database-zero-to-distributed", "kokoro");
const outputDirectory = path.join("build", "video", lessonId, "audio");
const statePath = path.join(outputDirectory, "state.json");

env.cacheDir = cacheDirectory;
env.remotePathTemplate = `{model}/resolve/${settings.revision}/`;
await mkdir(cacheDirectory, { recursive: true });
await mkdir(outputDirectory, { recursive: true });

let previousState = {};
try {
  previousState = JSON.parse(await readFile(statePath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

let tts;
const nextState = {};
const timing = [];
let cursor = 0;

for (const [index, beat] of beats.entries()) {
  const spokenText = applyPronunciation(beat.text, pronunciation);
  const signature = createHash("sha256")
    .update(JSON.stringify({ spokenText, settings }))
    .digest("hex");
  const outputPath = path.join(outputDirectory, `${beat.id}.wav`);

  if (previousState[beat.id]?.signature !== signature) {
    tts ??= await KokoroTTS.from_pretrained(settings.model, {
      dtype: settings.dtype,
      device: settings.device,
    });
    const audio = await tts.generate(spokenText, {
      voice: settings.voice,
      speed: settings.speed,
    });
    audio.save(outputPath);
    console.log(`[${index + 1}/${beats.length}] generated ${beat.id}`);
  } else {
    console.log(`[${index + 1}/${beats.length}] reused ${beat.id}`);
  }

  const duration = await probeDuration(outputPath);
  const start = cursor;
  const end = start + duration;
  timing.push({
    id: beat.id,
    scene: beat.scene,
    text: beat.text,
    spokenText,
    audio: outputPath.replaceAll("\\", "/"),
    start,
    end,
    duration,
    pauseAfter: beat.pauseAfter,
  });
  cursor = end + beat.pauseAfter;
  nextState[beat.id] = { signature };
}

await writeFile(statePath, `${JSON.stringify(nextState, null, 2)}\n`);
await writeFile(
  path.join("build", "video", lessonId, "timing.json"),
  `${JSON.stringify({ lessonId, duration: cursor, beats: timing }, null, 2)}\n`,
);

console.log(`Timing: build/video/${lessonId}/timing.json`);
console.log(`Total duration with pauses: ${cursor.toFixed(3)} seconds`);
console.log(`Model cache: ${cacheDirectory}`);

function parseNarration(markdown) {
  const sections = new Map();
  const parts = markdown.split(/^## /m).slice(1);
  for (const part of parts) {
    const newline = part.indexOf("\n");
    const title = part.slice(0, newline).trim();
    const scene = title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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

function validateBeats(beats, sections) {
  const ids = new Set();
  const references = new Set();

  for (const beat of beats) {
    if (ids.has(beat.id)) throw new Error(`duplicate beat id: ${beat.id}`);
    ids.add(beat.id);

    const reference = `${beat.scene}:${beat.paragraph}`;
    if (references.has(reference)) {
      throw new Error(`duplicate narration reference: ${reference}`);
    }
    references.add(reference);

    if (!sections.has(beat.scene)) {
      throw new Error(`unknown narration scene: ${beat.scene}`);
    }
  }

  for (const [scene, sceneParagraphs] of sections) {
    for (let paragraph = 1; paragraph <= sceneParagraphs.length; paragraph += 1) {
      const reference = `${scene}:${paragraph}`;
      if (!references.has(reference)) {
        throw new Error(`narration paragraph has no beat: ${reference}`);
      }
    }
  }

  if (references.size !== [...sections.values()].flat().length) {
    throw new Error("beat manifest contains an out-of-range paragraph reference");
  }
}

async function probeDuration(filePath) {
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  return Number.parseFloat(stdout.trim());
}
