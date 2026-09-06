import { clamp, createBackdrop, ease, element, fade, lerp, setStyle } from "../components/scene-utils.mjs";

export const duration = 7;

export function renderScene(root, requestedTime) {
  const time = clamp(requestedTime, 0, duration);
  root.replaceChildren();
  const scene = element("main", "lesson-outro scene");
  scene.append(createBackdrop());
  const eyebrow = element("div", "lesson-outro__eyebrow", "NEXT LESSON");
  const title = element("div", "lesson-outro__title", "Relational Algebra Without the Math");
  const question = element("div", "lesson-outro__question", "What makes two query plans mean the same thing?");
  const footer = element("div", "lesson-outro__footer", "Database: Zero to Distributed");
  const reveal = ease(fade(time, 0.3, 1.5));
  const leave = fade(time, 6.2, 7);
  setStyle(scene, { opacity: String(1 - leave) });
  setStyle(title, { opacity: String(reveal), transform: `translateY(${lerp(20, 0, reveal)}px)` });
  setStyle(question, { opacity: String(fade(time, 1.5, 2.7)) });
  setStyle(footer, { opacity: String(fade(time, 2.6, 3.8)) });
  scene.append(eyebrow, title, question, footer);
  root.append(scene);
}
