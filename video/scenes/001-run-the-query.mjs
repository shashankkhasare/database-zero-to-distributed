import { createEmployeeTable, employeeRows } from "../components/001-employee-table.mjs";
import { createPlanTree } from "../components/001-plan-tree.mjs";
import {
  clamp,
  createScene,
  ease,
  element,
  fade,
  lerp,
  setStyle,
  windowOpacity,
  createSceneTimeline,
} from "../components/scene-utils.mjs";

export const duration = 45.475;

export function renderScene(root, requestedTime, context) {
  const time = clamp(requestedTime, 0, duration);
  const timeline = createSceneTimeline(context, "run-the-query", duration);
  root.replaceChildren();
  const scene = createScene({ className: "run-query", title: "Run the query", time });
  const rows = employeeRows();

  const tree = createPlanTree({ formal: true, details: true });
  tree.classList.add("run-query__tree");
  setStyle(tree, {
    opacity: String(windowOpacity(time, 0, 2.0, 31.0, 34.0)),
    transform: `scale(${lerp(0.94, 1, ease(fade(time, 0, 2.0)))})`,
  });
  scene.append(tree);

  const terminal = element("section", "terminal-panel");
  terminal.append(
    element("div", "terminal-panel__bar", "lesson 001"),
    element("div", "terminal-panel__command", "$ cargo run --quiet"),
  );
  const output = element("div", "terminal-panel__output");
  const lines = [
    "Employees earning more than 50,000:",
    '{name: "Ada"}',
    '{name: "Grace"}',
  ];
  lines.forEach((line, index) => {
    const lineElement = element("div", "terminal-line", line);
    setStyle(lineElement, { opacity: String(fade(time, 15 + index * 3.2, 16.2 + index * 3.2)) });
    output.append(lineElement);
  });
  terminal.append(output);
  setStyle(terminal, {
    opacity: String(windowOpacity(time, 11.0, 14.0, 30.0, 33.0)),
    transform: `translateX(${lerp(45, 0, ease(fade(time, 11.0, 14.0)))}px)`,
  });
  scene.append(terminal);

  const checks = element("div", "result-checks");
  checks.append(
    element("div", "result-check", "Ada: 70,000 > 50,000"),
    element("div", "result-check", "Grace: 72,000 > 50,000"),
    element("div", "result-check", "Only the name column remains"),
  );
  setStyle(checks, { opacity: String(windowOpacity(time, 21.0, 23.5, 30.0, 32.0)) });
  scene.append(checks);

  const scaleQuestion = element("section", "scale-question");
  scaleQuestion.append(
    createEmployeeTable({ rows, compact: true }),
    element("div", "row-count", "3 rows"),
    element("div", "row-count row-count--large", "1,000,000 rows?"),
    element("div", "scale-question__text", "What must stay in memory?"),
  );
  const scaleStart = timeline.start("run-the-query-003", 29.6) + 9.0;
  setStyle(scaleQuestion, {
    opacity: String(fade(time, scaleStart, scaleStart + 2.0)),
    transform: `translateY(${lerp(25, 0, ease(fade(time, scaleStart, scaleStart + 2.0)))}px)`,
  });
  scene.append(scaleQuestion);
  root.append(scene);
}
