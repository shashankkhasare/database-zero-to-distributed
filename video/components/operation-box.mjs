export function createOperationBox({ label, detail, stage }) {
  const box = document.createElement("section");
  box.className = "operation-box";
  box.dataset.stage = stage;

  const heading = document.createElement("div");
  heading.className = "operation-box__heading";
  heading.textContent = label;

  const content = document.createElement("div");
  content.className = "operation-box__content";
  content.append(detail);

  box.append(heading, content);
  return box;
}
