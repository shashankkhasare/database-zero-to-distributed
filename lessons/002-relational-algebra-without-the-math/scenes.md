# Lesson 002 Scene Plan

This is the human-reviewable visual contract for Lesson 002. Stable beat IDs
come from `narration-beats.json`; measured times come from generated
`build/video/002/timing.json`. JavaScript modules under `video/scenes/` will be
the executable source of truth after this storyboard is approved.

## Visual rules

- Reuse the employee table, plan nodes, colors, typography, and spacing from
  Lesson 001 so this episode feels like the next class, not a new series.
- Use green only for a preserved result, muted red for a counterexample or an
  invalid dependency, and ochre for the operation currently under discussion.
- Keep one employee table as the stable source. Duplicate it only when two
  plans must be compared side by side.
- Distinguish a plan's shape from its meaning. Differently shaped plans may
  share one result only after equivalence has been established.
- Show relational-algebra notation beside familiar words first. Never leave a
  Greek symbol on screen without its plain-language operation.
- Treat `Project` as the Rust operation and projection as the relational idea.
  When both appear, label the distinction explicitly.
- Use plan edges without arrows when only tree structure matters. When flow or
  dependency matters, label arrows with `depends on ↓` or `↑ feeds rows`.
- Keep all principal compositions optically centered inside the content stage.
  Titles and the single-line caption region do not count toward centering.
- Clear an old comparison before introducing a new one. No plan, table, result,
  or explanatory card may overlap another state during a transition.
- Use no Rust code in the instructional scenes. This lesson is about meaning,
  not implementation syntax.

## Episode structure

The instructional timeline begins after the five-second ident.

| Scene | Beat range | Instructional time | Purpose |
|---|---|---:|---|
| The equivalence question | `the-equivalence-question-001..013` | 0:00-1:00.620 | Recover Lesson 001's result and pose the optimizer's safety question |
| Relations through the plan | `relations-through-the-plan-001..012` | 1:00.620-2:04.570 | Show that intermediate results are relations too |
| Selection and projection | `selection-and-projection-001..023` | 2:04.570-3:56.045 | Connect familiar operators to names and notation |
| Is matching output enough? | `is-matching-output-enough-001..040` | 3:56.045-6:34.240 | Use Edsger to expose a false equivalence |
| Moving projection | `moving-projection-001..029` | 6:34.240-8:38.530 | Compare an unsafe and a safe projection pushdown |
| A useful way to reason | `a-useful-way-to-reason-001..011` | 8:38.530-9:36.960 | Turn the examples into two reusable questions |
| Why equivalence matters | `why-equivalence-matters-001..018` | 9:36.960-11:14.620 | Establish equivalence as the optimizer's safety boundary |
| SQL handoff | `sql-handoff-001..015` | 11:14.620-12:28.680 | Move from hand-built plans toward SQL parsing |

## Project ident

**Duration:** 5 seconds

Reuse the series ident and theme. Replace the Lesson 001 title with
`Relational Algebra Without the Math`. Let the final ident tree dissolve into
the familiar Scan, Filter, Project tree so the first instructional frame grows
out of the series mark instead of arriving after a hard cut.

## The equivalence question

**Beats:** `the-equivalence-question-001..013`

### `001..003`: recover the known result

Begin with the Lesson 001 employee table on the left and the familiar plan in
the center. Let Ada and Grace settle into a small result relation on the right.
This is a recap, so complete it in one continuous motion rather than replaying
the full first lesson.

### `004..008`: change the plan

Return Ada and Grace to a neutral result card. Duplicate the plan, then make
small visible changes to the copy: move one node, remove one node, and alter
the tree outline. Keep both results temporarily equal. Place a quiet question
mark between `same result here` and `same query everywhere`.

### `009..013`: state the safety question

Clear the temporary edits and leave two differently shaped plans facing one
shared result. Reveal `OPTIMIZER` only when it is named. Draw a boundary around
the plans with the question `Do these plans mean the same thing?` centered
inside the content stage.

**Transition:** the two plans merge into one plan carrying relations between
its nodes.

## Relations through the plan

**Beats:** `relations-through-the-plan-001..012`

### `001..004`: one table-shaped object

Show the employee relation as a table. Briefly label its rows and columns, then
reuse the word `RELATION` from Lesson 001 without presenting it as a new term.

### `005..009`: intermediate results remain relations

Place the employee relation below Filter. Remove Linus and close the row gap.
Keep the remaining object visibly table-shaped and label it `RELATION`. Move it
through Projection, remove `id` and `salary`, and label the two-name result
`RELATION` as well. Never display all three full-size tables simultaneously;
transform one centered table in place.

### `010..012`: composition

Shrink the three table states into cards positioned between plan nodes. Use
plain connecting lines to show that one relation becomes the next operation's
input. Hold the complete composition before notation appears.

**Transition:** move the Filter and Projection nodes apart, leaving room for
their relational-algebra names and symbols.

## Selection and projection

**Beats:** `selection-and-projection-001..023`

### `001..009`: filter becomes selection

Keep a small `Filter` card visible. Place `SELECTION` beside it, then reveal
sigma only after the familiar operation is understood. Attach
`salary > 50,000` as the condition below sigma. Animate three row dots through
the predicate: two continue and one stops. When SQL's `SELECT` is mentioned,
show a separate SQL token and a warning that it is not this row-selection
operation.

### `010..017`: project becomes projection

Clear the SQL naming warning. Place `Project` beside `PROJECTION`, then reveal
pi and the subscript `name`. Use two complete surviving rows and fade their
`id` and `salary` columns without changing the row count. Hold the contrast:
`selection chooses rows` and `projection chooses columns`.

### `018..023`: one logical expression

Assemble the expression from the inside outward: employees, selection with its
salary predicate, then projection with its name subscript. Keep a matching
plain-language stack beside it. Add a small `LOGICAL PLAN` label and three
muted physical alternatives, `file`, `index`, and `memory`, outside the plan to
show what the expression does not decide.

**Transition:** remove the physical alternatives and split the logical plan
into Plan A and Plan B.

## Is matching output enough?

**Beats:** `is-matching-output-enough-001..040`

### `001..008`: one successful test

Place Plan A and Plan B side by side above one copy of the three-row employee
relation. Run both without detailed animation and show Ada and Grace beneath
each. Draw a check beside `this table`, but leave `every table` unresolved.

### `009..020`: reveal the hidden difference

Make Plan A's two filters explicit: `salary > 50,000` followed by
`salary > 60,000`. Show Plan B with only `salary > 50,000`. Highlight the empty
interval between 50,000 and 60,000 on a number line. Place the three existing
salaries outside that interval so the reason for the accidental agreement is
visible.

### `027..032`: add Edsger

Keep the original three-row relation visible while beats `021..026` establish
that the two plans merely agree on this input. Add Edsger at 55,000 only when
beat `027` says to add another employee. Send his row to both plans. Plan A
rejects it at the stricter filter; Plan B keeps it. Replace the matching result
cards with visibly different outputs and mark Edsger's row `COUNTEREXAMPLE`.

### `033..040`: strengthen the definition

Clear the detailed plans. Center two statements in sequence: `One input can
disprove equivalence` and `Equivalent plans agree for every valid input`.
Emphasize `every valid input` once, then hold it without repeated zooming.

**Transition:** the definition moves into the title region while a projection
node enters the working plan.

## Moving projection

**Beats:** `moving-projection-001..029`

### `001..011`: the tempting rewrite

Show the working plan with Projection above Filter. Move Projection below
Filter while keeping only `name`. Let `salary` visibly disappear before the
row reaches Filter. The filter asks for salary, and the missing cell creates a
small red break between the nodes. Label the plan `INVALID`, not merely slow.

### `012..018`: identify the dependency

Keep the broken plan centered. Trace an arrow from Filter to the missing salary
column labelled `needs salary`. State the rule visually: an earlier projection
must keep every column required later. Clear the broken state before trying the
safe rewrite.

### `019..029`: preserve the needed columns

Build the safe plan in the same location. The early projection now keeps
`name, salary` and removes only `id`. Let the row pass through Filter, then let
the final projection keep only `name`. Place the original and safe plan side by
side only at the end, with matching result relations and one equivalence mark
between them.

**Transition:** collapse both plans into two question cards.

## A useful way to reason

**Beats:** `a-useful-way-to-reason-001..011`

### `001..006`: recover the evidence

Show two small memories from the previous scenes: Edsger splitting the results
and salary disappearing before Filter. Do not replay either animation. Connect
the first to `Find a counterexample` and the second to `Trace what later nodes
need`.

### `007..011`: two reusable questions

Clear the memories and center two balanced cards:

1. `Can any valid input make the plans disagree?`
2. `Does every later operation retain what it needs?`

Hold both cards long enough to read. These are reasoning tools, not an
algorithm, so do not add optimizer machinery.

## Why equivalence matters

**Beats:** `why-equivalence-matters-001..018`

### `001..008`: many possible plans

Start with one logical plan and fan it into three alternatives: pushed filter,
rearranged joins as a dim future example, and index access as a physical
alternative. Use cost bars of different lengths to suggest that some choices
are cheaper. Do not crown a winner yet.

### `009..013`: correctness before cost

Place a gate labelled `EQUIVALENT` before the cost comparison. Let only valid
plans pass through it. Reject one faster but incorrect plan in muted red. Then
allow the selection algorithm to choose the cheapest plan among the remaining
valid plans.

### `014..018`: name this engine's behavior

Clear the optimizer fan. Show three compact behavior cards: `vector rows`,
`order preserved`, and `duplicates preserved`. Contrast the final card with a
small textbook-set note stating that textbook projection removes duplicates.
End on `preserve the behavior the engine exposes`.

**Transition:** the logical plan slides left and an empty SQL editor appears on
the right.

## SQL handoff

**Beats:** `sql-handoff-001..015`

### `001..006`: meaning survives shape changes

Show one logical meaning at the center with two legal plan shapes orbiting it.
Bring them back together under `same result for every valid input`. Then remove
the alternatives and keep the hand-built logical plan alone.

### `007..011`: replace manual construction

Shrink the nested plan-construction idea into a Rust-labelled card and move it
aside. Type `SELECT name FROM employees WHERE salary > 50000` into the editor.
Speak the operator as `greater than`, but retain the correct symbol on screen.
Draw a question mark between the SQL text and the logical plan.

### `012..015`: next question

Highlight `SELECT`, `FROM`, and `WHERE` in sequence. Transform the characters
into neutral token cards, stopping before any parser or syntax tree is shown.
Center the question `How does SQL become a logical plan?`

**Transition:** carry the SQL tokens into the outro.

## Lesson outro

**Duration:** 7 seconds

Let the SQL tokens settle into the series mark. Show `Next: SQL Is Just a
Frontend`, the book URL, and the repository URL using the established Lesson
001 outro layout. Use the same short closing musical theme and fade to the
background cleanly.

## Review checklist

- [x] The recap is brief and does not replay Lesson 001.
- [x] Every relation remains visibly table-shaped during transformations.
- [x] Sigma and pi appear only beside their plain-language meanings.
- [x] Plan A and Plan B agree before Edsger and disagree after he is added.
- [x] The unsafe projection visibly removes salary before Filter needs it.
- [x] The safe projection retains both name and salary until filtering ends.
- [x] The equivalence gate appears before any cost comparison.
- [x] Textbook duplicate removal is distinguished from this engine's behavior.
- [x] SQL displays `>` while narration says `greater than`.
- [x] Every principal composition is centered inside the content stage.
- [x] Captions remain within the single-line caption-safe region.
- [x] Transitions clear obsolete states before a new composition appears.
