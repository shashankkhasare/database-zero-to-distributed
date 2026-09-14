import { createEmployeeTable, employeeRows } from "./001-employee-table.mjs";
import { clamp, createContentStage, createScene, element, setStyle } from "./scene-utils.mjs";

const TITLES = {
  "selection-and-projection": "Selection and projection",
  "is-matching-output-enough": "One result is not enough",
  "moving-projection": "Moving projection",
  "a-useful-way-to-reason": "Two questions for every rewrite",
  "why-equivalence-matters": "Correctness before cost",
  "sql-handoff": "Where does the plan come from?",
};

export function renderLessonScene(root, requestedTime, timing, sceneId, fallbackDuration) {
  const beats = timing?.beats?.filter((beat) => beat.scene === sceneId) ?? [];
  const duration = beats.length ? beats.at(-1).end + beats.at(-1).pauseAfter - beats[0].start : fallbackDuration;
  const time = clamp(requestedTime, 0, duration);
  root.replaceChildren();
  const scene = createScene({ className: `lesson-002-scene ${sceneId}`, title: TITLES[sceneId], time });
  const stage = createContentStage("lesson-002-stage");
  setStyle(stage, { position: "absolute", top: "165px", right: "120px", bottom: "145px", left: "120px" });
  const starts = new Map(beats.map((beat) => [beat.id, beat.start - beats[0].start]));
  const at = (number, fallback) => starts.get(`${sceneId}-${String(number).padStart(3, "0")}`) ?? fallback;
  const phase = phaseFor(time, sceneId, at);
  stage.append(renderers[sceneId](phase));
  scene.append(stage);
  root.append(scene);
}

function phaseFor(time, sceneId, at) {
  const boundaries = {
    "selection-and-projection": [[10, 42.6], [18, 70.7]],
    "is-matching-output-enough": [[9, 32], [27, 106], [33, 130]],
    "moving-projection": [[12, 47], [19, 76]],
    "a-useful-way-to-reason": [[7, 31]],
    "why-equivalence-matters": [[9, 40], [14, 66]],
    "sql-handoff": [[7, 32], [12, 55]],
  }[sceneId];
  return boundaries.reduce((value, [beat, fallback]) => value + Number(time >= at(beat, fallback)), 0);
}

const renderers = {
  "selection-and-projection": renderSelection,
  "is-matching-output-enough": renderMatching,
  "moving-projection": renderMoving,
  "a-useful-way-to-reason": renderReasoning,
  "why-equivalence-matters": renderWhy,
  "sql-handoff": renderSql,
};

function renderSelection(phase) {
  if (phase === 0) return comparison([
    concept("RUST", "Filter", "keeps matching rows"),
    symbol("σ", "SELECTION", "salary > 50,000"),
    relation(employeeRows().filter((row) => row.name !== "Linus")),
  ]);
  if (phase === 1) return comparison([
    concept("RUST", "Project", "keeps requested columns"),
    symbol("π", "PROJECTION", "name"),
    relation(employeeRows().filter((row) => row.name !== "Linus"), ["name"]),
  ]);
  return comparison([
    concept("PLAIN LANGUAGE", "employees", "start with the relation"),
    symbol("σ", "SELECT ROWS", "salary > 50,000"),
    symbol("π", "SELECT COLUMNS", "name"),
    logicalPlanExpression(),
  ]);
}

function logicalPlanExpression() {
  const card = concept("LOGICAL PLAN", "", "meaning, not storage");
  const title = card.querySelector(".lesson-002-card__title");
  title.innerHTML = "&#960;<sub>name</sub> (&#963;<sub>salary &gt; 50,000</sub> (employees))";
  setStyle(title, { fontFamily: "Georgia, serif", fontSize: "29px", lineHeight: "1.5" });
  return card;
}

function renderMatching(phase) {
  const rows = phase < 2 ? employeeRows() : [...employeeRows(), { id: "4", name: "Edsger", salary: "55,000" }];
  if (phase === 3) return comparison([
    concept("COUNTEREXAMPLE", "Edsger: 55,000", "one input makes the plans disagree", "bad"),
    concept("EQUIVALENCE", "same result", "for every valid input", "good"),
  ]);
  const strict = rows.filter((row) => Number(row.salary.replace(",", "")) > 60000);
  const loose = rows.filter((row) => Number(row.salary.replace(",", "")) > 50000);
  return split(
    planPanel("PLAN A", ["FILTER > 60,000", "FILTER > 50,000", "SCAN"], strict),
    sourcePanel(rows, phase === 0
      ? "Use the same employee table"
      : phase === 1
        ? "No salary lies between 50,000 and 60,000"
        : "Add Edsger at 55,000"),
    planPanel("PLAN B", ["FILTER > 50,000", "SCAN"], loose),
  );
}

function renderMoving(phase) {
  if (phase === 0) return split(
    planPanel("ORIGINAL", ["PROJECT name", "FILTER needs salary", "SCAN id, name, salary"]),
    concept("QUESTION", "Move projection earlier?", "carry fewer columns"),
    planPanel("TEMPTING REWRITE", ["FILTER needs salary", "PROJECT name", "SCAN id, name, salary"]),
  );
  if (phase === 1) return comparison([
    planPanel("INVALID", ["FILTER needs salary", "✕ salary removed", "PROJECT keeps name"], [], "bad"),
    concept("BROKEN DEPENDENCY", "Filter asks for salary", "but salary is already gone", "bad"),
  ]);
  return split(
    planPanel("ORIGINAL", ["PROJECT name", "FILTER salary > 50,000", "SCAN id, name, salary"]),
    concept("EQUIVALENT", "same result", "needed columns survive", "good"),
    planPanel("SAFE REWRITE", ["PROJECT name", "FILTER uses salary", "PROJECT name, salary", "SCAN id, name, salary"]),
  );
}

function renderReasoning(phase) {
  if (phase === 0) {
    const layout = split(
      concept("COUNTEREXAMPLE", "Edsger splits the results", "find an input that exposes a difference", "bad"),
      concept("DEPENDENCY", "Filter needs salary", "trace what every later node reads"),
    );
    setStyle(layout, { gridTemplateColumns: "repeat(2, minmax(0, 1fr))", maxWidth: "1180px", margin: "0 auto" });
    return layout;
  }
  return comparison([
    concept("QUESTION 1", "Can any valid input make the plans disagree?", "search for a counterexample"),
    concept("QUESTION 2", "Does every later operation retain what it needs?", "trace dependencies"),
  ]);
}

function renderWhy(phase) {
  if (phase === 0) return comparison([
    planPanel("PLAN A", ["PROJECT", "FILTER", "SCAN"]),
    planPanel("PLAN B", ["FILTER", "PROJECT", "SCAN"]),
    planPanel("PLAN C", ["PROJECT", "INDEX ACCESS"]),
  ]);
  if (phase === 1) return split(
    concept("FAST BUT WRONG", "12 ms", "different rows", "bad"),
    concept("EQUIVALENCE GATE", "valid plans only", "correctness comes first", "good"),
    concept("CHEAPEST VALID PLAN", "28 ms", "same meaning", "good"),
  );
  return comparison([
    concept("THIS ENGINE", "vector rows", "simple owned data"),
    concept("OBSERVABLE", "order preserved", "rewrites must preserve it"),
    concept("OBSERVABLE", "duplicates preserved", "textbook projection removes them"),
  ]);
}

function renderSql(phase) {
  if (phase === 0) return split(
    planPanel("PLAN A", ["PROJECT", "FILTER", "SCAN"]),
    concept("ONE MEANING", "same result", "for every valid input", "good"),
    planPanel("PLAN B", ["FILTER", "PROJECT", "SCAN"]),
  );
  if (phase === 1) return split(
    concept("HAND BUILT", "nested Plan values", "the programmer constructs the tree"),
    concept("SQL", "SELECT name\nFROM employees\nWHERE salary > 50000", "the user writes a query", "good"),
    concept("LOGICAL PLAN", "Project → Filter → Scan", "the database must build this"),
  );
  return comparison([
    tokenRow(["SELECT", "name", "FROM", "employees", "WHERE", "salary", ">", "50000"]),
    concept("NEXT QUESTION", "How does SQL become a logical plan?", "SQL Is Just a Frontend"),
  ]);
}

function comparison(items) {
  const box = element("div", "lesson-002-comparison");
  items.forEach((item) => box.append(item));
  return box;
}

function split(...items) {
  const box = element("div", "lesson-002-split");
  items.forEach((item) => box.append(item));
  return box;
}

function concept(label, title, detail, state = "") {
  const card = element("section", `lesson-002-card${state ? ` lesson-002-card--${state}` : ""}`);
  card.append(element("div", "visual-label", label), element("div", "lesson-002-card__title", title), element("div", "lesson-002-card__detail", detail));
  return card;
}

function symbol(glyph, label, detail) {
  const card = concept(label, glyph, detail);
  card.classList.add("lesson-002-symbol");
  return card;
}

function relation(rows, columns = ["id", "name", "salary"]) {
  const card = concept("RELATION", "", `${rows.length} rows × ${columns.length} columns`);
  card.querySelector(".lesson-002-card__title").replaceWith(createEmployeeTable({ rows, columns, compact: true }));
  return card;
}

function sourcePanel(rows, note) {
  const card = concept("TEST INPUT", "", note);
  card.querySelector(".lesson-002-card__title").replaceWith(createEmployeeTable({ rows, compact: true }));
  return card;
}

function planPanel(label, nodes, rows = [], state = "") {
  const card = concept(label, "", rows.length ? `result: ${rows.map((row) => row.name).join(", ")}` : "");
  if (state) card.classList.add(`lesson-002-card--${state}`);
  const plan = element("div", "lesson-002-mini-plan");
  nodes.forEach((node) => plan.append(element("div", "lesson-002-mini-node", node)));
  card.querySelector(".lesson-002-card__title").replaceWith(plan);
  return card;
}

function tokenRow(tokens) {
  const card = concept("SQL CHARACTERS", "", "tokens are the next step");
  const row = element("div", "lesson-002-token-row");
  tokens.forEach((token) => row.append(element("span", "lesson-002-token", token)));
  card.querySelector(".lesson-002-card__title").replaceWith(row);
  return card;
}
