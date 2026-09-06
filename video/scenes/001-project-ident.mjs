import { clamp, createBackdrop, ease, element, fade, lerp, setStyle } from "../components/scene-utils.mjs";

export const duration = 5;

export function renderScene(root, requestedTime) {
  const time = clamp(requestedTime, 0, duration);
  root.replaceChildren();
  const scene = element("main", "project-ident scene");
  scene.append(createBackdrop());

  const mark = element("div", "project-ident__mark");
  mark.innerHTML = [
    '<svg viewBox="0 0 240 240" aria-hidden="true">',
    '<ellipse cx="120" cy="55" rx="72" ry="28" />',
    '<path d="M48 55v94c0 16 32 29 72 29s72-13 72-29V55" />',
    '<path d="M48 101c0 16 32 29 72 29s72-13 72-29" />',
    '<circle cx="48" cy="190" r="8" /><circle cx="120" cy="218" r="8" /><circle cx="192" cy="190" r="8" />',
    '<path d="M78 168 52 184M120 178v32M162 168l26 16" />',
    "</svg>",
  ].join("");
  const title = element("div", "project-ident__title", "Database: Zero to Distributed");
  const lesson = element("div", "project-ident__lesson", "Lesson 001  ·  The Smallest Query Engine");
  const reveal = ease(fade(time, 0.2, 1.5));
  const leave = fade(time, 3.9, 4.85);
  setStyle(mark, {
    opacity: String(reveal * (1 - leave)),
    transform: `translateY(${lerp(24, 0, reveal)}px) scale(${lerp(0.88, 1, reveal)})`,
  });
  setStyle(title, { opacity: String(fade(time, 1.0, 2.0) * (1 - leave)) });
  setStyle(lesson, { opacity: String(fade(time, 2.0, 3.0) * (1 - leave)) });
  scene.append(mark, title, lesson);
  root.append(scene);
}
