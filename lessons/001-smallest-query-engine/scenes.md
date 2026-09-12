# Lesson 001 Scene Plan

This is the human-reviewable visual contract for Lesson 001. Stable beat IDs
come from `narration-beats.json`; measured times come from generated
`build/video/001/timing.json`. JavaScript modules under `video/scenes/` are the
executable source of truth.

## Visual rules

- Keep the employee table and the two-name result visually consistent whenever
  they return.
- Use green for rows that survive, muted red for a rejected row, and neutral
  colors for untouched data.
- Filtering must remove a row and close its vertical gap. Projection must keep
  the row count while removing columns horizontally.
- Preserve the two-name result card after its first reveal. Later scenes may
  move, shrink, or relabel it, but should not reconstruct it from scratch.
- Show the complete employee transformation only twice: once slowly in the
  opening and once through the named execution tree.
- Keep titles above the shared content stage and reserve the lower caption-safe
  region for one-line subtitles.
- Prefer one meaningful visual change per spoken idea. Hold completed results
  long enough to read.
- Do not show Rust syntax unless the repository's real code is the subject.

## Episode structure

The instructional timeline is measured after the five-second ident.

| Scene | Beat range | Instructional time | Purpose |
|---|---|---:|---|
| Question and result | `question-and-result-001..020` | 0:00-1:41.350 | Predict and visibly derive the answer |
| Core idea | `core-idea-001..017` | 1:41.350-2:56.875 | Split the work into three independent transformations |
| Rows and values | `rows-and-values-001..028` | 2:56.875-4:51.725 | Explain what moves through the operators |
| Plan structure | `plan-structure-001..026` | 4:51.725-6:48.900 | Name the operators and arrange their dependencies as a tree |
| Execute the plan | `execute-the-plan-001..043` | 6:48.900-9:37.325 | Send requests down and rows up through the tree |
| Run the query | `run-the-query-001..012` | 9:37.325-10:23.725 | Confirm the model using the real program |
| Materialized execution | `materialized-execution-001..013` | 10:23.725-11:27.625 | Expose complete intermediate collections in memory |
| Relational algebra | `relational-algebra-001..013` | 11:27.625-12:29.575 | Name the language and hand off to Lesson 002 |

## Project ident

**Duration:** 5 seconds

Assemble the original series mark and lesson title, then dissolve into the
employee table already occupying the lesson stage. The table must be present on
both sides of the transition so the ident does not feel like an unrelated clip.

## Question and result

**Beats:** `question-and-result-001..020`
**Local duration:** 101.350 seconds

### `001..004`: pose the question

Open immediately on the employee table and a small empty result card. Reveal
Ada, Linus, and Grace as their salaries are spoken. Highlight the salary column
when the question is asked, then hold while the viewer predicts the answer.

### `005..008`: check the prediction

Move Ada and Grace toward the result card one at a time. Tint Linus muted red
and leave him in the source table beside an equality marker. Emphasize `>` and
`50,000` while explaining why equality does not qualify.

### `009..014`: reveal the hidden machinery

Place the SQL beside the table without covering either object. Highlight
`name`, `employees`, and `salary > 50000` in spoken order. Briefly place a
database frame by itself, clear it completely, and hold a short empty beat
before restoring the table and SQL panel. Ask the smaller machinery question
over that stable composition; the result card remains hidden here.

### `015..020`: one slow transformation

Return focus to the source table. Fade the SQL. Tint Linus red, remove his row,
and visibly close the gap. Then fade the `id` and `salary` cells and slide the
two `name` cells into the persistent result card. Hold the completed answer.

**Transition:** keep the result card fixed at the right while three empty
operation boxes appear between the source side and result.

## Core idea

**Beats:** `core-idea-001..017`
**Local duration:** 75.525 seconds

### `001..006`: three jobs

Do not replay the data transformation. Reveal three boxes labelled `GIVE
ROWS`, `CHOOSE ROWS`, and `CHOOSE COLUMNS`. A subtle pulse crosses each
connector while the persistent result remains visible.

### `007..014`: local responsibility

Highlight one box at a time. Dim information that each box does not need, so
the division of responsibility is visible without rebuilding the rows. Enclose
the connected boxes with a quiet `QUERY ENGINE` bracket only after their
individual jobs are clear.

### `015..017`: what moves

Send one Ada row card through the connectors, stop it in the center, and gently
enlarge it while the boxes and result recede.

**Transition:** the enlarged Ada row becomes the first object in Rows and
values.

## Rows and values

**Beats:** `rows-and-values-001..028`
**Local duration:** 114.850 seconds

### `001..013`: cells and value kinds

Inspect Ada's cells in order. Connect `1` and `70,000` to `INTEGER`, and `Ada`
to `TEXT`, under one `VALUE` label. Keep these cards separate from the later row
representation so labels never overlap.

### `014..021`: names beside values

Clear the value-kind cards. Show an isolated `70,000` and ask whether it is an
ID or salary. Then rebuild the row as three explicit pairs: `id: 1`, `name:
Ada`, and `salary: 70,000`. Duplicate the column-name labels faintly to make the
intentional repetition visible.

### `022..028`: the row's abilities

Reveal `CREATE`, `FIND BY NAME`, and `KEEP COLUMNS` beside the same row. Show a
lookup selecting `salary: 70,000`, then reduce the row to `name: Ada`. End by
sending several compact row cards toward three dim operation nodes.

**Transition:** the operation nodes rotate into the vertical plan tree.

## Plan structure

**Beats:** `plan-structure-001..026`
**Local duration:** 117.175 seconds

### `001..006`: name familiar operations

Reuse the three boxes without replaying rows. Rename them `SCAN`, `FILTER`, and
`PROJECTION`. Add a small `Project` code label beneath Projection to distinguish
the concept from the Rust variant.

### `007..015`: line becomes tree

Rotate the horizontal chain into a tree with Scan at the bottom, Filter above
it, and Project at the root. Label both meanings on every connection:
`DEPENDS ON ↓` for the parent-to-child relationship and `↑ FEEDS ROWS` for data
returning toward the root. Reveal `ROOT` and `LEAF` only when those terms are
spoken.

### `016..023`: dependencies and attributes

Trace dependency lines from Project to Filter and Filter to Scan without
animating rows in the wrong direction. Open one attribute panel at a time:
employee rows for Scan, `salary > 50000` for Filter, and `name` for Project.
Show the compact `Plan` vocabulary beside the tree, not the full enum.

### `024..026`: description, not execution

Close the attribute panels and hold the inert tree. Center the question `How
does this description produce rows?`

**Transition:** attach an `execute()` request to the Project root.

## Execute the plan

**Beats:** `execute-the-plan-001..043`
**Local duration:** 168.425 seconds

This is the second and final complete data pass.

### `001..014`: request travels down

Keep the plan tree centered. Attach `execute()` to Project, then animate a
request token from Project to Filter and from Filter to Scan. Label these links
`ASKS CHILD ↓` so the request direction is explicit. Do not move employee
rows yet. Mark Scan as the stopping point
because it already owns the rows.

### `015..021`: rows return through Filter

Reverse the visual emphasis: label the upward path `FEEDS ROWS`. Move the three
rows from Scan to a predicate panel beside Filter. Test salaries one at a time;
Ada and Grace continue in green, while Linus turns red and disappears. Reveal
`PREDICATE` only after the yes-or-no behavior is visible.

### `022..029`: rows return through Project

Move the two surviving full rows upward. Keep their row positions fixed while
`id` and `salary` collapse horizontally. Clear the projection demonstration,
then settle the two names into the same result card established in the opening.
Do not show both at once.

### `030..037`: name recursion

Clear the result card. Replay only the request tokens, not the row
transformation. Highlight the same `execute()` label on progressively smaller
child plans, reveal `RECURSION`, and mark Scan as the leaf and stopping point.

### `038..043`: connect model to implementation

Align three concise statements beside the nodes: `Scan returns`, `Filter
chooses`, and `Project reshapes`. Briefly reveal the corresponding real
`execute` match arms. Restore the result only after those statements clear,
then retain it for the terminal scene.

## Run the query

**Beats:** `run-the-query-001..012`
**Local duration:** 46.400 seconds

Open a terminal beside the persistent result. Type `cargo run`, then reveal Ada
and Grace line by line from `expected-output.txt`. Connect the terminal output
to the result card so this feels like confirmation, not a third transformation.
When one million rows are mentioned, replace the small input count with
`1,000,000` and let the intermediate-buffer outlines multiply behind it.

**Transition:** keep only the growing buffer outlines.

## Materialized execution

**Beats:** `materialized-execution-001..013`
**Local duration:** 63.900 seconds

### `001..007`: complete collections

Fill one complete Scan tray before activating Filter. Fill one complete Filter
tray before activating Project. Label the trays `COMPLETE RESULT IN MEMORY`,
then name the model `MATERIALIZED EXECUTION`.

### `008..013`: scale and preview

Change `3 rows` directly to `1,000,000 rows`; do not animate hundreds of
copies. Let the memory frame expand once, then clear it before comparing
`complete list → complete list` with a future row-at-a-time model. No
materialized tray may remain behind that comparison.

**Transition:** the trays flatten into relation cards without replaying their
contents.

## Relational algebra

**Beats:** `relational-algebra-001..013`
**Local duration:** 61.950 seconds

Keep the familiar source and result still. Relabel the three moves `SCAN`,
`FILTER`, and `PROJECTION`, then group them under `RELATIONAL ALGEBRA`. Rotate
the labels into the plan tree without moving rows. End on two alternative plan
silhouettes beside the question `Can two different plans mean the same thing?`

## Lesson outro

**Duration:** 7 seconds

Transform the two plan silhouettes into the Lesson 002 card, `Relational
Algebra Without the Math`. Preserve the final question long enough to read and
fade the original musical theme cleanly.

## Review checklist

- Is the concrete table and result visible in the first twelve seconds?
- Does the opening contain the only slow table-to-result transformation?
- Does Execute the plan contain the only other complete data pass?
- Does the result card persist instead of repeatedly being reconstructed?
- Are filtering rows and projecting columns visually unmistakable?
- Do request tokens travel down while rows feed upward?
- Does every composition remain optically centered inside the content stage?
- Do transitions wait until the preceding narration beat has ended?
- Are subtitles always a single line?
- Does the final question lead naturally into Lesson 002?
