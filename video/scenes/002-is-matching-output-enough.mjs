import { renderLessonScene } from "../components/002-lesson-scenes.mjs";
export const duration = 158.2;
export const renderScene = (root, time, timing) => renderLessonScene(root, time, timing, "is-matching-output-enough", duration);
