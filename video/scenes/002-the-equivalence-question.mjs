import { createEmployeeTable, employeeRows } from "../components/001-employee-table.mjs";
import { createPlanTree } from "../components/001-plan-tree.mjs";
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

export const duration = 60.62;

export function renderScene(root, requestedTime, timing) {
  const timeline = createSceneTimeline(timing, "the-equivalence-question", duration);
  const time = clamp(requestedTime, 0, timeline.duration);
  root.replaceChildren();

  const scene = createScene({
    className: "equivalence-question",
    title: "When do two plans mean the same thing?",
    time,
  });
  const stage = createContentStage("equivalence-question__stage");
  setStyle(stage, {
    position: "absolute",
    top: "165px",
    right: "120px",
    bottom: "145px",
    left: "120px",
  });

  const recap = createRecap();
  const recapLeave = ease(fade(time, timeline.start("the-equivalence-question-004", 16.6), 18.2));
  setStyle(recap, {
    opacity: String(1 - recapLeave),
    transform: `translateY(${lerp(0, -24, recapLeave)}px)`,
  });
  stage.append(recap);

  const comparison = createComparison();
  const comparisonEnter = ease(fade(time, timeline.start("the-equivalence-question-004", 16.6), 18.5));
  const comparisonLeave = ease(fade(time, timeline.start("the-equivalence-question-010", 40), 41.7));
  setStyle(comparison, {
    opacity: String(comparisonEnter * (1 - comparisonLeave)),
    transform: `translateY(${lerp(24, 0, comparisonEnter)}px)`,
  });
  animatePlanChanges(comparison, time, timeline);
  stage.append(comparison);

  const question = createQuestion();
  const questionEnter = ease(fade(time, timeline.start("the-equivalence-question-010", 40), 41.8));
  setStyle(question, {
    opacity: String(questionEnter),
    transform: `translateY(${lerp(22, 0, questionEnter)}px)`,
  });
  const optimizer = question.querySelector(".equivalence-question__optimizer");
  setStyle(optimizer, {
    opacity: String(fade(time, timeline.start("the-equivalence-question-011", 47.1), 48.4)),
  });
  const boundary = question.querySelector(".equivalence-question__boundary");
  const boundaryProgress = ease(fade(time, timeline.start("the-equivalence-question-012", 51.4), 52.8));
  setStyle(boundary, {
    opacity: String(boundaryProgress),
    transform: `scale(${lerp(0.97, 1, boundaryProgress)})`,
  });
  stage.append(question);

  scene.append(stage);
  root.append(scene);
}

function createRecap() {
  const recap = element("div", "equivalence-question__recap");

  const source = element("section", "equivalence-question__table-panel");
  source.append(
    element("div", "visual-label", "EMPLOYEES"),
    createEmployeeTable({ rows: employeeRows(), compact: true }),
  );

  const plan = createPlanTree({ formal: true });
  plan.classList.add("equivalence-question__recap-plan");
  plan.querySelectorAll(".plan-edge span").forEach((label) => label.remove());

  const result = element("section", "equivalence-question__result-panel");
  result.append(
    element("div", "visual-label", "RESULT"),
    createEmployeeTable({
      columns: ["name"],
      rows: employeeRows().filter((row) => row.name !== "Linus"),
      compact: true,
    }),
  );

  recap.append(source, plan, result);
  return recap;
}

function createComparison() {
  const comparison = element("div", "equivalence-question__comparison");
  comparison.append(
    createPlanColumn("PLAN A", ["PROJECT name", "FILTER salary > 50,000", "SCAN employees"]),
    createMiddleQuestion(),
    createPlanColumn("PLAN B", ["PROJECT name", "FILTER salary > 50,000", "SCAN employees"], true),
  );
  return comparison;
}

function createPlanColumn(label, operations, changed = false) {
  const column = element("section", "equivalence-question__plan-column");
  column.dataset.plan = changed ? "changed" : "original";
  column.append(element("div", "visual-label", label));

  const plan = element("div", "equivalence-question__compact-plan");
  for (const [index, operation] of operations.entries()) {
    const node = element("div", "equivalence-question__compact-node", operation);
    node.dataset.position = String(index);
    plan.append(node);
    if (index < operations.length - 1) {
      plan.append(element("div", "equivalence-question__line"));
    }
  }

  const result = element("div", "equivalence-question__matching-result", "Ada   Grace");
  column.append(plan, result);
  return column;
}

function createMiddleQuestion() {
  const middle = element("div", "equivalence-question__middle");
  middle.append(
    element("div", "equivalence-question__same", "SAME RESULT HERE"),
    element("div", "equivalence-question__question-mark", "?"),
    element("div", "equivalence-question__everywhere", "SAME QUERY EVERYWHERE"),
  );
  return middle;
}

function animatePlanChanges(comparison, time, timeline) {
  const changed = comparison.querySelector('[data-plan="changed"]');
  const nodes = changed.querySelectorAll(".equivalence-question__compact-node");
  const remove = ease(fade(time, timeline.start("the-equivalence-question-006", 23.1), 24.6));
  const moved = time >= timeline.start("the-equivalence-question-005", 19.5);

  nodes[0].textContent = moved ? "FILTER salary > 50,000" : "PROJECT name";
  nodes[1].textContent = moved ? "PROJECT name" : "FILTER salary > 50,000";
  setStyle(nodes[1], {
    opacity: String(1 - remove),
    transform: `scale(${lerp(1, 0.92, remove)})`,
  });
  changed.classList.toggle("equivalence-question__plan-column--changed", time >= timeline.start("the-equivalence-question-007", 25.9));

  const same = comparison.querySelector(".equivalence-question__same");
  const everywhere = comparison.querySelector(".equivalence-question__everywhere");
  const mark = comparison.querySelector(".equivalence-question__question-mark");
  setStyle(same, { opacity: String(fade(time, timeline.start("the-equivalence-question-007", 25.9), 27.2)) });
  setStyle(mark, { opacity: String(fade(time, timeline.start("the-equivalence-question-008", 32.5), 33.4)) });
  setStyle(everywhere, { opacity: String(fade(time, timeline.start("the-equivalence-question-008", 32.5), 34.0)) });
}

function createQuestion() {
  const question = element("div", "equivalence-question__final");
  question.append(element("div", "equivalence-question__optimizer", "OPTIMIZER"));

  const boundary = element("div", "equivalence-question__boundary");
  boundary.append(
    createPlanColumn("PLAN A", ["PROJECT", "FILTER", "SCAN"]),
    element("div", "equivalence-question__final-question", "Do these plans mean the same thing?"),
    createPlanColumn("PLAN B", ["FILTER", "PROJECT", "SCAN"], true),
  );
  boundary.querySelectorAll(".equivalence-question__matching-result").forEach((result) => result.remove());
  question.append(boundary);
  return question;
}
