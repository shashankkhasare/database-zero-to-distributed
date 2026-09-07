import {
  authorizedYoutube,
  loadPublishingContext,
  readState,
} from "./youtube-common.mjs";

const lessonId = process.argv[2];
const context = await loadPublishingContext(lessonId);
const state = await readState(lessonId);
const videoId = state.video_id ?? context.publishing.video_id;
if (!videoId) throw new Error("No uploaded video ID exists in external state or lesson.yaml");

const youtube = await authorizedYoutube();
const [videoResponse, captionsResponse, playlistResponse, playlistDetailsResponse] = await Promise.all([
  youtube.videos.list({ part: ["snippet", "status", "processingDetails"], id: [videoId] }),
  youtube.captions.list({ part: ["snippet"], videoId }),
  youtube.playlistItems.list({
    part: ["snippet"],
    playlistId: context.publishing.playlist_id,
    videoId,
  }),
  youtube.playlists.list({
    part: ["status"],
    id: [context.publishing.playlist_id],
  }),
]);

const video = videoResponse.data.items?.[0];
if (!video) throw new Error(`YouTube video not found: ${videoId}`);
const caption = captionsResponse.data.items?.find((item) =>
  item.snippet?.language === context.publishing.captions.language
  && item.snippet?.name === context.publishing.captions.name);
const playlistItem = playlistResponse.data.items?.[0];
const playlist = playlistDetailsResponse.data.items?.[0];

console.log(`Video: https://youtu.be/${videoId}`);
console.log(`Visibility: ${video.status?.privacyStatus}`);
console.log(`Processing: ${video.processingDetails?.processingStatus ?? "unknown"}`);
console.log(`Caption: ${caption?.snippet?.status ?? "missing"}`);
console.log(`Playlist placement: ${playlistItem ? "present" : "missing"}`);
console.log(`Playlist visibility: ${playlist?.status?.privacyStatus ?? "missing"}`);

if (video.processingDetails?.processingStatus !== "succeeded") process.exitCode = 2;
if (caption?.snippet?.status !== "serving") process.exitCode = 2;
if (!playlistItem) process.exitCode = 2;
if (video.status?.privacyStatus !== context.publishing.final_privacy_status) process.exitCode = 2;
if (playlist?.status?.privacyStatus !== context.publishing.final_privacy_status) process.exitCode = 2;
