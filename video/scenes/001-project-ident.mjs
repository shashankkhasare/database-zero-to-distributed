import { clamp, createBackdrop, ease, element, fade, lerp, setStyle } from "../components/scene-utils.mjs";

export const duration = 5;

export function renderScene(root, requestedTime) {
  const time = clamp(requestedTime, 0, duration);
  root.replaceChildren();
  const scene = element("main", "project-ident scene");
  scene.append(createBackdrop());

  const assembly = element("div");
  setStyle(assembly, { position: "relative", width: "360px", height: "290px", marginTop: "-70px" });
  const mark = element("div", "project-ident__mark");
  mark.innerHTML = markSvg();
  setStyle(mark, { position: "absolute", left: "55px", top: "8px", width: "250px", height: "250px", margin: "0" });

  const assemble = ease(fade(time, 0.72, 1.78));
  const settle = ease(fade(time, 1.75, 2.2));
  const leave = ease(fade(time, 4.15, 4.9));
  setStyle(mark, {
    opacity: String(fade(time, 0.52, 1.0) * (1 - leave)),
    transform: `scale(${lerp(0.82, 1, assemble)}) translateY(${lerp(12, 0, settle)}px)`,
  });

  const dots = [
    { x: -260, y: 90, delay: 0.12 },
    { x: 0, y: -180, delay: 0.32 },
    { x: 260, y: 90, delay: 0.52 },
  ];
  for (const [index, dot] of dots.entries()) {
    const progress = ease(fade(time, dot.delay, dot.delay + 1.05));
    const node = element("div");
    setStyle(node, {
      position: "absolute",
      left: `${171 + lerp(dot.x, 0, progress)}px`,
      top: `${42 + lerp(dot.y, 0, progress)}px`,
      width: "18px", height: "18px", borderRadius: "50%",
      background: index === 1 ? "#e9b35c" : "#74c8bd",
      boxShadow: "0 0 24px rgba(116, 200, 189, 0.45)",
      opacity: String(fade(time, dot.delay, dot.delay + 0.22) * (1 - fade(time, 1.4, 1.85))),
      transform: `scale(${lerp(0.7, 1.05, progress)})`,
    });
    assembly.append(node);
  }

  const title = element("div", "project-ident__title", "Database: Zero to Distributed");
  const lesson = element("div", "project-ident__lesson", "LESSON 001  ·  THE SMALLEST QUERY ENGINE");
  const titleReveal = ease(fade(time, 1.82, 2.62));
  const lessonReveal = ease(fade(time, 2.45, 3.18));
  setStyle(title, { marginTop: "-35px", opacity: String(titleReveal * (1 - leave)), transform: `translateY(${lerp(18, 0, titleReveal)}px)` });
  setStyle(lesson, { opacity: String(lessonReveal * (1 - leave)), transform: `translateY(${lerp(10, 0, lessonReveal)}px)` });
  scene.append(assembly, title, lesson);
  root.append(scene);
}

function markSvg() {
  return [
    '<svg viewBox="0 0 240 240" aria-hidden="true" style="width:100%;height:100%;fill:none;stroke:#e9b35c;stroke-width:6;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 24px rgba(233,179,92,.22))">',
    '<ellipse cx="120" cy="55" rx="72" ry="28" />',
    '<path d="M48 55v94c0 16 32 29 72 29s72-13 72-29V55" />',
    '<path d="M48 101c0 16 32 29 72 29s72-13 72-29" />',
    '<circle cx="48" cy="190" r="8" /><circle cx="120" cy="218" r="8" /><circle cx="192" cy="190" r="8" />',
    '<path d="M78 168 52 184M120 178v32M162 168l26 16" />',
    '</svg>',
  ].join("");
}
