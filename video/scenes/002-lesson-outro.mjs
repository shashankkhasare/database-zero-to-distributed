import { clamp, createBackdrop, ease, element, fade, lerp, setStyle } from "../components/scene-utils.mjs";
export const duration = 7;
export function renderScene(root, requestedTime) {
  const time = clamp(requestedTime, 0, duration); root.replaceChildren();
  const scene = element("main", "lesson-outro scene"); scene.append(createBackdrop());
  const reveal = ease(fade(time, .6, 1.8)); const leave = ease(fade(time, 6.2, 6.95)); setStyle(scene, { opacity: String(1 - leave) });
  const tokens = element("div", "lesson-002-token-row"); ["SELECT", "FROM", "WHERE"].forEach((token) => tokens.append(element("span", "lesson-002-token", token)));
  setStyle(tokens, { opacity: String(reveal), transform: `translateY(${lerp(24, 0, reveal)}px)` });
  const eyebrow = element("div", "lesson-outro__eyebrow", "NEXT LESSON"); const title = element("div", "lesson-outro__title", "SQL Is Just a Frontend");
  const question = element("div", "lesson-outro__question", "How does SQL become a logical plan?"); const footer = element("div", "lesson-outro__footer");
  footer.innerHTML = "BOOK · shashankkhasare.github.io/database-zero-to-distributed<br>CODE · github.com/shashankkhasare/database-zero-to-distributed";
  setStyle(eyebrow, { marginTop: "70px", opacity: String(fade(time, 1.8, 2.6)) }); setStyle(title, { opacity: String(fade(time, 2.3, 3.3)) });
  setStyle(question, { opacity: String(fade(time, 3.1, 4.1)) }); setStyle(footer, { opacity: String(fade(time, 4, 5)), lineHeight: "1.65" });
  scene.append(tokens, eyebrow, title, question, footer); root.append(scene);
}
