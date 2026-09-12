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

export const duration = 101.35;

export function renderScene(root, requestedTime) {
  const time = clamp(requestedTime, 0, duration);
  root.replaceChildren();
  const scene = createScene({
    className: "question-result",
    title: "One table. One question.",
    time,
  });
  const rows = employeeRows();
  setStyle(scene, { opacity: "1" });

  const tablePanel = element("section", "hero-table");
  tablePanel.append(element("div", "visual-label", "EMPLOYEES"), createEmployeeTable({ rows }));
  const tableMove = ease(fade(time, 38.8, 42.225));
  setStyle(tablePanel, {
    opacity: String((1 - windowOpacity(time, 47.8, 48.65, 52.0, 53.0)) * (1 - fade(time, 71.225, 73.0))),
    transform: `translateX(${lerp(390, 0, tableMove)}px) scale(${lerp(1.08, 1, tableMove)})`,
  });
  scene.append(tablePanel);

  const sql = element("section", "sql-panel");
  sql.innerHTML = [
    '<div><span class="sql-keyword">SELECT</span> <mark data-sql="name">name</mark></div>',
    '<div><span class="sql-keyword">FROM</span> <mark data-sql="table">employees</mark></div>',
    '<div><span class="sql-keyword">WHERE</span> <mark data-sql="condition">salary &gt; 50000</mark></div>',
  ].join("");
  setStyle(sql, {
    opacity: String(windowOpacity(time, 38.8, 40.5, 47.8, 48.65) + windowOpacity(time, 52.0, 53.0, 69.5, 71.225)),
    transform: `translateY(${lerp(24, 0, ease(fade(time, 38.8, 40.5)))}px)`,
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
    opacity: String(windowOpacity(time, 24.8, 26.0, 37.4, 38.8)),
  });
  scene.append(decisions);

  const database = element("div", "database-frame", "DATABASE");
  setStyle(database, {
    opacity: String(windowOpacity(time, 48.65, 49.5, 50.2, 51.2)),
  });
  scene.append(database);

  const visibleResultRows = time < 25.725
    ? []
    : time < 28.1
      ? rows.filter((row) => row.name === "Ada")
      : rows.filter((row) => row.name !== "Linus");
  const result = createEmployeeTable({
    columns: ["name"],
    rows: visibleResultRows,
  });
  const resultPanel = element("section", "result-panel");
  resultPanel.append(element("div", "visual-label", "RESULT"), result);
  const resultOpacity = time < 38.8
    ? 1
    : time < 71.225
      ? 0
      : fade(time, 97.4, 98.0);
  setStyle(resultPanel, {
    opacity: String(resultOpacity),
    transform: `translateX(${lerp(35, 0, ease(fade(time, 0, 1.2)))}px)`,
    top: "210px",
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
    opacity: String(windowOpacity(time, 71.225, 73.0, 95.075, 97.0)),
  });
  const linus = original.querySelector('[data-employee="linus"]');
  const removeProgress = ease(fade(time, 79.1, 85.075));
  setStyle(linus, { opacity: String(1 - removeProgress) });
  const hiddenColumns = original.querySelectorAll('[data-column="id"], [data-column="salary"]');
  const columnProgress = fade(time, 85.075, 91.725);
  hiddenColumns.forEach((cell) => setStyle(cell, { opacity: String(1 - columnProgress) }));
  scene.append(transform);

  const handoff = element("div", "opening-handoff");
  handoff.append(
    element("div", "mini-operation", "READ ROWS"),
    element("div", "mini-operation", "KEEP ROWS"),
    element("div", "mini-operation", "KEEP COLUMNS"),
  );
  setStyle(handoff, {
    opacity: String(fade(time, 95.075, 98.0)),
    transform: `translateY(${lerp(30, 0, ease(fade(time, 95.075, 98.0)))}px)`,
  });
  scene.append(handoff);
  root.append(scene);
}

function highlightSql(sql, time) {
  const highlights = [
    ["name", 42.225, 44.3],
    ["table", 44.3, 46.0],
    ["condition", 46.0, 48.65],
  ];
  for (const [name, start, end] of highlights) {
    const target = sql.querySelector(`[data-sql="${name}"]`);
    target.style.setProperty("--highlight", String(windowOpacity(time, start, start + 0.8, end - 0.8, end)));
  }
}
