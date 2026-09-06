import { clamp, createBackdrop, ease, element, fade, lerp, setStyle } from "../components/scene-utils.mjs";

export const duration = 7;

export function renderScene(root, requestedTime) {
  const time = clamp(requestedTime, 0, duration);
  root.replaceChildren();
  const scene = element("main", "lesson-outro scene");
  scene.append(createBackdrop());

  const diagram = element("div");
  setStyle(diagram, { position: "absolute", top: "118px", left: "50%", width: "760px", height: "170px", transform: "translateX(-50%)" });
  const names = ["Scan", "Filter", "Project"];
  for (const [index, name] of names.entries()) {
    const arrive = ease(fade(time, 0.18 + index * 0.22, 0.88 + index * 0.22));
    const gather = ease(fade(time, 1.48, 2.35));
    const box = element("div", "", name);
    const startX = index * 265;
    const gatheredX = 330 + (index - 1) * 36;
    setStyle(box, {
      position: "absolute", left: `${lerp(startX, gatheredX, gather)}px`, top: `${lerp(62, 68 + Math.abs(index - 1) * 5, gather)}px`,
      width: `${lerp(190, 100, gather)}px`, height: `${lerp(66, 52, gather)}px`, display: "grid", placeItems: "center",
      border: "2px solid #5e8886", borderRadius: "16px", color: "#f3ead8", background: "#14262d",
      fontSize: `${lerp(22, 15, gather)}px`, fontWeight: "700",
      opacity: String(arrive * (1 - fade(time, 2.12, 2.55))), transform: `translateY(${lerp(18, 0, arrive)}px)`,
    });
    diagram.append(box);
    if (index < names.length - 1) {
      const arrow = element("div", "", "→");
      setStyle(arrow, { position: "absolute", left: `${215 + index * 265}px`, top: "72px", color: "#e9b35c", fontSize: "34px", opacity: String(fade(time, 0.9 + index * 0.18, 1.25 + index * 0.18) * (1 - fade(time, 1.55, 2.05))) });
      diagram.append(arrow);
    }
  }

  const spark = element("div", "", "◆");
  const sparkReveal = ease(fade(time, 2.02, 2.56));
  setStyle(spark, { position: "absolute", left: "365px", top: "52px", color: "#e9b35c", fontSize: "38px", opacity: String(sparkReveal * (1 - fade(time, 3.0, 3.55))), transform: `scale(${lerp(0.35, 1, sparkReveal)}) rotate(${lerp(0, 45, sparkReveal)}deg)`, textShadow: "0 0 30px rgba(233, 179, 92, 0.55)" });
  diagram.append(spark);

  const eyebrow = element("div", "lesson-outro__eyebrow", "NEXT LESSON");
  const title = element("div", "lesson-outro__title", "Relational Algebra Without the Math");
  const question = element("div", "lesson-outro__question", "What makes two query plans mean the same thing?");
  const footer = element("div", "lesson-outro__footer", "Database: Zero to Distributed");
  const cardReveal = ease(fade(time, 2.45, 3.35));
  const titleReveal = ease(fade(time, 2.8, 3.75));
  const leave = ease(fade(time, 6.25, 6.95));
  setStyle(scene, { opacity: String(1 - leave) });
  setStyle(eyebrow, { marginTop: "130px", opacity: String(cardReveal) });
  setStyle(title, { opacity: String(titleReveal), transform: `translateY(${lerp(22, 0, titleReveal)}px)` });
  setStyle(question, { opacity: String(fade(time, 3.65, 4.55)) });
  setStyle(footer, { opacity: String(fade(time, 4.35, 5.25)) });
  scene.append(diagram, eyebrow, title, question, footer);
  root.append(scene);
}
