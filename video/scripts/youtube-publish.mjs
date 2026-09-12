import { createReadStream } from "node:fs";
import {
  authorizedYoutube,
  loadPublishingContext,
  readState,
  writeState,
} from "./youtube-common.mjs";

const lessonId = process.argv[2];
const execute = process.argv.includes("--execute");
const context = await loadPublishingContext(lessonId);
const { publishing } = context;

console.log(`Lesson ${lessonId}: ${publishing.title}`);
console.log(`Video: ${context.lesson.video.output}`);
console.log(`Thumbnail: ${context.lesson.thumbnail.output}`);
console.log(`Captions: ${publishing.captions.file} (${publishing.captions.language})`);
console.log(`Playlist: ${publishing.playlist_id}`);
console.log(`Initial visibility: ${publishing.privacy_status}`);
if (!execute) {
  console.log("Dry run passed. Add --execute to upload and modify YouTube.");
  process.exit(0);
}

const youtube = await authorizedYoutube();
const state = await readState(lessonId, publishing.release);
if (state.fingerprint && state.fingerprint !== context.fingerprint) {
  throw new Error("Publishing metadata changed after upload state was created; inspect external state before retrying");
}
state.fingerprint = context.fingerprint;
state.video_id ??= publishing.video_id;

if (!state.video_id && publishing.replaces_video_id) {
  console.log(`Creating a replacement for https://youtu.be/${publishing.replaces_video_id}`);
}

if (!state.video_id) {
  console.log("Uploading private video...");
  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    notifySubscribers: publishing.notify_subscribers,
    requestBody: {
      snippet: {
        title: publishing.title,
        description: publishing.description,
        tags: publishing.tags,
        categoryId: publishing.category_id,
        defaultLanguage: publishing.default_language,
      },
      status: {
        privacyStatus: publishing.privacy_status,
        embeddable: publishing.embeddable,
        selfDeclaredMadeForKids: publishing.made_for_kids,
        license: "youtube",
      },
    },
    media: { body: createReadStream(context.videoPath) },
  });
  state.video_id = response.data.id;
  await writeState(lessonId, state, publishing.release);
  console.log(`Uploaded video ${state.video_id}`);
} else {
  console.log(`Reusing uploaded video ${state.video_id}`);
}

if (!state.thumbnail_set) {
  try {
    await youtube.thumbnails.set({
      videoId: state.video_id,
      media: { mimeType: "image/png", body: createReadStream(context.thumbnailPath) },
    });
    state.thumbnail_set = true;
    delete state.thumbnail_error;
    console.log("Thumbnail uploaded");
  } catch (error) {
    state.thumbnail_error = apiErrorMessage(error);
    console.warn(`Thumbnail pending: ${state.thumbnail_error}`);
    console.warn("Enable custom thumbnails for the channel, then rerun this command.");
  }
  await writeState(lessonId, state, publishing.release);
}

if (!state.caption_id) {
  const existing = await youtube.captions.list({ part: ["snippet"], videoId: state.video_id });
  state.caption_id = existing.data.items?.find((item) =>
    item.snippet?.language === publishing.captions.language
    && item.snippet?.name === publishing.captions.name)?.id;
}
if (!state.caption_id) {
  const response = await youtube.captions.insert({
    part: ["snippet"],
    requestBody: {
      snippet: {
        videoId: state.video_id,
        language: publishing.captions.language,
        name: publishing.captions.name,
        isDraft: false,
      },
    },
    media: { mimeType: "application/octet-stream", body: createReadStream(context.captionPath) },
  });
  state.caption_id = response.data.id;
  await writeState(lessonId, state, publishing.release);
  console.log(`Caption uploaded: ${state.caption_id}`);
}

if (!state.playlist_item_id) {
  const existing = await youtube.playlistItems.list({
    part: ["snippet"],
    playlistId: publishing.playlist_id,
    videoId: state.video_id,
  });
  state.playlist_item_id = existing.data.items?.[0]?.id;
}
if (!state.playlist_item_id) {
  const response = await youtube.playlistItems.insert({
    part: ["snippet"],
    requestBody: {
      snippet: {
        playlistId: publishing.playlist_id,
        resourceId: { kind: "youtube#video", videoId: state.video_id },
      },
    },
  });
  state.playlist_item_id = response.data.id;
  await writeState(lessonId, state, publishing.release);
  console.log(`Added to playlist: ${state.playlist_item_id}`);
}

console.log(`Publishing operations complete: https://youtu.be/${state.video_id}`);
if (!state.thumbnail_set) console.log("The custom thumbnail is still pending.");
console.log("Run youtube:publish-verify after YouTube finishes processing the upload.");

function apiErrorMessage(error) {
  return error?.response?.data?.error?.message
    ?? error?.errors?.[0]?.message
    ?? error?.message
    ?? "Unknown YouTube API error";
}
