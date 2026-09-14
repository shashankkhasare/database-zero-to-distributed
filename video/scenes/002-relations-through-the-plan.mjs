import { createEmployeeTable, employeeRows } from "../components/001-employee-table.mjs";
import {
  clamp,
  createContentStage,
  createScene,
  createSceneTimeline,
  ease,
  element,
  fade,
  lerp,
  setStyle,
  windowOpacity,
} from "../components/scene-utils.mjs";

export const duration = 63.945;

export function renderScene(root, requestedTime, timing) {
  const timeline = createSceneTimeline(timing, "relations-through-the-plan", duration);
  const time = clamp(requestedTime, 0, timeline.duration);
  root.replaceChildren();

  const scene = createScene({
    className: "relations-plan",
    title: "Relations all the way through",
    time,
  });
  const stage = createContentStage("relations-plan__stage");
  setStyle(stage, {
    position: "absolute",
    top: "165px",
    right: "120px",
    bottom: "145px",
    left: "120px",
  });

  const transformation = createTransformation();
  setStyle(transformation, {
    opacity: String(1 - fade(time, timeline.start("relations-through-the-plan-009", 39.7), 41.1)),
  });
  updateTransformation(transformation, time, timeline);
  stage.append(transformation);

  const composition = createComposition();
  const compositionEnter = ease(fade(time, timeline.start("relations-through-the-plan-009", 39.7), 41.2));
  setStyle(composition, {
    opacity: String(compositionEnter),
    transform: `translateY(${lerp(22, 0, compositionEnter)}px)`,
  });
  stage.append(composition);

  scene.append(stage);
  root.append(scene);
}

function createTransformation() {
  const wrapper = element("div", "relations-plan__transformation");
  const rows = employeeRows();
  wrapper.append(
    relationState("source", "EMPLOYEES", createEmployeeTable({ rows })),
    relationState("filtered", "AFTER FILTER", createEmployeeTable({ rows: rows.filter((row) => row.name !== "Linus") })),
    relationState("projected", "AFTER PROJECTION", createEmployeeTable({ columns: ["name"], rows: rows.filter((row) => row.name !== "Linus") })),
  );
  const annotation = element("div", "relations-plan__annotation");
  annotation.append(
    element("span", "relations-plan__row-label", "ROWS"),
    element("span", "relations-plan__column-label", "COLUMNS"),
  );
  wrapper.append(annotation);
  return wrapper;
}

function relationState(name, label, table) {
  const state = element("section", "relations-plan__state");
  state.dataset.state = name;
  state.append(element("div", "visual-label", label), table, element("div", "relations-plan__relation-label", "RELATION"));
  return state;
}

function updateTransformation(wrapper, time, timeline) {
  const source = wrapper.querySelector('[data-state="source"]');
  const filtered = wrapper.querySelector('[data-state="filtered"]');
  const projected = wrapper.querySelector('[data-state="projected"]');
  const annotation = wrapper.querySelector(".relations-plan__annotation");

  const filterStart = timeline.start("relations-through-the-plan-006", 21.0);
  const projectStart = timeline.start("relations-through-the-plan-007", 30.1);
  setStyle(source, { opacity: String(1 - fade(time, filterStart, filterStart + 1.3)) });
  setStyle(filtered, {
    opacity: String(windowOpacity(time, filterStart, filterStart + 1.3, projectStart, projectStart + 1.3)),
  });
  setStyle(projected, { opacity: String(fade(time, projectStart, projectStart + 1.3)) });
  setStyle(annotation, {
    opacity: String(windowOpacity(time, timeline.start("relations-through-the-plan-002", 3.3), 4.0, timeline.start("relations-through-the-plan-004", 12.6), 13.5)),
  });
}

function createComposition() {
  const composition = element("div", "relations-plan__composition");
  const rows = employeeRows();
  const cards = [
    ["SCAN", "3 rows × 3 columns", createEmployeeTable({ rows, compact: true })],
    ["FILTER", "2 rows × 3 columns", createEmployeeTable({ rows: rows.filter((row) => row.name !== "Linus"), compact: true })],
    ["PROJECTION", "2 rows × 1 column", createEmployeeTable({ columns: ["name"], rows: rows.filter((row) => row.name !== "Linus"), compact: true })],
  ];

  for (const [index, [operation, shape, table]] of cards.entries()) {
    const card = element("section", "relations-plan__composition-card");
    card.append(
      element("div", "relations-plan__operation", operation),
      table,
      element("div", "relations-plan__shape", shape),
      element("div", "relations-plan__small-relation", "RELATION"),
    );
    composition.append(card);
    if (index < cards.length - 1) {
      composition.append(element("div", "relations-plan__connector", "becomes input to"));
    }
  }
  return composition;
}
