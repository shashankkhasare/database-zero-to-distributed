import { createBackdrop, element, setStyle } from "../components/scene-utils.mjs";

export const duration = 1;

export function renderScene(root) {
  root.replaceChildren();
  const scene = element("main", "scene");
  scene.append(createBackdrop());

  const label = element("div", "", "DATABASE: ZERO TO DISTRIBUTED");
  setStyle(label, {
    position: "absolute", top: "330px", left: "110px", color: "#79c8bd",
    fontSize: "24px", fontWeight: "800", letterSpacing: "0.13em",
  });

  const title = element("h1", "");
  title.innerHTML = "The Smallest<br><span style=\"color:#e9b35c\">Query Engine</span>";
  setStyle(title, {
    position: "absolute", top: "410px", left: "105px", width: "760px", margin: "0",
    color: "#f3ead8", fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: "102px", lineHeight: "0.98", letterSpacing: "-0.045em",
  });

  const subtitle = element("div", "", "SCAN  ·  FILTER  ·  PROJECT");
  setStyle(subtitle, {
    position: "absolute", top: "690px", left: "112px", color: "#b8c7c3",
    fontSize: "26px", fontWeight: "700", letterSpacing: "0.12em",
  });

  const plan = element("div");
  setStyle(plan, { position: "absolute", top: "130px", right: "115px", width: "700px", height: "760px" });
  const nodes = [
    { name: "PROJECT", detail: "name", top: 30, width: 420 },
    { name: "FILTER", detail: "salary > 50,000", top: 255, width: 500 },
    { name: "SCAN", detail: "employees", top: 480, width: 420 },
  ];
  for (const [index, node] of nodes.entries()) {
    const box = element("div");
    setStyle(box, {
      position: "absolute", top: `${node.top}px`, left: `${(700 - node.width) / 2}px`,
      width: `${node.width}px`, height: "145px", border: "4px solid #5f918d",
      borderRadius: "24px", background: "rgba(19, 39, 46, 0.96)",
      boxShadow: "0 20px 45px rgba(0, 0, 0, 0.28)", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
    });
    const name = element("div", "", node.name);
    setStyle(name, { color: "#f3ead8", fontSize: "35px", fontWeight: "850", letterSpacing: "0.08em" });
    const detail = element("div", "", node.detail);
    setStyle(detail, { marginTop: "12px", color: "#e9b35c", fontFamily: "Consolas, monospace", fontSize: "25px" });
    box.append(name, detail);
    plan.append(box);
    if (index < nodes.length - 1) {
      const arrow = element("div", "", "↑");
      setStyle(arrow, { position: "absolute", top: `${node.top + 145}px`, left: "325px", color: "#e9b35c", fontSize: "66px", lineHeight: "80px" });
      plan.append(arrow);
    }
  }

  const badge = element("div", "", "LESSON 001");
  setStyle(badge, {
    position: "absolute", left: "110px", bottom: "105px", padding: "16px 25px",
    border: "2px solid #5f918d", borderRadius: "12px", color: "#f3ead8",
    background: "#183039", fontSize: "23px", fontWeight: "800", letterSpacing: "0.1em",
  });
  scene.append(label, title, subtitle, plan, badge);
  root.append(scene);
}
