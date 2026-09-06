import { createEmployeeRowCard, createEmployeeTable, employeeRows } from "../components/001-employee-table.mjs";
import {
  clamp,
  createArrow,
  createBadge,
  createScene,
  ease,
  element,
  fade,
  lerp,
  setStyle,
  windowOpacity,
} from "../components/scene-utils.mjs";

export const duration = 82.9;

export function renderScene(root, requestedTime) {
  const time = clamp(requestedTime, 0, duration);
  root.replaceChildren();
  const scene = createScene({ className: "rows-values", title: "What moves between operations?", time });
  const rows = employeeRows();

  const rowCard = createEmployeeRowCard(rows[0]);
  rowCard.classList.add("rows-values__hero-row");
  setStyle(rowCard, {
    opacity: String(windowOpacity(time, 0, 1.2, 15.5, 17.5)),
    transform: `translateX(-50%) scale(${lerp(1.12, 0.92, ease(fade(time, 31.0, 34.0)))})`,
  });
  focusCells(rowCard, time);
  scene.append(rowCard);

  const cellCaption = element("div", "cell-caption", "A cell holds one value");
  setStyle(cellCaption, { opacity: String(windowOpacity(time, 2.0, 4.0, 16.0, 17.0)) });
  scene.append(cellCaption);

  const valueGroup = element("section", "value-group");
  valueGroup.append(
    createBadge("1", "integer"),
    createBadge("Ada", "text"),
    element("div", "value-brace", "VALUE"),
    element("div", "value-kind value-kind--integer", "INTEGER"),
    element("div", "value-kind value-kind--text", "TEXT"),
  );
  setStyle(valueGroup, {
    opacity: String(windowOpacity(time, 16.4, 18.5, 30.0, 31.5)),
  });
  scene.append(valueGroup);

  const rowModel = element("section", "row-model");
  rowModel.append(
    element("div", "visual-label", "ONE EMPLOYEE ROW"),
    createEmployeeTable({ rows: [rows[0]] }),
    element("div", "row-model__note", "column name  +  value"),
  );
  setStyle(rowModel, {
    opacity: String(windowOpacity(time, 31.0, 33.5, 52.0, 54.0)),
    transform: `translateY(${lerp(24, 0, ease(fade(time, 31.0, 33.5)))}px)`,
  });
  scene.append(rowModel);

  const abilities = element("section", "row-abilities");
  const abilityNames = ["CREATE", "FIND A VALUE", "KEEP SELECTED COLUMNS"];
  abilityNames.forEach((name, index) => {
    const ability = element("div", "ability-card", name);
    setStyle(ability, { opacity: String(fade(time, 53 + index * 4.2, 55 + index * 4.2)) });
    abilities.append(ability);
  });
  const projection = element("div", "ability-demo");
  projection.append(
    createEmployeeTable({ rows: [rows[0]], compact: true }),
    createArrow(),
    createEmployeeTable({ columns: ["name"], rows: [rows[0]], compact: true }),
  );
  setStyle(projection, { opacity: String(fade(time, 65.0, 68.0)) });
  abilities.append(projection);
  setStyle(abilities, { opacity: String(windowOpacity(time, 52.0, 54.0, 73.0, 75.0)) });
  scene.append(abilities);

  const handoff = element("section", "rows-handoff");
  const stream = element("div", "row-stream");
  for (const row of rows) stream.append(createEmployeeTable({ rows: [row], compact: true }));
  const boxes = element("div", "rows-handoff__boxes");
  boxes.append(
    element("div", "mini-operation", "?"),
    element("div", "mini-operation", "?"),
    element("div", "mini-operation", "?"),
  );
  handoff.append(stream, createArrow(), boxes);
  const handoffProgress = ease(fade(time, 73.0, 78.0));
  setStyle(handoff, {
    opacity: String(fade(time, 72.5, 74.5)),
    transform: `translateY(${lerp(35, 0, handoffProgress)}px)`,
  });
  scene.append(handoff);
  root.append(scene);
}

function focusCells(rowCard, time) {
  const cells = rowCard.querySelectorAll(".employee-row-card__cell");
  const active = time < 7 ? 0 : time < 13 ? 1 : -1;
  cells.forEach((cell, index) => {
    cell.classList.toggle("employee-row-card__cell--active", index === active);
  });
}
