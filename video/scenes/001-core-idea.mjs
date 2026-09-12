import { createEmployeeRowCard, createEmployeeTable, employeeRows } from "../components/001-employee-table.mjs";
import { createOperationBox } from "../components/operation-box.mjs";
import {
  clamp,
  createScene,
  ease,
  element,
  fade,
  lerp,
  setStyle,
} from "../components/scene-utils.mjs";

export const duration = 75.525;

export function renderScene(root, requestedTime) {
  const time = clamp(requestedTime, 0, duration);
  root.replaceChildren();
  const scene = createScene({
    className: "core-idea",
    title: "A query as small transformations",
    time,
  });
  const rows = employeeRows();

  const flow = element("section", "query-flow query-flow--responsibilities");
  const source = element("section", "source-table");
  source.append(
    element("div", "visual-label", "EMPLOYEES"),
    createEmployeeTable({ rows, compact: true }),
  );
  flow.append(source);

  const stages = [
    createStage("GIVE ROWS", "provides the input rows", "read"),
    createStage("CHOOSE ROWS", "tests one condition", "filter"),
    createStage("CHOOSE COLUMNS", "keeps requested columns", "project"),
  ];
  const revealStarts = [6.95, 10.025, 13.2];
  stages.forEach((stage, index) => {
    setStyle(stage, {
      opacity: String(fade(time, revealStarts[index], revealStarts[index] + 1.2)),
      transform: `translateY(${lerp(24, 0, ease(fade(time, revealStarts[index], revealStarts[index] + 1.2)))}px)`,
    });
    flow.append(stage);
  });

  const active = activeStage(time);
  stages.forEach((stage, index) => {
    stage.classList.toggle("operation-box--active", index === active);
  });
  const leave = fade(time, 62.8, 68.0);
  setStyle(flow, {
    opacity: String(1 - 0.8 * leave),
    transform: `scale(${lerp(1, 0.94, ease(leave))})`,
  });
  scene.append(flow);

  const bracket = element("div", "engine-bracket");
  bracket.append(element("div", "visual-label", "QUERY ENGINE"));
  setStyle(bracket, {
    opacity: String(fade(time, 45.925, 49.0) * (1 - fade(time, 62.8, 65.0))),
    left: "418px",
    width: "1460px",
  });
  scene.append(bracket);

  const result = element("section", "core-result-card");
  result.append(
    element("div", "visual-label", "RESULT"),
    createEmployeeTable({
      columns: ["name"],
      rows: rows.filter((row) => row.name !== "Linus"),
      compact: true,
    }),
  );
  setStyle(result, {
    opacity: String(fade(time, revealStarts[2], revealStarts[2] + 1.2) * (1 - fade(time, 44.8, 45.925))),
  });
  scene.append(result);

  const row = createEmployeeRowCard(rows[0]);
  row.classList.add("core-idea__row-transition");
  const rowProgress = ease(fade(time, 63.0, 74.0));
  setStyle(row, {
    opacity: String(fade(time, 63.0, 65.0)),
    transform: `translate(${lerp(-550, 0, rowProgress)}px, ${lerp(110, 0, rowProgress)}px) scale(${lerp(0.6, 1.12, rowProgress)})`,
  });
  scene.append(row);
  root.append(scene);
}

function createStage(label, responsibility, stageName) {
  return createOperationBox({
    label,
    detail: element("div", "operation-responsibility", responsibility),
    stage: stageName,
  });
}

function activeStage(time) {
  if (time >= 27.45 && time < 36.2) return 0;
  if (time >= 36.2 && time < 41.45) return 1;
  if (time >= 41.45 && time < 45.925) return 2;
  if (time >= 45.925 && time < 62.8) {
    return Math.min(2, Math.floor((time - 45.925) / 5.5));
  }
  return -1;
}
