import { mkdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import { env } from "@huggingface/transformers";
import { KokoroTTS } from "kokoro-js";

const lessonId = process.argv[2];

if (!lessonId) {
  throw new Error("usage: npm run video:audio -- <lesson-id>");
}

const lessonDirectories = {
  "001": "001-smallest-query-engine",
};
const lessonDirectory = lessonDirectories[lessonId];

if (!lessonDirectory) {
  throw new Error(`unknown lesson id: ${lessonId}`);
}

const modelId = "onnx-community/Kokoro-82M-v1.0-ONNX";
const voice = "af_heart";
const speed = 1.0;
const cacheDirectory =
  process.env.KOKORO_CACHE_DIR ??
  path.join(homedir(), ".cache", "database-zero-to-distributed", "kokoro");
const inputPath = path.join("lessons", lessonDirectory, "narration-sample.txt");
const outputDirectory = path.join("build", "video", lessonId, "audio");
const outputPath = path.join(outputDirectory, "proof.wav");

env.cacheDir = cacheDirectory;

await mkdir(cacheDirectory, { recursive: true });
await mkdir(outputDirectory, { recursive: true });

const text = (await readFile(inputPath, "utf8")).trim();
const tts = await KokoroTTS.from_pretrained(modelId, {
  dtype: "q8",
  device: "cpu",
});
const audio = await tts.generate(text, { voice, speed });

audio.save(outputPath);

console.log(`Generated ${outputPath}`);
console.log(`Model cache: ${cacheDirectory}`);
