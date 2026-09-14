import { clamp, createBackdrop, ease, element, fade, lerp, setStyle } from "../components/scene-utils.mjs";
export const duration = 5;
export function renderScene(root, requestedTime) {
  const time = clamp(requestedTime, 0, duration); root.replaceChildren();
  const scene = element("main", "project-ident scene"); scene.append(createBackdrop());
  const reveal = ease(fade(time, .5, 1.8)); const leave = ease(fade(time, 4.15, 4.9));
  const mark = element("div", "project-ident__mark", "σ  π");
  setStyle(mark, { display: "grid", placeItems: "center", fontFamily: "Georgia, serif", fontSize: "92px", opacity: String(reveal * (1 - leave)), transform: `scale(${lerp(.8, 1, reveal)})` });
  const title = element("div", "project-ident__title", "Database: Zero to Distributed");
  const lesson = element("div", "project-ident__lesson", "LESSON 002  ·  RELATIONAL ALGEBRA WITHOUT THE MATH");
  setStyle(title, { opacity: String(fade(time, 1.5, 2.5) * (1 - leave)) }); setStyle(lesson, { opacity: String(fade(time, 2.2, 3.2) * (1 - leave)) });
  scene.append(mark, title, lesson); root.append(scene);
}
