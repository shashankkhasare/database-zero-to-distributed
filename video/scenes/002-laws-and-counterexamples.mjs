import { renderLessonScene } from "../components/002-lesson-scenes.mjs";

export const duration = 66.78;
export const renderScene = (root, time, timing) =>
  renderLessonScene(root, time, timing, "laws-and-counterexamples", duration);
