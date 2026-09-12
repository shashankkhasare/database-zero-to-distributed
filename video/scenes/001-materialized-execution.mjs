import { createEmployeeTable, employeeRows } from "../components/001-employee-table.mjs";
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

export const duration = 63.9;

export function renderScene(root, requestedTime) {
  const time = clamp(requestedTime, 0, duration);
  root.replaceChildren();
  const scene = createScene({ className: "materialized", title: "What waits in memory?", time });
  const rows = employeeRows();
  const stages = element("section", "materialized-stages");

  const scan = createTray("SCAN", createEmployeeTable({ rows, compact: true }));
  const filter = createTray(
    "FILTER",
    createEmployeeTable({ rows: rows.filter((row) => row.name !== "Linus"), compact: true }),
  );
  const project = createTray(
    "PROJECT",
    createEmployeeTable({ columns: ["name"], rows: rows.filter((row) => row.name !== "Linus"), compact: true }),
  );
  stages.append(scan, createArrow(), filter, createArrow(), project);
  setStyle(scan, { opacity: String(fade(time, 0.5, 2.325)) });
  setStyle(filter, { opacity: String(fade(time, 6.4, 8.0)) });
  setStyle(project, { opacity: String(fade(time, 12.95, 14.5)) });
  setStyle(stages, { opacity: String(windowOpacity(time, 0, 0.5, 21.0, 22.95)) });
  scene.append(stages);

  const memory = element("section", "memory-frame");
  memory.append(
    element("div", "visual-label", "MEMORY"),
    createTray("COMPLETE SCAN RESULT", createRowStack(8)),
    createTray("COMPLETE FILTER RESULT", createRowStack(5)),
    element("div", "materialized-term", "MATERIALIZED RESULTS"),
  );
  setStyle(memory, {
    opacity: String(windowOpacity(time, 22.95, 25.0, 39.0, 40.825)),
  });
  scene.append(memory);

  const comparison = element("section", "streaming-preview");
  comparison.append(
    element("div", "streaming-preview__current", "complete list  →  complete list"),
    element("div", "streaming-preview__future", "one row  →  one row  →  one row"),
    element("div", "streaming-preview__note", "A later lesson will change this"),
  );
  setStyle(comparison, {
    opacity: String(fade(time, 40.825, 43.0)),
    transform: `translateY(${lerp(24, 0, ease(fade(time, 40.825, 43.0)))}px)`,
  });
  scene.append(comparison);
  root.append(scene);
}

function createTray(name, content) {
  const tray = element("section", "result-tray");
  tray.append(element("div", "result-tray__name", name), content);
  return tray;
}

function createRowStack(count) {
  const stack = element("div", "row-stack");
  for (let index = 0; index < count; index += 1) {
    stack.append(element("div", "row-stack__row"));
  }
  return stack;
}
