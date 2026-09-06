# Lesson 001 Scene Plan

This document is the human-reviewable plan for lesson 001's visuals. Each
section is tied to stable narration beat IDs. Timing is measured from the start
of the section, so the scene can be rendered by itself during review or placed
at its generated start time in the complete episode.

The document describes what the viewer should understand and what changes on
screen. The programmatic implementation in `video/scenes/` remains the source
of truth for the rendered animation.

## Visual language

- Use a warm, quiet background with high-contrast text and restrained color.
- Give employee rows one consistent visual form wherever they reappear.
- Use color to carry meaning: neutral for untouched data, green for rows that
  continue, and muted red for a row that does not satisfy a condition.
- Prefer transformation over replacement. When data changes, let the viewer
  see what disappeared and what remained.
- Keep permanent labels short. The narration and captions provide detail.
- Reserve the lower caption-safe area for generated captions.
- Do not show Rust code unless understanding the code is the point of a scene.

## First-preview corrections

The first complete preview was reviewed at 1920 by 1080. Apply these
corrections before the next full render:

- Add a four- to six-second original project ident before the instructional
  opening and index it as a scene in `lesson.yaml`.
- End with a seven-second card naming lesson 002 and returning to the question
  posed by the final narration beat.
- Center every main composition optically inside the shared content stage,
  leaving the title and single-line caption regions clear.
- In `question-and-result`, give the employee table, SQL, database operation,
  and result separate positions. The database frame and result must not cover
  the table or query.
- In `rows-and-values`, keep the `Value`, `Integer`, and `Text` explanation
  separate from the row-representation cards. Remove earlier visual states
  before later states occupy their space.
- In `plan-structure`, show `Scan` feeding rows upward to `Filter`, then
  `Filter` feeding rows upward to `Project`. Do not use a downward `input`
  diagram that implies Project supplies data to Filter. Center the question
  `How does this description produce rows?` inside the content stage.
- In `execute-the-plan`, reserve independent space for the predicate panel and
  moving employee rows so neither can cover the other.
- In `materialized-execution`, keep the preceding visual until its narration
  ends. The million-row question begins only with its assigned narration beat.
- In every scene, inspect the reported editorial checkpoints together with the
  start and end of each narration beat before rendering the complete episode.
- Render captions as one-line phrase cues. Split a long sentence across
  multiple consecutive cues instead of wrapping it onto two lines.

## Core idea

**Narration beats:** `core-idea-001` through `core-idea-004`
**Generated episode time:** 82.225 to 139.675 seconds
**Section duration:** 57.450 seconds

### Purpose

Give the viewer a mental model of a query as several small transformations.
The scene should make three facts visible before introducing database terms:

1. rows enter a sequence of operations
2. each operation changes only one aspect of the data
3. the output of one operation becomes the input of the next

### Starting state

Continue from the previous section's employee table. The SQL text recedes and
the table moves to the left, preserving visual continuity. Three empty rounded
boxes appear to its right with space between them for connectors.

Use this source table throughout the lesson:

| id | name  | salary |
|---:|-------|-------:|
| 1  | Ada   | 70000  |
| 2  | Linus | 50000  |
| 3  | Grace | 72000  |

### Beat `core-idea-001`

**Local time:** 0.000 to 15.225 seconds, including the trailing pause

As “Forget the SQL syntax” is spoken, finish fading the SQL text and bring the
three boxes into focus from left to right. Connect them with simple horizontal
lines. Do not use the database terms scan, filter, or project yet.

Reveal one plain-language label with each description:

```text
READ ROWS  ->  KEEP MATCHING ROWS  ->  KEEP REQUESTED COLUMNS
```

Briefly brighten the corresponding box when the narration describes it. The
employee table remains beside the first box so the boxes already feel like a
path the data can follow.

**End state:** the source table and all three labeled boxes are visible.

### Beat `core-idea-002`

**Local time:** 15.225 to 35.375 seconds, including the trailing pause

This beat performs the complete transformation slowly enough to follow:

1. Move a copy of all three complete rows into `READ ROWS` and then toward
   `KEEP MATCHING ROWS`.
2. When the narration says “two complete rows,” tint Linus's row muted red,
   fade it out, and close the space it occupied. Ada and Grace remain green.
3. Move the two surviving rows toward `KEEP REQUESTED COLUMNS`.
4. When the narration says “only names,” fade the `id` and `salary` cells and
   let the `name` cells slide together into the final two-row result.

After the final result appears, highlight one box at a time as the narration
says that each performs one small transformation. A small pulse should cross
each connector to show that the result is handed to the next box.

**End state:** each box contains its own stage of the data: three full rows,
two full rows, and two name-only rows.

### Beat `core-idea-003`

**Local time:** 35.375 to 49.175 seconds, including the trailing pause

Pull back slightly so all three operations read as one connected system. As
“not one large piece of code” is spoken, keep the three separate boxes visible.
The contrast is already present in the diagram, so do not introduce a symbol
for the hypothetical large piece of code.

Draw a subtle bracket around the whole sequence and label it `QUERY ENGINE`.
Then illuminate the boxes in order to reinforce that the engine is the
connected arrangement of small operations, not any one box.

**End state:** the three transformations remain visible inside the query-engine
bracket.

### Beat `core-idea-004`

**Local time:** 49.175 to 57.450 seconds, including the trailing pause

Dim the box labels without removing the boxes. Send one representative row
from the first box across both connectors. Stop it at center screen as the
narration says “They need rows.” Enlarge the row gently while the surrounding
diagram fades back.

This is the transition into “Rows and values.” The next section should begin
from this same enlarged row rather than cutting to an unrelated diagram.

**End state:** one employee row is centered and ready to be examined cell by
cell.

### Review questions

- Is the three-step transformation understandable without database terms?
- Can the viewer follow Linus's removal without reading the captions?
- Does removing columns look different from removing a row?
- Does every visual change support the words being spoken at that moment?
- Does the final row provide a natural transition into “Rows and values”?

### Implementation notes

- Build the table and operation boxes as reusable HTML/SVG components.
- Derive the data shown in every stage from one employee-row data structure.
- Drive every state from the requested local timestamp. Do not depend on an
  animation having played from the beginning.
- Keep narration audio, generated captions, and scene artwork on separate
  layers so each can be reviewed or regenerated independently.
- Render this section first as the browser-pipeline prototype. Plan the
  remaining sections after its visual language and pacing have been reviewed.

## Question and result

**Narration beats:** `question-and-result-001` through `question-and-result-005`
**Generated episode time:** 0.000 to 82.225 seconds
**Section duration:** 82.225 seconds

### Purpose

Begin with one concrete query and let the viewer predict its result before
introducing any implementation. The table is the visual anchor for the lesson.

### Beat sequence

1. Present the employee table one row at a time while the three people and
   salaries are introduced.
2. Place the SQL beside the table. Highlight `name`, `employees`, and the salary
   condition as each phrase is spoken. Mark Ada and Grace as matches and Linus
   as an equality case that does not match.
3. Move the SQL through a quiet `DATABASE` frame and reveal the two-name result.
4. Return to the full table. Fade Linus's row, then remove the `id` and `salary`
   columns so the predicted result is produced as a visible transformation.
5. Hold the input and result together, then make room for the three operation
   boxes used by “Core idea.”

**Transition:** the SQL remains faintly visible when “Core idea” begins, while
the employee table moves to the left of the operation sequence.

## Rows and values

**Narration beats:** `rows-and-values-001` through `rows-and-values-005`
**Generated episode time:** 139.675 to 222.575 seconds
**Section duration:** 82.900 seconds

### Purpose

Move from the familiar table to the two concrete data objects the program
needs: a value for one cell and a row for one employee.

### Beat sequence

1. Continue from the enlarged Ada row. Draw guides from its cells to the
   corresponding table columns, then focus on the number `1` and text `Ada`.
2. Place `INTEGER` and `TEXT` cards beneath those cells and group them under
   the label `VALUE`.
3. Reassemble Ada's three cells into one named row. Keep each column name beside
   its value so the representation is explicit.
4. Reveal the row's three abilities one at a time: `CREATE`, `FIND A VALUE`, and
   `KEEP SELECTED COLUMNS`. Demonstrate the last ability by reducing Ada's row
   to `{ name: "Ada" }`.
5. Send several row cards toward three dim operation boxes, setting up the
   question of how those boxes and their order are stored.

**Transition:** rows remain moving at the bottom while the operation boxes
rotate into the vertical tree used by “Plan structure.”

## Plan structure

**Narration beats:** `plan-structure-001` through `plan-structure-005`
**Generated episode time:** 222.575 to 304.900 seconds
**Section duration:** 82.325 seconds

### Purpose

Turn the informal three-box picture into a named query-plan tree whose nodes
contain the information required by each operation.

### Beat sequence

1. Replay the three transformations in compact form and keep their order
   visible.
2. Replace the plain-language labels with `SCAN`, `FILTER`, and `PROJECT`, then
   rotate the horizontal chain into a tree with Scan at the bottom.
3. Open each node to reveal its attributes: employee rows in Scan, salary and
   `> 50000` in Filter, and `name` in Project.
4. Trace the child link from Project to Filter and from Filter to Scan. Place
   the compact `Plan` vocabulary beside the tree without showing full code.
5. Close the attribute panels, retain the tree, and place a question above it:
   `How does this description produce rows?`

**Transition:** the question fades as an `execute()` request appears at the
Project root.

## Execute the plan

**Narration beats:** `execute-the-plan-001` through `execute-the-plan-007`
**Generated episode time:** 304.900 to 425.700 seconds
**Section duration:** 120.800 seconds

### Purpose

Show the request moving to the Scan and rows returning through Filter and
Project. The viewer should understand the behavior before hearing “recursion.”

### Beat sequence

1. Attach `execute()` to Project. Show an empty input slot to explain why it
   must ask Filter for rows first.
2. Move the request from Project to Filter and then Scan. Stop at Scan because
   it already owns the employee rows.
3. Send the three rows from Scan to Filter. Compare each salary with `50000`,
   showing yes for Ada and Grace and no for Linus. Introduce `PREDICATE` only
   after the yes-or-no behavior is visible.
4. Send the two surviving rows to Project. Remove `id` and `salary`, leaving
   two name-only rows.
5. Replay the two child requests in a compact loop and label the repeated
   operation `RECURSION`. Keep Scan visibly marked as the stopping point.
6. Align three short behavior statements beside their nodes: Scan returns,
   Filter chooses, Project reshapes.
7. Connect the tree back to the employee data and let the two names settle into
   an output area, leading naturally into running the real program.

**Transition:** the diagram moves left and a terminal panel opens on the right.

## Run the query

**Narration beats:** `run-the-query-001` through `run-the-query-003`
**Generated episode time:** 425.700 to 471.175 seconds
**Section duration:** 45.475 seconds

### Purpose

Confirm that the repository's real program produces the result predicted by
the visual model.

### Beat sequence

1. Assemble Scan, Filter, and Project around the exact employee rows and
   condition used by the program.
2. Show `cargo run --quiet`, then reveal the stable output from
   `expected-output.txt` line by line. Connect Ada and Grace to the condition
   and the single retained column.
3. Hold the correct result, then duplicate the three-row buffer repeatedly and
   ask what changes when the table contains millions of rows.

**Transition:** the terminal recedes while the intermediate row buffers remain.

## Materialized execution

**Narration beats:** `materialized-execution-001` through
`materialized-execution-003`
**Generated episode time:** 471.175 to 521.800 seconds
**Section duration:** 50.625 seconds

### Purpose

Make the memory cost of complete intermediate results visible without solving
it yet.

### Beat sequence

1. Show Scan filling a complete three-row tray before Filter begins. Then show
   Filter filling a complete two-row tray before Project begins.
2. Label each complete tray `MATERIALIZED RESULT` and place both in a simple
   memory frame. Grow the row counts to suggest a large table without inventing
   performance measurements.
3. Preview one row moving directly from one operation to the next, then return
   to the current complete trays. End by pulling back from execution mechanics
   to the language formed by the connected operations.

**Transition:** the trays flatten into collections of rows connected by the
same Scan, Filter, and Project transformations.

## Relational algebra

**Narration beats:** `relational-algebra-001` through `relational-algebra-003`
**Generated episode time:** 521.800 to 563.925 seconds
**Section duration:** 42.125 seconds

### Purpose

Name the small transformation language the viewer has already understood and
finish with the query-plan tree that lesson 002 will examine.

### Beat sequence

1. Return to the opening table and replay the three ordinary actions: read
   rows, keep rows, and keep columns. Show one collection becoming another.
2. Replace those phrases with `SCAN`, `FILTER`, and `PROJECT`. Draw a brace
   around them and reveal `RELATIONAL ALGEBRA` only after the transformations
   are familiar.
3. Rotate the operations into the final plan tree. Highlight that it can be
   inspected, explained, and eventually rearranged. End on the tree and the
   question `What makes two plans mean the same thing?`

### Whole-episode review questions

- Does each formal term appear only after its behavior is visible?
- Do objects persist across section transitions instead of appearing from
  nowhere?
- Are filtering rows and projecting columns visually distinct every time?
- Does code appear only when it confirms the repository's real behavior?
- Does materialization look like a concrete memory cost rather than a warning
  without evidence?
- Does the final question create a clear reason to begin lesson 002?
