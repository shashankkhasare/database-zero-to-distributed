import { renderLessonScene } from "../components/002-lesson-scenes.mjs";

export const duration = 97.985;
export const renderScene = (root, time, timing) =>
  renderLessonScene(root, time, timing, "three-laws-we-can-use", duration);
