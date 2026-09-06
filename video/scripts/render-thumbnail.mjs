import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { parse as parseYaml } from "yaml";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const lessonId = process.argv[2];
if (!/^\d{3}$/.test(lessonId ?? "")) throw new Error("usage: npm run video:thumbnail -- <lesson-id>");

const lessonDirectory = await findLessonDirectory(lessonId);
const lesson = parseYaml(await readFile(join(lessonDirectory, "lesson.yaml"), "utf8"));
const spec = lesson.thumbnail;
if (!spec?.module || !spec?.output || !Number.isInteger(spec.width) || !Number.isInteger(spec.height)) {
  throw new Error("lesson.thumbnail must declare module, output, width, and height");
}
const modulePath = repositoryFile(spec.module);
const output = repositoryFile(spec.output);
const intermediate = join(root, "build", "video", lessonId, "thumbnail-1920x1080.png");
await mkdir(join(root, "build", "video", lessonId), { recursive: true });
await mkdir(resolve(output, ".."), { recursive: true });

const server = createStaticServer(root);
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const address = server.address();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const url = new URL(`http://127.0.0.1:${address.port}/video/player.html`);
  url.searchParams.set("scene", "thumbnail");
  url.searchParams.set("module", `/${relative(root, modulePath).split(sep).join("/")}`);
  await page.goto(url.href, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__SCENE_STATE__?.ready === true);
  const first = await page.screenshot({ type: "png" });
  const second = await page.screenshot({ type: "png" });
  if (!first.equals(second)) throw new Error("Thumbnail changed between identical captures");
  await writeFile(intermediate, first);
} finally {
  await browser.close();
  await new Promise((done, reject) => server.close((error) => error ? reject(error) : done()));
}

await run("ffmpeg", ["-y", "-i", intermediate, "-vf", `scale=${spec.width}:${spec.height}:flags=lanczos`, "-frames:v", "1", output]);
console.log(`Thumbnail: ${output}`);

function repositoryFile(path) {
  const resolved = resolve(root, path);
  if (!resolved.startsWith(`${root}${sep}`)) throw new Error(`Path leaves repository: ${path}`);
  return resolved;
}

async function findLessonDirectory(id) {
  const entries = await readdir(join(root, "lessons"), { withFileTypes: true });
  const matches = entries.filter((entry) => entry.isDirectory() && entry.name.startsWith(`${id}-`));
  if (matches.length !== 1) throw new Error(`Expected exactly one lesson beginning with ${id}-`);
  return join(root, "lessons", matches[0].name);
}

function run(command, args) {
  return new Promise((done, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? done() : reject(new Error(`${command} exited with ${code}`)));
  });
}

function createStaticServer(directory) {
  return createServer((request, response) => {
    const requested = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const path = resolve(directory, normalize(requested === "/" ? "video/player.html" : requested.slice(1)));
    if (!path.startsWith(`${directory}${sep}`) || !existsSync(path)) return response.writeHead(404).end("Not found");
    const types = { ".css": "text/css", ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript" };
    response.writeHead(200, { "Content-Type": types[extname(path)] ?? "application/octet-stream", "Cache-Control": "no-store" });
    createReadStream(path).pipe(response);
  });
}
