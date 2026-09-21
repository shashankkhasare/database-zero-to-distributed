import { renderLessonScene } from "../components/002-lesson-scenes.mjs";
export const duration = 140.875;
export const renderScene = (root, time, timing) => renderLessonScene(root, time, timing, "moving-projection", duration);
