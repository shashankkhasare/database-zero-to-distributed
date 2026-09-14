import { createBackdrop, element, setStyle } from "../components/scene-utils.mjs";
export const duration = 1;
export function renderScene(root) {
  root.replaceChildren(); const scene = element("main", "scene"); scene.append(createBackdrop());
  const label = element("div", "", "DATABASE: ZERO TO DISTRIBUTED"); setStyle(label, { position: "absolute", top: "305px", left: "105px", color: "#79c8bd", fontSize: "24px", fontWeight: "800", letterSpacing: ".13em" });
  const title = element("h1", ""); title.innerHTML = "Relational Algebra<br><span style=\"color:#e9b35c\">Without the Math</span>"; setStyle(title, { position: "absolute", top: "380px", left: "100px", width: "930px", margin: "0", color: "#f3ead8", fontFamily: "Georgia, serif", fontSize: "88px", lineHeight: "1" });
  const plans = element("div", ""); setStyle(plans, { position: "absolute", top: "190px", right: "110px", width: "650px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "34px" }); plans.append(plan("PLAN A", ["PROJECT", "FILTER", "SCAN"]), plan("PLAN B", ["FILTER", "PROJECT", "SCAN"]));
  const badge = element("div", "", "LESSON 002"); setStyle(badge, { position: "absolute", left: "108px", bottom: "105px", padding: "16px 25px", border: "2px solid #5f918d", borderRadius: "12px", color: "#f3ead8", background: "#183039", fontSize: "23px", fontWeight: "800" });
  scene.append(label, title, plans, badge); root.append(scene);
}
function plan(label, nodes) { const card = element("section", "lesson-002-card"); setStyle(card, { minHeight: "600px", padding: "24px" }); card.append(element("div", "visual-label", label)); const stack = element("div", "lesson-002-mini-plan"); nodes.forEach((node) => stack.append(element("div", "lesson-002-mini-node", node))); card.append(stack); return card; }
