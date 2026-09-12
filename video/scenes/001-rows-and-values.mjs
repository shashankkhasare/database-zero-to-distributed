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

export const duration = 114.85;

export function renderScene(root, requestedTime) {
  const time = clamp(requestedTime, 0, duration);
  root.replaceChildren();
  const scene = createScene({ className: "rows-values", title: "What moves between operations?", time });
  const rows = employeeRows();

  const rowCard = createEmployeeRowCard(rows[0]);
  rowCard.classList.add("rows-values__hero-row");
  setStyle(rowCard, {
    opacity: String(windowOpacity(time, 0, 1.2, 18.5, 20.5)),
    transform: `translateX(-50%) scale(${lerp(1.12, 0.92, ease(fade(time, 39.3, 43.4)))})`,
  });
  focusCells(rowCard, time);
  scene.append(rowCard);

  const cellCaption = element("div", "cell-caption", "A cell holds one value");
  setStyle(cellCaption, { opacity: String(windowOpacity(time, 2.0, 4.0, 18.5, 20.0)) });
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
    opacity: String(windowOpacity(time, 19.3, 21.0, 42.8, 43.4)),
  });
  scene.append(valueGroup);

  const rowModel = element("section", "row-model");
  rowModel.append(
    element("div", "visual-label", "ONE EMPLOYEE ROW"),
    createEmployeeTable({ rows: [rows[0]] }),
    element("div", "row-model__note", "column name  +  value"),
  );
  setStyle(rowModel, {
    opacity: String(windowOpacity(time, 43.4, 43.5, 78.1, 80.0)),
    transform: `translateY(${lerp(24, 0, ease(fade(time, 43.4, 43.5)))}px)`,
  });
  scene.append(rowModel);

  const abilities = element("section", "row-abilities");
  const abilityNames = ["CREATE", "FIND A VALUE", "KEEP SELECTED COLUMNS"];
  abilityNames.forEach((name, index) => {
    const ability = element("div", "ability-card", name);
    setStyle(ability, { opacity: String(fade(time, 80 + index * 5, 82 + index * 5)) });
    abilities.append(ability);
  });
  const projection = element("div", "ability-demo");
  projection.append(
    createEmployeeTable({ rows: [rows[0]], compact: true }),
    createArrow(),
    createEmployeeTable({ columns: ["name"], rows: [rows[0]], compact: true }),
  );
  setStyle(projection, { opacity: String(fade(time, 90.425, 94.0)) });
  abilities.append(projection);
  setStyle(abilities, { opacity: String(windowOpacity(time, 78.1, 80.0, 108.125, 110.0)) });
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
  const handoffProgress = ease(fade(time, 108.125, 112.0));
  setStyle(handoff, {
    opacity: String(fade(time, 108.125, 110.0)),
    transform: `translateY(${lerp(35, 0, handoffProgress)}px)`,
  });
  scene.append(handoff);
  root.append(scene);
}

function focusCells(rowCard, time) {
  const cells = rowCard.querySelectorAll(".employee-row-card__cell");
  const active = time < 4.95 ? 0 : time < 10.375 ? 1 : time < 18.5 ? 2 : -1;
  cells.forEach((cell, index) => {
    cell.classList.toggle("employee-row-card__cell--active", index === active);
  });
}
