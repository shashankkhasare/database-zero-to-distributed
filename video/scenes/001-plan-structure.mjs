import { createPlanTree, planNode } from "../components/001-plan-tree.mjs";
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

export const duration = 117.175;

export function renderScene(root, requestedTime) {
  const time = clamp(requestedTime, 0, duration);
  root.replaceChildren();
  const scene = createScene({ className: "plan-structure", title: "How do we store the work and its order?", time });

  const chain = element("section", "operation-chain");
  chain.append(
    element("div", "mini-operation", time < 6.375 ? "READ ROWS" : "SCAN"),
    createArrow(),
    element("div", "mini-operation", time < 10.575 ? "KEEP ROWS" : "FILTER"),
    createArrow(),
    element("div", "mini-operation", time < 15.025 ? "KEEP COLUMNS" : "PROJECTION"),
  );
  setStyle(chain, {
    opacity: String(windowOpacity(time, 0, 1.5, 31.2, 34.0)),
    transform: `translateY(${lerp(20, 0, ease(fade(time, 0, 2.0)))}px)`,
  });
  scene.append(chain);

  const tree = createPlanTree({ formal: true, details: time >= 80.8 });
  tree.classList.add("plan-structure__tree");
  setStyle(tree, {
    opacity: String(fade(time, 31.2, 34.0) * (1 - fade(time, 109.45, 112.0))),
    transform: `rotate(${lerp(-4, 0, ease(fade(time, 31.2, 34.0)))}deg)`,
  });
  highlightPlanNode(tree, time);
  scene.append(tree);

  const vocabulary = element("section", "plan-vocabulary");
  vocabulary.append(
    element("div", "visual-label", "PLAN"),
    element("div", "vocabulary-choice", "Scan"),
    element("div", "vocabulary-choice", "Filter"),
    element("div", "vocabulary-choice", "Project"),
  );
  setStyle(vocabulary, {
    opacity: String(windowOpacity(time, 100.175, 102.0, 109.45, 111.0)),
  });
  scene.append(vocabulary);

  const question = element("div", "plan-question", "How does this description produce rows?");
  setStyle(question, {
    opacity: String(fade(time, 109.45, 112.5)),
    transform: `translateY(${lerp(20, 0, ease(fade(time, 109.45, 112.5)))}px)`,
  });
  scene.append(question);
  root.append(scene);
}

function highlightPlanNode(tree, time) {
  const windows = [
    ["scan", 86.175, 89.3],
    ["filter", 89.3, 95.675],
    ["project", 95.675, 100.175],
  ];
  for (const [name, start, end] of windows) {
    planNode(tree, name).classList.toggle("plan-node--active", time >= start && time < end);
  }
  tree.querySelectorAll(".plan-edge").forEach((edge) => {
    edge.classList.toggle("plan-edge--active", time >= 68.3 && time < 80.8);
  });
}
