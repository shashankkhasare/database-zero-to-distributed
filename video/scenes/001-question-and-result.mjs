import { createEmployeeTable, employeeRows } from "../components/001-employee-table.mjs";
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

export const duration = 82.225;

export function renderScene(root, requestedTime) {
  const time = clamp(requestedTime, 0, duration);
  root.replaceChildren();
  const scene = createScene({
    className: "question-result",
    title: "One table. One question.",
    time,
  });
  const rows = employeeRows();
  setStyle(scene, { opacity: String(fade(time, 0, 1.25)) });

  const tablePanel = element("section", "hero-table");
  tablePanel.append(element("div", "visual-label", "EMPLOYEES"), createEmployeeTable({ rows }));
  const tableMove = ease(fade(time, 16.8, 19.2));
  setStyle(tablePanel, {
    opacity: String(fade(time, 0.5, 2.2) * (1 - fade(time, 35.7, 37.2))),
    transform: `translateX(${lerp(390, 0, tableMove)}px) scale(${lerp(1.08, 1, tableMove)})`,
  });
  revealRows(tablePanel, time);
  scene.append(tablePanel);

  const sql = element("section", "sql-panel");
  sql.innerHTML = [
    '<div><span class="sql-keyword">SELECT</span> <mark data-sql="name">name</mark></div>',
    '<div><span class="sql-keyword">FROM</span> <mark data-sql="table">employees</mark></div>',
    '<div><span class="sql-keyword">WHERE</span> <mark data-sql="condition">salary &gt; 50000</mark></div>',
  ].join("");
  setStyle(sql, {
    opacity: String(windowOpacity(time, 17.0, 19.2, 35.7, 37.2)),
    transform: `translateY(${lerp(24, 0, ease(fade(time, 17.0, 19.2)))}px)`,
  });
  highlightSql(sql, time);
  scene.append(sql);

  const decisions = element("div", "match-decisions");
  decisions.append(
    createBadge("Ada  70,000  ✓", "yes"),
    createBadge("Linus  50,000  =", "no"),
    createBadge("Grace  72,000  ✓", "yes"),
  );
  setStyle(decisions, {
    opacity: String(windowOpacity(time, 25.0, 28.0, 35.4, 36.9)),
  });
  scene.append(decisions);

  const database = element("div", "database-frame", "DATABASE");
  setStyle(database, {
    opacity: String(windowOpacity(time, 37.5, 39.0, 48.0, 50.0)),
  });
  scene.append(database);

  const result = createEmployeeTable({
    columns: ["name"],
    rows: rows.filter((row) => row.name !== "Linus"),
  });
  const resultPanel = element("section", "result-panel");
  resultPanel.append(element("div", "visual-label", "RESULT"), result);
  setStyle(resultPanel, {
    opacity: String(windowOpacity(time, 40.5, 43.0, 48.0, 50.0)),
    transform: `translateX(${lerp(35, 0, ease(fade(time, 40.5, 43.0)))}px)`,
  });
  scene.append(resultPanel);

  const transform = element("div", "opening-transform");
  const original = createEmployeeTable({ rows, compact: true });
  const arrow = createArrow();
  const names = createEmployeeTable({
    columns: ["name"],
    rows: rows.filter((row) => row.name !== "Linus"),
    compact: true,
  });
  transform.append(original, arrow, names);
  setStyle(transform, {
    opacity: String(windowOpacity(time, 49.5, 51.5, 70.0, 72.0)),
  });
  const linus = original.querySelector('[data-employee="linus"]');
  const removeProgress = ease(fade(time, 54.0, 59.0));
  setStyle(linus, { opacity: String(1 - removeProgress) });
  const hiddenColumns = original.querySelectorAll('[data-column="id"], [data-column="salary"]');
  const columnProgress = fade(time, 59.0, 65.0);
  hiddenColumns.forEach((cell) => setStyle(cell, { opacity: String(1 - columnProgress) }));
  scene.append(transform);

  const handoff = element("div", "opening-handoff");
  handoff.append(
    element("div", "mini-operation", "READ ROWS"),
    element("div", "mini-operation", "KEEP ROWS"),
    element("div", "mini-operation", "KEEP COLUMNS"),
  );
  setStyle(handoff, {
    opacity: String(fade(time, 71.0, 75.0)),
    transform: `translateY(${lerp(30, 0, ease(fade(time, 71.0, 75.0)))}px)`,
  });
  scene.append(handoff);
  root.append(scene);
}

function revealRows(panel, time) {
  const revealTimes = [2.0, 6.0, 10.0];
  panel.querySelectorAll("[data-employee]").forEach((row, index) => {
    setStyle(row, { opacity: String(fade(time, revealTimes[index], revealTimes[index] + 1.4)) });
  });
}

function highlightSql(sql, time) {
  const highlights = [
    ["name", 18.5, 22.5],
    ["table", 20.8, 24.8],
    ["condition", 23.2, 35.8],
  ];
  for (const [name, start, end] of highlights) {
    const target = sql.querySelector(`[data-sql="${name}"]`);
    target.style.setProperty("--highlight", String(windowOpacity(time, start, start + 0.8, end - 0.8, end)));
  }
}
