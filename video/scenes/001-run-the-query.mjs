import { createEmployeeTable, employeeRows } from "../components/001-employee-table.mjs";
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

export const duration = 46.4;

export function renderScene(root, requestedTime, context) {
  const time = clamp(requestedTime, 0, duration);
  const timeline = createSceneTimeline(context, "run-the-query", duration);
  root.replaceChildren();
  const scene = createScene({ className: "run-query", title: "Run the query", time });
  const rows = employeeRows();

  const result = element("section", "run-query__tree persistent-result");
  result.append(
    element("div", "visual-label", "PREDICTED RESULT"),
    createEmployeeTable({
      columns: ["name"],
      rows: rows.filter((row) => row.name !== "Linus"),
    }),
  );
  setStyle(result, {
    opacity: String(1 - fade(time, 30.175, 32.0)),
    transform: `scale(${lerp(0.94, 1, ease(fade(time, 0, 2.0)))})`,
  });
  scene.append(result);

  const terminal = element("section", "terminal-panel");
  terminal.append(
    element("div", "terminal-panel__bar", "lesson 001"),
    element("div", "terminal-panel__command", "$ cargo run"),
  );
  const output = element("div", "terminal-panel__output");
  const lines = [
    "Employees earning more than 50,000:",
    '{name: "Ada"}',
    '{name: "Grace"}',
  ];
  lines.forEach((line, index) => {
    const lineElement = element("div", "terminal-line", line);
    setStyle(lineElement, { opacity: String(fade(time, 6.525 + index * 2.05, 7.5 + index * 2.05)) });
    output.append(lineElement);
  });
  terminal.append(output);
  setStyle(terminal, {
    opacity: String(windowOpacity(time, 1.925, 3.0, 30.175, 32.0)),
    transform: `translateX(${lerp(45, 0, ease(fade(time, 1.925, 3.0)))}px)`,
  });
  scene.append(terminal);

  const checks = element("div", "result-checks");
  checks.append(
    element("div", "result-check", "Ada: 70,000 > 50,000"),
    element("div", "result-check", "Grace: 72,000 > 50,000"),
    element("div", "result-check", "Only the name column remains"),
  );
  setStyle(checks, { opacity: String(windowOpacity(time, 10.575, 12.0, 30.175, 32.0)) });
  scene.append(checks);

  const scaleQuestion = element("section", "scale-question");
  scaleQuestion.append(
    createEmployeeTable({ rows, compact: true }),
    element("div", "row-count", "3 rows"),
    element("div", "row-count row-count--large", "1,000,000 rows?"),
    element("div", "scale-question__text", "What must stay in memory?"),
  );
  const scaleStart = timeline.start("run-the-query-011", 37.15);
  setStyle(scaleQuestion, {
    opacity: String(fade(time, scaleStart, scaleStart + 2.0)),
    transform: `translateY(${lerp(25, 0, ease(fade(time, scaleStart, scaleStart + 2.0)))}px)`,
  });
  scene.append(scaleQuestion);
  root.append(scene);
}
