import { element } from "./scene-utils.mjs";

const NODE_DATA = [
  { id: "project", name: "PROJECT", plain: "KEEP COLUMNS", detail: "columns: name" },
  { id: "filter", name: "FILTER", plain: "KEEP ROWS", detail: "salary > 50000" },
  { id: "scan", name: "SCAN", plain: "READ ROWS", detail: "rows: employees" },
];

export function createPlanTree({ formal = true, details = false } = {}) {
  const tree = element("div", "plan-tree");
  for (const [index, node] of NODE_DATA.entries()) {
    const card = element("section", "plan-node");
    card.dataset.node = node.id;
    card.append(element("div", "plan-node__name", formal ? node.name : node.plain));
    if (details) card.append(element("div", "plan-node__detail", node.detail));
    tree.append(card);
    if (index < NODE_DATA.length - 1) {
      const edge = element("div", "plan-edge", "↑ feeds rows to");
      edge.dataset.edge = `${node.id}-${NODE_DATA[index + 1].id}`;
      tree.append(edge);
    }
  }
  return tree;
}

export function planNode(tree, name) {
  return tree.querySelector(`[data-node="${name}"]`);
}
