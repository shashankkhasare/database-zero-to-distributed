const params = new URLSearchParams(window.location.search);
const sceneName = params.get("scene");
const modulePath = params.get("module");
const lessonId = params.get("lesson");
const initialTime = Number(params.get("time") ?? 0);
const root = document.querySelector("#scene-root");

if (!sceneName) {
  throw new Error("The scene name is required");
}
if (!modulePath?.startsWith("/video/scenes/") || !modulePath.endsWith(".mjs")) {
  throw new Error("The scene module must be under video/scenes");
}

const scene = await import(modulePath);
if (!Number.isFinite(scene.duration) || typeof scene.renderScene !== "function") {
  throw new Error(`Scene module does not implement the rendering contract: ${modulePath}`);
}

let timing;
if (lessonId) {
  const response = await fetch(`/build/video/${lessonId}/timing.json`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load timing for lesson ${lessonId}`);
  timing = await response.json();
}

window.renderScene = (time) => {
  const numericTime = Number(time);
  scene.renderScene(root, numericTime, timing);
  window.__SCENE_STATE__ = {
    name: sceneName,
    time: numericTime,
    duration: scene.duration,
    ready: true,
  };
  return window.__SCENE_STATE__;
};

window.renderScene(initialTime);
