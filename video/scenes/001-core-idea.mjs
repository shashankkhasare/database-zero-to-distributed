import {
  createEmployeeRowCard,
  createEmployeeTable,
  employeeRows,
} from "../components/001-employee-table.mjs";
import { createOperationBox } from "../components/operation-box.mjs";

export const CORE_IDEA_DURATION = 57.45;
export const duration = CORE_IDEA_DURATION;

const BEATS = {
  boxes: [0, 15.225],
  transformation: [15.225, 35.375],
  system: [35.375, 49.175],
  rowTransition: [49.175, 57.45],
};

export function renderCoreIdea(root, requestedTime) {
  const time = clamp(requestedTime, 0, CORE_IDEA_DURATION);
  root.replaceChildren();

  const scene = element("main", "core-idea scene");
  scene.dataset.time = time.toFixed(3);
  scene.append(createBackdrop(), createTitle(), createSqlMemory(time));

  const flow = element("div", "query-flow");
  const rows = employeeRows();

  const source = element("section", "source-table");
  source.append(label("EMPLOYEES"), createEmployeeTable({ rows, compact: true }));
  setAnimatedStyle(source, {
    opacity: fade(time, 0, 1.2),
    transform: `translateX(${lerp(-40, 0, ease(fade(time, 0, 2)))}px)`,
  });
  flow.append(source);

  const stages = createStages(time, rows);
  const revealStarts = [3.0, 6.9, 10.6];
  stages.forEach((stage, index) => {
    setAnimatedStyle(stage, {
      opacity: fade(time, revealStarts[index], revealStarts[index] + 1.2),
      transform: `translateY(${lerp(24, 0, ease(fade(time, revealStarts[index], revealStarts[index] + 1.2)))}px)`,
    });
    flow.append(stage);
    if (index < stages.length - 1) {
      flow.append(createConnector(time, index));
    }
  });

  const finalTransition = fade(time, 49.175, 53.2);
  setAnimatedStyle(flow, {
    opacity: 1 - 0.78 * finalTransition,
    transform: `scale(${lerp(1, 0.94, ease(finalTransition))})`,
  });

  scene.append(flow, createEngineBracket(time));

  const rowCard = createEmployeeRowCard(rows[0]);
  rowCard.classList.add("core-idea__row-transition");
  const rowProgress = ease(fade(time, 50.0, 56.4));
  setAnimatedStyle(rowCard, {
    opacity: fade(time, 49.6, 51.0),
    transform: `translate(${lerp(-550, 0, rowProgress)}px, ${lerp(110, 0, rowProgress)}px) scale(${lerp(0.6, 1.12, rowProgress)})`,
  });
  scene.append(rowCard);

  root.append(scene);
}

export const renderScene = renderCoreIdea;

function createStages(time, rows) {
  const readTable = createEmployeeTable({ rows, compact: true });
  const read = createOperationBox({
    label: "READ ROWS",
    detail: readTable,
    stage: "read",
  });
  setAnimatedStyle(readTable, {
    opacity: fade(time, 15.6, 17.2),
  });

  const filterProgress = ease(fade(time, 20.5, 25.0));
  const filterTable = createEmployeeTable({
    rows,
    linusState: filterProgress > 0.08 ? "removed" : "normal",
    compact: true,
  });
  const linusRow = filterTable.querySelector('[data-employee="linus"]');
  setAnimatedStyle(linusRow, {
    opacity: 1 - filterProgress,
    minHeight: `${49 * (1 - filterProgress)}px`,
    height: `${49 * (1 - filterProgress)}px`,
    transform: `translateX(${filterProgress * 20}px)`,
  });
  const filter = createOperationBox({
    label: "KEEP MATCHING ROWS",
    detail: filterTable,
    stage: "filter",
  });
  setAnimatedStyle(filterTable, {
    opacity: fade(time, 17.2, 19.0),
  });

  const projectProgress = ease(fade(time, 26.0, 31.0));
  const projectBefore = createEmployeeTable({
    rows: rows.filter((row) => row.name !== "Linus"),
    compact: true,
  });
  const projectAfter = createEmployeeTable({
    columns: ["name"],
    rows: rows.filter((row) => row.name !== "Linus"),
    compact: true,
  });
  const projectTables = element("div", "table-transition");
  setAnimatedStyle(projectBefore, {
    opacity: 1 - projectProgress,
    transform: `scaleX(${lerp(1, 0.74, projectProgress)})`,
  });
  setAnimatedStyle(projectAfter, {
    opacity: projectProgress,
    transform: `scaleX(${lerp(1.2, 1, projectProgress)})`,
  });
  projectTables.append(projectBefore, projectAfter);
  const project = createOperationBox({
    label: "KEEP REQUESTED COLUMNS",
    detail: projectTables,
    stage: "project",
  });
  setAnimatedStyle(projectTables, {
    opacity: fade(time, 25.0, 26.5),
  });

  const activeIndex = activeStage(time);
  [read, filter, project].forEach((stage, index) => {
    if (index === activeIndex) stage.classList.add("operation-box--active");
  });

  return [read, filter, project];
}

function createConnector(time, index) {
  const wrapper = element("div", "flow-connector");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 40");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = [
    '<path class="flow-connector__line" d="M 4 20 H 88" />',
    '<path class="flow-connector__head" d="M 78 10 L 90 20 L 78 30" />',
    '<circle class="flow-connector__pulse" cx="10" cy="20" r="5" />',
  ].join("");
  wrapper.append(svg);

  const pulseWindows = index === 0
    ? [[16.0, 19.0], [32.0, 33.5], [43.0, 44.2]]
    : [[24.5, 27.5], [33.2, 34.7], [45.0, 46.2]];
  const pulse = pulseWindows.reduce((value, [start, end]) => {
    const progress = fade(time, start, end);
    return progress > 0 && progress < 1 ? progress : value;
  }, 0);
  const dot = svg.querySelector(".flow-connector__pulse");
  dot.style.opacity = pulse > 0 ? "1" : "0";
  dot.style.transform = `translateX(${pulse * 72}px)`;
  return wrapper;
}

function createSqlMemory(time) {
  const sql = element("div", "sql-memory");
  sql.innerHTML = "SELECT name<br>FROM employees<br>WHERE salary &gt; 50000";
  setAnimatedStyle(sql, {
    opacity: 0.32 * (1 - fade(time, 0, 2.8)),
    transform: `translateY(${lerp(0, -18, ease(fade(time, 0, 2.8)))}px)`,
  });
  return sql;
}

function createEngineBracket(time) {
  const bracket = element("div", "engine-bracket");
  bracket.append(label("QUERY ENGINE"));
  const reveal = fade(time, 40.3, 42.2);
  const leave = fade(time, 49.175, 52.0);
  setAnimatedStyle(bracket, {
    opacity: reveal * (1 - leave),
    transform: `scaleX(${lerp(0.82, 1, ease(reveal))})`,
  });
  return bracket;
}

function createBackdrop() {
  const backdrop = element("div", "scene__backdrop");
  backdrop.innerHTML = '<div class="scene__grid"></div><div class="scene__glow"></div>';
  return backdrop;
}

function createTitle() {
  const title = element("header", "scene-title");
  title.textContent = "A query as small transformations";
  return title;
}

function activeStage(time) {
  if (time >= 30 && time < 33) return 2;
  if (time >= 26 && time < 29) return 1;
  if (time >= 21 && time < 24) return 0;
  if (time >= 41 && time < 47) return Math.min(2, Math.floor((time - 41) / 2));
  return -1;
}

function label(text) {
  const value = element("div", "visual-label");
  value.textContent = text;
  return value;
}

function element(tag, className) {
  const value = document.createElement(tag);
  value.className = className;
  return value;
}

function setAnimatedStyle(target, styles) {
  Object.assign(target.style, styles);
}

function fade(time, start, end) {
  return clamp((time - start) / (end - start), 0, 1);
}

function ease(value) {
  return 1 - Math.pow(1 - value, 3);
}

function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : 0));
}

export { BEATS };
