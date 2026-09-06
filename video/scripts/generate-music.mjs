import { readFile, readdir } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";

const repositoryRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const lessonId = process.argv[2];
if (!lessonId) throw new Error("usage: npm run video:music -- <lesson-id>");

const lessons = await readdir(join(repositoryRoot, "lessons"), { withFileTypes: true });
const directory = lessons.find((entry) => entry.isDirectory() && entry.name.startsWith(`${lessonId}-`));
if (!directory) throw new Error(`Unknown lesson: ${lessonId}`);
const lesson = parseYaml(await readFile(join(repositoryRoot, "lessons", directory.name, "lesson.yaml"), "utf8"));
if (!lesson.music?.module) throw new Error(`Lesson ${lessonId} does not declare music.module`);
const modulePath = repositoryFile(lesson.music.module);
const music = await import(pathToFileURL(modulePath));
if (typeof music.generateMusic !== "function") {
  throw new Error(`${lesson.music.module} does not export generateMusic`);
}
await music.generateMusic({ settings: lesson.music, repositoryFile });

function repositoryFile(relativePath) {
  const output = resolve(repositoryRoot, relativePath);
  if (!output.startsWith(`${repositoryRoot}${sep}`)) throw new Error(`Unsafe path: ${relativePath}`);
  return output;
}
