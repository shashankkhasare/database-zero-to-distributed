import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const lessonId = process.argv[2];
if (!lessonId) throw new Error("usage: npm run video:captions -- <lesson-id>");

const timingPath = path.join("build", "video", lessonId, "timing.json");
const timing = JSON.parse(await readFile(timingPath, "utf8"));
const lessonDirectory = (await readdir("lessons", { withFileTypes: true }))
  .find((entry) => entry.isDirectory() && entry.name.startsWith(`${lessonId}-`));
if (!lessonDirectory) throw new Error(`Could not find lesson ${lessonId}`);
const lesson = parseYaml(await readFile(path.join("lessons", lessonDirectory.name, "lesson.yaml"), "utf8"));
const timelineOffset = Number(lesson.ident?.duration ?? 0);
const cues = [];
const MAX_CHARACTERS = 68;

for (const beat of timing.beats) {
  const phrases = splitCaptionText(beat.text, MAX_CHARACTERS);
  const weights = phrases.map((phrase) => phrase.length);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = beat.start + timelineOffset;

  for (const [index, phrase] of phrases.entries()) {
    const beatEnd = beat.end + timelineOffset;
    const remaining = beatEnd - cursor;
    const duration = index === phrases.length - 1
      ? remaining
      : beat.duration * (weights[index] / totalWeight);
    cues.push({ start: cursor, end: cursor + duration, text: phrase });
    cursor += duration;
  }
}

validateCues(cues, timing.duration + timelineOffset);

const srt = cues
  .map(
    (cue, index) =>
      `${index + 1}\n${timestamp(cue.start)} --> ${timestamp(cue.end)}\n${cue.text}\n`,
  )
  .join("\n");
const outputDirectory = path.join("build", "video", lessonId, "captions");
await mkdir(outputDirectory, { recursive: true });
await writeFile(path.join(outputDirectory, "lesson.srt"), srt);
console.log(`Generated ${outputDirectory.replaceAll("\\", "/")}/lesson.srt`);

function splitCaptionText(text, maximum) {
  const clauses = text
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?;,])\s+/);
  const phrases = [];
  for (const clause of clauses) {
    if (clause.length <= maximum) {
      phrases.push(clause);
      continue;
    }
    const words = clause.split(" ");
    const partCount = Math.ceil(clause.length / maximum);
    const targetLength = Math.ceil(clause.length / partCount);
    const clausePhrases = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > targetLength && current) {
        clausePhrases.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) clausePhrases.push(current);
    rebalanceTrailingPhrase(clausePhrases, maximum);
    phrases.push(...clausePhrases);
  }
  mergeShortLeadingPhrases(phrases, maximum);
  return phrases;
}

function mergeShortLeadingPhrases(phrases, maximum) {
  for (let index = 0; index < phrases.length - 1;) {
    const combined = `${phrases[index]} ${phrases[index + 1]}`;
    if (phrases[index].length < 24 && combined.length <= maximum) {
      phrases.splice(index, 2, combined);
    } else {
      index += 1;
    }
  }
}

function rebalanceTrailingPhrase(phrases, maximum) {
  if (phrases.length < 2) return;
  const lastIndex = phrases.length - 1;
  while (phrases[lastIndex].length < 24) {
    const previousWords = phrases[lastIndex - 1].split(" ");
    if (previousWords.length < 2) break;
    const movedWord = previousWords.pop();
    const candidate = `${movedWord} ${phrases[lastIndex]}`;
    if (candidate.length > maximum) break;
    phrases[lastIndex - 1] = previousWords.join(" ");
    phrases[lastIndex] = candidate;
  }
}

function validateCues(values, lessonDuration) {
  values.forEach((cue, index) => {
    if (!cue.text || cue.text.includes("\n") || cue.text.length > MAX_CHARACTERS) {
      throw new Error(`Caption ${index + 1} does not fit the one-line contract`);
    }
    if (cue.end <= cue.start || cue.end > lessonDuration + 0.001) {
      throw new Error(`Caption ${index + 1} has an invalid time range`);
    }
    if (index > 0 && cue.start < values[index - 1].end - 0.001) {
      throw new Error(`Caption ${index + 1} overlaps the previous cue`);
    }
  });
}

function timestamp(seconds) {
  const milliseconds = Math.round(seconds * 1000);
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const secs = Math.floor((milliseconds % 60_000) / 1000);
  const millis = milliseconds % 1000;
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${String(millis).padStart(3, "0")}`;
}

function pad(value) {
  return String(value).padStart(2, "0");
}
