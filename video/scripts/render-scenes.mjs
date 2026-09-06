import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { parse as parseYaml } from "yaml";

const REPOSITORY_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const DEFAULT_TIMES = [0, 7.5, 14.9, 18, 23, 29, 34, 38, 43, 48, 53, 57.4];
const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

const lessonId = process.argv[2];
const sceneName = process.argv[3];
if (!lessonId || !sceneName) {
  throw new Error("usage: npm run video:frames -- <lesson-id> <scene-id> [options]");
}
const lesson = await loadLesson(lessonId);
const sceneSpec = [lesson.ident, ...(lesson.scenes ?? []), lesson.outro].find((scene) => scene?.id === sceneName);
if (!sceneSpec) {
  throw new Error(`Scene is not listed in lesson ${lessonId}: ${sceneName}`);
}
if (!sceneSpec.module) {
  throw new Error(`Scene does not have an implemented module yet: ${sceneName}`);
}
const sceneModulePath = repositoryFile(sceneSpec.module);
if (!existsSync(sceneModulePath)) {
  throw new Error(`Scene module does not exist: ${sceneSpec.module}`);
}
const sceneModuleUrl = `/${relative(REPOSITORY_ROOT, sceneModulePath).split(sep).join("/")}`;
const requestedFps = numericArgument("--fps");
const rangeStart = secondsArgument("--from");
const rangeEnd = secondsArgument("--to");
const reviewTimes = parseTimes(argumentValue("--times"));

if ((rangeStart !== undefined || rangeEnd !== undefined) && !requestedFps) {
  throw new Error("--from and --to require --fps");
}
if (rangeStart !== undefined && rangeEnd !== undefined && rangeStart >= rangeEnd) {
  throw new Error("--from must be smaller than --to");
}
const outputDirectory = join(
  REPOSITORY_ROOT,
  "build",
  "video",
  lessonId,
  "frames",
  sceneName,
  requestedFps ? `frames-${requestedFps}fps` : "review",
);

await mkdir(outputDirectory, { recursive: true });

const server = createStaticServer(REPOSITORY_ROOT);
await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
const address = server.address();
if (!address || typeof address === "string") {
  throw new Error("Could not determine the scene server port");
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const url = new URL(`http://127.0.0.1:${address.port}/video/player.html`);
  url.searchParams.set("scene", sceneName);
  url.searchParams.set("module", sceneModuleUrl);
  url.searchParams.set("lesson", lessonId);
  await page.goto(url.href, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__SCENE_STATE__?.ready === true);
  const sceneDuration = await page.evaluate(() => window.__SCENE_STATE__.duration);
  const frames = requestedFps
    ? frameEntries(sceneDuration, requestedFps, rangeStart, rangeEnd)
    : reviewTimes.map((time, index) => ({ index, time }));
  if (frames.length === 0) {
    throw new Error("The requested frame range does not overlap the scene");
  }

  const manifest = [];
  for (const { index, time } of frames) {
    await page.evaluate((requestedTime) => window.renderScene(requestedTime), time);
    const filename = requestedFps
      ? `frame-${String(index).padStart(6, "0")}.png`
      : `${time.toFixed(3).padStart(6, "0").replace(".", "-")}.png`;
    const outputPath = join(outputDirectory, filename);
    const first = await page.screenshot({ type: "png" });
    if (!requestedFps) {
      const second = await page.screenshot({ type: "png" });
      if (!first.equals(second)) {
        throw new Error(`Scene output changed between captures at ${time} seconds`);
      }
    }
    await writeFile(outputPath, first);
    manifest.push({ time, file: filename });
    if (!requestedFps || index % requestedFps === 0 || index === frames.at(-1).index) {
      console.log(`Rendered ${sceneName} at ${time.toFixed(3)}s`);
    }
  }

  await writeFile(
    join(outputDirectory, rangeStart !== undefined || rangeEnd !== undefined
      ? "partial-manifest.json"
      : "manifest.json"),
    `${JSON.stringify({ lessonId, scene: sceneName, sceneModule: sceneSpec.module, width: 1920, height: 1080, fps: requestedFps, rangeStart, rangeEnd, frames: manifest }, null, 2)}\n`,
  );
  console.log(`Review frames: ${outputDirectory}`);
} finally {
  await browser.close();
  await new Promise((resolveClose, rejectClose) => {
    server.close((error) => error ? rejectClose(error) : resolveClose());
  });
}

function parseTimes(value) {
  if (!value) return DEFAULT_TIMES;
  const parsed = value.split(",").map((entry) => Number(entry));
  if (parsed.some((entry) => !Number.isFinite(entry) || entry < 0)) {
    throw new Error("--times must be a comma-separated list of non-negative seconds");
  }
  return parsed;
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function numericArgument(name) {
  const value = argumentValue(name);
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0 || number > 60) {
    throw new Error(`${name} must be an integer from 1 through 60`);
  }
  return number;
}

function secondsArgument(name) {
  const value = argumentValue(name);
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${name} must be a non-negative number of seconds`);
  }
  return number;
}

function frameEntries(duration, fps, from = 0, to = duration) {
  const frameCount = Math.ceil(duration * fps);
  const firstFrame = Math.max(0, Math.floor(from * fps));
  const lastFrame = Math.min(frameCount, Math.ceil(to * fps));
  return Array.from(
    { length: Math.max(0, lastFrame - firstFrame) },
    (_, offset) => {
      const index = firstFrame + offset;
      return { index, time: index / fps };
    },
  );
}

async function loadLesson(id) {
  const lessonsDirectory = join(REPOSITORY_ROOT, "lessons");
  const directories = await readdir(lessonsDirectory, { withFileTypes: true });
  const matches = directories.filter((entry) => entry.isDirectory() && entry.name.startsWith(`${id}-`));
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one lesson directory beginning with ${id}-`);
  }
  const manifestPath = join(lessonsDirectory, matches[0].name, "lesson.yaml");
  return parseYaml(await readFile(manifestPath, "utf8"));
}

function repositoryFile(path) {
  const resolvedPath = resolve(REPOSITORY_ROOT, path);
  if (resolvedPath !== REPOSITORY_ROOT && !resolvedPath.startsWith(`${REPOSITORY_ROOT}${sep}`)) {
    throw new Error(`Asset path leaves the repository: ${path}`);
  }
  return resolvedPath;
}

function createStaticServer(root) {
  return createServer(async (request, response) => {
    try {
      const requestedPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      const relativePath = requestedPath === "/" ? "video/player.html" : requestedPath.slice(1);
      const normalizedPath = normalize(relativePath);
      const filePath = resolve(root, normalizedPath);
      if (!filePath.startsWith(`${root}\\`) || !existsSync(filePath)) {
        response.writeHead(404).end("Not found");
        return;
      }
      response.writeHead(200, {
        "Content-Type": MIME_TYPES.get(extname(filePath)) ?? "application/octet-stream",
        "Cache-Control": "no-store",
      });
      createReadStream(filePath).pipe(response);
    } catch (error) {
      response.writeHead(500).end(error.message);
    }
  });
}
