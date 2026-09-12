import { createEmployeeTable, employeeRows } from "../components/001-employee-table.mjs";
import { createPlanTree, planNode } from "../components/001-plan-tree.mjs";
import {
  clamp,
  createBadge,
  createScene,
  ease,
  element,
  fade,
  lerp,
  setStyle,
  windowOpacity,
} from "../components/scene-utils.mjs";

export const duration = 168.425;

export function renderScene(root, requestedTime) {
  const time = clamp(requestedTime, 0, duration);
  root.replaceChildren();
  const scene = createScene({ className: "execute-plan", title: "Ask the plan for its result", time });
  const rows = employeeRows();
  const tree = createPlanTree({ formal: true, details: false });
  tree.classList.add("execute-plan__tree");
  scene.append(tree);

  showRequest(tree, time);
  showRows(scene, rows, time);
  showPredicate(scene, rows, time);
  showProjection(scene, rows, time);
  showRecursion(scene, tree, time);
  showNodeJobs(scene, tree, time);
  showAnswer(scene, rows, time);
  root.append(scene);
}

function showRequest(tree, time) {
  const request = element("div", "execute-request", "execute()");
  const position = time < 25.125 ? "project" : time < 38.875 ? "filter" : "scan";
  planNode(tree, position).append(request);
  setStyle(request, { opacity: String(windowOpacity(time, 0.5, 2.0, 55.0, 56.275)) });

  const activeEdge = time < 38.875 ? "project-filter" : "filter-scan";
  tree.querySelectorAll(".plan-edge").forEach((edge) => {
    if (time >= 110.75 && time < 141.45) {
      edge.replaceChildren(
        element("span", "plan-edge__up", "↑ feeds rows"),
        element("span", "plan-edge__down", "asks child ↓"),
      );
    } else {
      edge.replaceChildren(
        element(
          "span",
          time < 56.275 ? "plan-edge__request" : "plan-edge__up",
          time < 56.275 ? "asks child ↓" : "↑ feeds rows",
        ),
      );
    }
    edge.classList.toggle("plan-edge--active", edge.dataset.edge === activeEdge && time < 56.275);
  });
}

function showRows(scene, rows, time) {
  const table = createEmployeeTable({ rows, compact: true });
  table.classList.add("execution-rows", "execution-rows--scan");
  const progress = ease(fade(time, 56.275, 60.0));
  setStyle(table, {
    opacity: String(windowOpacity(time, 56.275, 58.0, 59.0, 61.0)),
    transform: `translateY(${lerp(125, -10, progress)}px)`,
  });
  scene.append(table);
}

function showPredicate(scene, rows, time) {
  const panel = element("section", "predicate-panel");
  panel.append(element("div", "visual-label", "salary > 50000"));
  const names = [
    ["Ada", "70000 > 50000", "YES"],
    ["Linus", "50000 > 50000", "NO"],
    ["Grace", "72000 > 50000", "YES"],
  ];
  names.forEach(([name, comparison, result], index) => {
    const line = element("div", `predicate-line predicate-line--${result.toLowerCase()}`);
    line.innerHTML = `<span>${name}</span><span>${comparison}</span><strong>${result}</strong>`;
    setStyle(line, { opacity: String(fade(time, 59.375 + index * 5.0, 61.0 + index * 5.0)) });
    panel.append(line);
  });
  panel.append(createBadge("PREDICATE", "term"));
  setStyle(panel, { opacity: String(windowOpacity(time, 59.375, 61.0, 78.0, 79.825)) });
  scene.append(panel);
}

function showProjection(scene, rows, time) {
  const panel = element("section", "projection-panel");
  panel.append(
    createEmployeeTable({ rows: rows.filter((row) => row.name !== "Linus"), compact: true }),
    element("div", "projection-minus", "remove id and salary"),
    createEmployeeTable({ columns: ["name"], rows: rows.filter((row) => row.name !== "Linus"), compact: true }),
  );
  setStyle(panel, {
    opacity: String(windowOpacity(time, 79.825, 81.5, 97.8, 99.2)),
  });
  scene.append(panel);
}

function showRecursion(scene, tree, time) {
  const label = element("div", "recursion-label", "RECURSION");
  label.append(element("span", "recursion-label__detail", "the same request on a smaller plan"));
  setStyle(label, { opacity: String(windowOpacity(time, 110.75, 113.0, 139.0, 141.45)) });
  scene.append(label);
  if (time >= 110.75 && time < 141.45) {
    tree.querySelectorAll(".plan-edge").forEach((edge) => edge.classList.add("plan-edge--active"));
    planNode(tree, "scan").classList.add("plan-node--stop");
  }
}

function showNodeJobs(scene, tree, time) {
  const jobs = element("section", "node-jobs");
  jobs.append(
    element("div", "node-job", "Scan returns rows"),
    element("div", "node-job", "Filter chooses rows"),
    element("div", "node-job", "Project reshapes rows"),
  );
  setStyle(jobs, { opacity: String(windowOpacity(time, 141.45, 144.0, 160.0, 161.375)) });
  scene.append(jobs);
  setStyle(tree, { opacity: String(1 - 0.45 * fade(time, 141.45, 144.0)) });
}

function showAnswer(scene, rows, time) {
  const answer = element("section", "execution-answer");
  answer.append(
    element("div", "visual-label", "RESULT"),
    createEmployeeTable({ columns: ["name"], rows: rows.filter((row) => row.name !== "Linus") }),
  );
  setStyle(answer, {
    opacity: String(
      windowOpacity(time, 99.2, 100.2, 108.8, 110.2)
      + fade(time, 161.375, 163.0),
    ),
    transform: `translateX(${lerp(40, 0, ease(fade(time, 99.675, 102.0)))}px)`,
  });
  scene.append(answer);
}
