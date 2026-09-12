import {
  authorizedYoutube,
  loadPublishingContext,
  readState,
} from "./youtube-common.mjs";

const lessonId = process.argv[2];
const execute = process.argv.includes("--execute");
const context = await loadPublishingContext(lessonId);
const publishing = context.publishing;
const oldVideoId = publishing.replaces_video_id;
if (!oldVideoId) throw new Error("publishing.youtube.replaces_video_id is required");

const state = await readState(lessonId, publishing.release);
const newVideoId = state.video_id ?? publishing.video_id;
if (!newVideoId) throw new Error("The replacement upload has no video ID");
if (newVideoId === oldVideoId) throw new Error("Replacement and old video IDs must differ");

const youtube = await authorizedYoutube();
const [newResponse, oldResponse, oldPlaylistResponse] = await Promise.all([
  youtube.videos.list({ part: ["status", "processingDetails"], id: [newVideoId] }),
  youtube.videos.list({ part: ["status"], id: [oldVideoId] }),
  youtube.playlistItems.list({
    part: ["snippet"],
    playlistId: publishing.playlist_id,
    videoId: oldVideoId,
  }),
]);

const replacement = newResponse.data.items?.[0];
const oldVideo = oldResponse.data.items?.[0];
if (!replacement) throw new Error(`Replacement video not found: ${newVideoId}`);
if (!oldVideo) throw new Error(`Old video not found: ${oldVideoId}`);

console.log(`Replacement: https://youtu.be/${newVideoId} (${replacement.status?.privacyStatus})`);
console.log(`Old video: https://youtu.be/${oldVideoId} (${oldVideo.status?.privacyStatus})`);
console.log(`Old playlist entries: ${oldPlaylistResponse.data.items?.length ?? 0}`);

if (oldVideo.status?.privacyStatus === "unlisted" && (oldPlaylistResponse.data.items?.length ?? 0) === 0) {
  console.log("The old video is already retired.");
  process.exit(0);
}

if (replacement.processingDetails?.processingStatus !== "succeeded") {
  throw new Error("Refusing to retire the old video before replacement processing succeeds");
}
if (replacement.status?.privacyStatus !== "public") {
  throw new Error("Refusing to retire the old video before the replacement is public");
}
if (!execute) {
  console.log("Dry run passed. Add --execute to unlist the old video and remove its playlist entry.");
  process.exit(0);
}

await youtube.videos.update({
  part: ["status"],
  requestBody: {
    id: oldVideoId,
    status: {
      privacyStatus: "unlisted",
      embeddable: oldVideo.status?.embeddable ?? true,
      license: oldVideo.status?.license ?? "youtube",
      publicStatsViewable: oldVideo.status?.publicStatsViewable ?? true,
      selfDeclaredMadeForKids: oldVideo.status?.selfDeclaredMadeForKids ?? false,
    },
  },
});
for (const item of oldPlaylistResponse.data.items ?? []) {
  await youtube.playlistItems.delete({ id: item.id });
}

console.log("Old video is unlisted and no longer appears in the course playlist.");
