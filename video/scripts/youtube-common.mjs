import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";
import { parse as parseYaml } from "yaml";

export const repositoryRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
export const youtubeScopes = ["https://www.googleapis.com/auth/youtube.force-ssl"];

export async function loadPublishingContext(lessonId) {
  if (!/^\d{3}$/.test(lessonId ?? "")) throw new Error("lesson ID must contain three digits");
  const lessons = join(repositoryRoot, "lessons");
  const directories = await readdir(lessons, { withFileTypes: true });
  const matches = directories.filter((entry) => entry.isDirectory() && entry.name.startsWith(`${lessonId}-`));
  if (matches.length !== 1) throw new Error(`Expected exactly one lesson beginning with ${lessonId}-`);

  const manifestPath = join(lessons, matches[0].name, "lesson.yaml");
  const lesson = parseYaml(await readFile(manifestPath, "utf8"));
  const publishing = lesson.publishing?.youtube;
  if (!publishing) throw new Error("lesson.yaml is missing publishing.youtube");

  const videoPath = repositoryFile(lesson.video?.output, "video output");
  const thumbnailPath = repositoryFile(lesson.thumbnail?.output, "thumbnail output");
  const captionPath = repositoryFile(publishing.captions?.file, "caption file");
  await Promise.all([access(videoPath), access(thumbnailPath), access(captionPath)]);
  validatePublishing(publishing);

  const {
    video_id: _publishedVideoId,
    final_privacy_status: _finalPrivacyStatus,
    ...uploadPublishing
  } = publishing;
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ lessonId, publishing: uploadPublishing, video: lesson.video, thumbnail: lesson.thumbnail }))
    .digest("hex");
  return { lesson, publishing, videoPath, thumbnailPath, captionPath, fingerprint };
}

export async function authorizedYoutube() {
  const token = JSON.parse(await readFile(tokenPath(), "utf8"));
  const auth = google.auth.fromJSON(token);
  auth.scopes = youtubeScopes;
  return google.youtube({ version: "v3", auth });
}

export function externalStatePath(lessonId, release) {
  const suffix = release ? `-${validatedRelease(release)}` : "";
  return join(configDirectory(), `lesson-${lessonId}${suffix}-publish.json`);
}

export function tokenPath() {
  return process.env.YOUTUBE_TOKEN_PATH
    ? resolve(process.env.YOUTUBE_TOKEN_PATH)
    : join(configDirectory(), "oauth-token.json");
}

export async function readState(lessonId, release) {
  try {
    return JSON.parse(await readFile(externalStatePath(lessonId, release), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

export async function writeState(lessonId, state, release) {
  const path = externalStatePath(lessonId, release);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
}

function configDirectory() {
  const base = process.env.LOCALAPPDATA
    ? resolve(process.env.LOCALAPPDATA)
    : join(homedir(), ".config");
  return join(base, "database-zero-to-distributed", "youtube");
}

function validatedRelease(value) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(value)) {
    throw new Error("publishing.youtube.release must use lowercase letters, digits, and hyphens");
  }
  return value;
}

function repositoryFile(relativePath, description) {
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    throw new Error(`Missing ${description} path`);
  }
  const path = resolve(repositoryRoot, relativePath);
  if (!path.startsWith(`${repositoryRoot}${sep}`)) throw new Error(`Unsafe ${description} path`);
  return path;
}

function validatePublishing(value) {
  if (!value.playlist_id) throw new Error("publishing.youtube.playlist_id is required");
  if (!value.title || value.title.length > 100) throw new Error("YouTube title must contain 1 through 100 characters");
  if (!value.description || value.description.length > 5000) throw new Error("YouTube description must contain 1 through 5000 characters");
  if (!Array.isArray(value.tags)) throw new Error("publishing.youtube.tags must be a list");
  if (value.privacy_status !== "private") {
    throw new Error("Automated first uploads must use privacy_status: private");
  }
  if (!["private", "unlisted", "public"].includes(value.final_privacy_status)) {
    throw new Error("publishing.youtube.final_privacy_status must be private, unlisted, or public");
  }
  if (!value.captions?.language || !value.captions?.name) {
    throw new Error("Caption language and name are required");
  }
}
