import { createEmployeeTable, employeeRows } from "../components/001-employee-table.mjs";
import { createPlanTree, planNode } from "../components/001-plan-tree.mjs";
import {
  clamp,
  createArrow,
  createScene,
  ease,
  element,
  fade,
  lerp,
  setStyle,
  windowOpacity,
} from "../components/scene-utils.mjs";

export const duration = 42.125;

export function renderScene(root, requestedTime) {
  const time = clamp(requestedTime, 0, duration);
  root.replaceChildren();
  const scene = createScene({ className: "relational", title: "The language inside the plan", time });
  const rows = employeeRows();

  const transformations = element("section", "algebra-transformations");
  const actions = time < 14.325
    ? ["READ ROWS", "KEEP ROWS", "KEEP COLUMNS"]
    : ["SCAN", "FILTER", "PROJECT"];
  actions.forEach((action, index) => {
    if (index > 0) transformations.append(createArrow());
    const operation = element("div", "algebra-operation", action);
    setStyle(operation, { opacity: String(fade(time, 1 + index * 2.8, 2.5 + index * 2.8)) });
    transformations.append(operation);
  });
  setStyle(transformations, {
    opacity: String(windowOpacity(time, 0, 1.5, 29.0, 31.0)),
  });
  scene.append(transformations);

  const relationPair = element("section", "relation-pair");
  relationPair.append(
    createEmployeeTable({ rows, compact: true }),
    createArrow(),
    createEmployeeTable({ columns: ["name"], rows: rows.filter((row) => row.name !== "Linus"), compact: true }),
  );
  setStyle(relationPair, { opacity: String(windowOpacity(time, 5.5, 8.5, 29.0, 31.0)) });
  scene.append(relationPair);

  const term = element("div", "algebra-term", "RELATIONAL ALGEBRA");
  setStyle(term, {
    opacity: String(windowOpacity(time, 18.0, 21.0, 30.0, 32.0)),
    transform: `scale(${lerp(0.94, 1, ease(fade(time, 18.0, 21.0)))})`,
  });
  scene.append(term);

  const tree = createPlanTree({ formal: true, details: false });
  tree.classList.add("relational__tree");
  const treeReveal = ease(fade(time, 29.5, 33.0));
  setStyle(tree, {
    opacity: String(treeReveal),
    transform: `rotate(${lerp(-6, 0, treeReveal)}deg)`,
  });
  const highlight = Math.min(2, Math.max(0, Math.floor((time - 33) / 2.2)));
  ["scan", "filter", "project"].forEach((name, index) => {
    planNode(tree, name).classList.toggle("plan-node--active", time >= 33 && index === highlight);
  });
  scene.append(tree);

  const closingQuestion = element("div", "closing-question", "What makes two plans mean the same thing?");
  setStyle(closingQuestion, {
    opacity: String(fade(time, 36.0, 39.0)),
    transform: `translateX(${lerp(30, 0, ease(fade(time, 36.0, 39.0)))}px)`,
  });
  scene.append(closingQuestion);
  root.append(scene);
}
