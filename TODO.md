# Project TODO

This is the living progress tracker for **Database: Zero to Distributed**.

`Roadmap.md` explains why lessons occur in their current order. `BOOK.md`
defines the standard for the written book. This file records the active
milestone, future checkpoints, and what has been verified.

Check an item only when its outcome exists in the repository and has been
verified. Add detail to the current lesson as its design becomes concrete; do
not design distant lessons prematurely.

---

# Completed milestone: 006, Multiple Outputs

Lesson 006 begins from Chapter 5's single selected expression. It lets a query
project several expressions, give those outputs deliberate names, and expand
`*` or `e.*` from the selected table's catalog schema. The binding scope remains
limited to one table: projection becomes a list of explicit or expanded
outputs.

## Chapter 6 contract

Use one query to expose the complete change:

```sql
SELECT e.name AS employee_name,
       e.salary + 1000 AS raised_salary
FROM employees AS e
WHERE e.salary > 50000;
```

The visible result contains two named values for Ada and Grace. A bare column
may retain its column name, while a computed expression can receive an output
alias. Duplicate output names fail before execution because `Row` uses names
to describe its result values.

## Chapter 6 teaching sequence

- [x] Extend the grammar and AST from one selected expression to a
      comma-separated list of expression items, `*`, and qualified wildcards,
      with optional output aliases on expressions
- [x] Run a parser checkpoint that preserves every selected expression and
      output alias or wildcard while retaining one table reference
- [x] Bind every selected expression in the existing one-table scope and
      expand wildcards in catalog column order
- [x] Validate a qualified wildcard against the table name or alias before
      expanding it
- [x] Use an explicit alias as the output name, retain a bare column's name,
      and reject duplicate output names
- [x] Let the existing `Project` node evaluate the complete expression list
- [x] Run the representative query and show its two-column result rows
- [x] Add concept-focused parser, binding, and end-to-end tests
      without placing test code in the chapter narrative
- [x] Update Appendix B, `TERMS.md`, the contents page, chapter art sources, and
      the verified `lesson-006` tag

## Chapter 6 boundaries

- Keep one table reference and the existing one-table `Scope`.
- Do not add `Join`, positional bound columns, or ambiguous-column checks.
- Do not add selected-expression aliases beyond optional `AS` and the direct
  alias form already used for table aliases.

---

# Current milestone: 007, The First Join

Lesson 007 begins from Chapter 6's one-table query with multiple outputs. It
will introduce multiple input tables, make ambiguous columns visible, and
execute the first logical join with a simple nested loop. The chapter will also
make `WHERE` optional: without it the nested loop exposes the Cartesian product,
while a predicate filters those candidate pairs into an inner join. It will
expose the algorithm's cost without introducing physical-plan alternatives.

## Chapter 7 contract

Use one query to expose the complete change:

```sql
SELECT e.name AS employee_name, d.name AS department_name
FROM employees AS e, departments AS d
WHERE e.department_id = d.id;
```

The visible result contains employee and department names from two input
tables. An unqualified `name` fails as ambiguous, while an unknown qualifier or
column still fails before execution.

## Chapter 7 teaching sequence

- [ ] Extend `FROM` from one table reference to a comma-separated input list
- [ ] Make `WHERE` optional and represent the absence of a filter explicitly
- [ ] Run a parser checkpoint that preserves every selected expression, output
      alias, table name, and input alias
- [ ] Add `departments` to the in-memory catalog and create one binding scope
      containing all query inputs
- [ ] Reject duplicate input aliases, unknown qualifiers, unknown columns, and
      ambiguous unqualified columns
- [ ] Replace bare-name bound columns with the smallest explicit identity that
      distinguishes columns belonging to different inputs
- [ ] Add a logical `Join` node whose two children are input plans
- [ ] Execute `Join` with two visible nested loops, combine each row pair, and
      place a present `WHERE` predicate in the existing `Filter` node
- [ ] Run a query without `WHERE` to expose the complete Cartesian product
- [ ] Build and print the complete `Project -> Filter -> Join(Scan, Scan)` plan
- [ ] Run the representative query and explain why three employees and three
      departments require nine candidate row pairs before filtering
- [ ] Add concept-focused parser, binding, plan, execution, ambiguity, alias,
      and end-to-end tests without placing test code in the chapter narrative
- [ ] Update Appendix B, Appendix C if type behavior changes, `TERMS.md`, the
      contents page, chapter art sources, and the verified `lesson-007` tag

## Chapter 7 boundaries

- Use comma-separated inputs with an optional `WHERE`; explicit `JOIN ... ON`
  belongs to Chapter 8.
- Keep `Join` logical. Do not add `NestedLoopJoin`, `HashJoin`, or a physical
  plan yet.
- Do not optimize the nested loop or introduce join ordering.
- Continue materializing complete child results.
- Accept one semicolon-terminated statement at a time; do not build a general
  multi-statement script parser.

## Chapter 7 representation decision

Binding will replace a column's SQL name with a **column slot**, its zero-based
position in the row produced by the join. The checked node will retain the
original column name beside that slot for readable plans and execution errors:

```text
e.name
   ↓ bind in a scope where employees starts at slot 0
BoundExpr::Column { index: 1, name: "name" }
```

Each table in the scope records the starting offset of its columns. Binding a
qualified name finds its table and adds the column's position within that table
to the table offset. Binding an unqualified name searches every visible table;
zero matches means unknown and more than one means ambiguous.

`Join` will concatenate each left row with each right row. The resulting value
order therefore matches the offsets calculated during binding:

```text
employees row                 departments row
[id, name, department_id]  +  [id, name]
                ↓ concatenate
[id, name, department_id, id, name]
  0    1          2         3    4
```

The duplicate `id` and `name` labels do not affect evaluation because bound
expressions read slots 0 through 4. `Row` will expose positional lookup and a
concatenation operation while retaining labels for display. Positional lookup
will also compare the stored label with the bound name so a catalog/row ordering
mismatch becomes an execution error instead of silently reading another value.

This is deliberately a plan-local identity, not a durable catalog identifier.
It avoids encoding aliases into hidden strings and avoids introducing a
multi-relation runtime row abstraction before another feature needs one.

---

# Planned milestone: 008, Join Syntax and Row Preservation

Chapter 8 will keep the multi-table binding and straightforward execution from
Chapter 7 while adding explicit join syntax and the rule that outer joins retain
otherwise unmatched rows.

## Chapter 8 contract

Use related inner- and outer-join queries over a small data set containing at
least one unmatched row. The output must make the difference between matched
rows and null-extended preserved rows visible.

## Chapter 8 teaching sequence

- [ ] Relate Chapter 7's comma-plus-`WHERE` inner join to `INNER JOIN ... ON`
- [ ] Extend the grammar and AST with `INNER`, `LEFT`, `RIGHT`, and `FULL JOIN`
      clauses and their `ON` expressions
- [ ] Bind an `ON` expression in the scope containing both join inputs and
      require a Boolean or `NULL` result
- [ ] Represent join kind and checked join condition in the logical `Join` node
- [ ] Implement inner join with the existing nested-loop behavior
- [ ] Implement left and right row preservation with null extension
- [ ] Implement full row preservation by tracking matches on both inputs
- [ ] Show that an `ON` condition controls matching while a later `WHERE`
      condition can still remove preserved rows
- [ ] Compare equivalent inner-join spellings and explain why the same rewrite
      does not preserve outer-join meaning
- [ ] Add concept-focused parser, binding, row-preservation, null-extension,
      and end-to-end tests without placing test code in the chapter narrative
- [ ] Update Appendix B, Appendix C, `TERMS.md`, the contents page, chapter art
      sources, and the verified `lesson-008` tag

## Chapter 8 boundaries

- Keep nested loops as the only execution method.
- Defer physical `NestedLoopJoin` and `HashJoin` alternatives to Chapter 14.
- Defer join reordering and cost-based choices to the optimizer chapters.
- Do not add natural joins, `USING`, lateral inputs, or semi/anti joins.

---

# Project foundation

The project vision, teaching constraints, curriculum, book and video workflows,
toolchains, licensing, publication model, and four-volume direction are in
place. Their authoritative descriptions live in `AGENTS.md`, `Roadmap.md`,
`BOOK.md`, `VIDEO.md`, `README.md`, and the license files.

---

# Definition of done

Apply the lesson-completion checklist in `AGENTS.md` before marking a milestone
complete or moving its `lesson-NNN` tag. Companion videos are separate
milestones; one video may synthesize several completed chapters.

---

# Completed milestone: 001, The Smallest Query Engine

Lesson 001 builds and recursively executes the visible
`Scan -> Filter -> Project` plan with simple owned rows and materialized,
single-threaded execution. The chapter, original illustrations, deterministic
demo, concept-focused tests, and reproducible video sources are complete at
`lesson-001`.

The reviewed chapter and Appendix A are published. The companion episode is
public with its final thumbnail and captions. Generated delivery files remain
reproducible through the workflow documented in `VIDEO.md`.

---

# Completed milestone: 002, Relational Algebra Without the Math

Lesson 002 uses the existing operators to explain relations, selection,
projection, plan trees, and equivalence without adding SQL parsing,
optimization, streaming execution, or new operators. Its concept-focused tests
and deterministic demo are complete at `lesson-002`.

The reviewed chapter and companion episode are public. Video source provenance
and delivery metadata remain with the lesson's video artifacts rather than in
this progress tracker.

---

# Completed milestone: 003, SQL Is Just a Frontend

Lesson 003 replaces hand-built plans with the smallest visible SQL frontend.
It accepts one deliberately narrow query shape, converts it through tokens and
an AST into the existing logical plan, and executes that plan. It does not add
binding, general expressions, joins, optimizer rules, or full SQL-89 support.

Lesson 003 was verified with 17 passing tests, the deterministic Ada-and-Grace
demo, and all 10 generated book pages. It closes without a standalone video
at `lesson-003` under the milestone-based companion-video strategy.

---

# Completed milestone: 004, Expressions Are Trees

Lesson 004 begins from Chapter 3's fixed four-field `Query`. It expands the
frontend so nested arithmetic, comparisons, Boolean logic, null tests,
qualified columns, and precedence survive in an expression AST. It deliberately
stops before resolving names or checking types.

Lesson 004 was verified with 11 passing tests, a deterministic AST prompt,
Clippy with warnings denied, the mdBook build, and the book-link verifier at
`lesson-004`.

---

# Completed milestone: 005, Binding Gives Names Meaning

Lesson 005 begins from the unresolved expression AST. It introduces the
in-memory catalog, `BoundExpr`, name resolution, type checking, SQL
three-valued evaluation, expression-based plans, and the complete
parse-bind-execute application path.

Its representative query returns Ada and Grace. Missing tables, columns,
qualifiers, and incompatible operand types fail before execution. Lesson 005
was verified with 19 passing tests, Clippy with warnings denied, the fixed
demo, multiline prompt behavior and error recovery, the mdBook build, and the
book-link verifier at `lesson-005`.

---

# Companion-video backlog

- [ ] Cover SQL, tokens, ASTs, binding, and plans in a milestone video such as
  “How SQL Becomes Rows.”

---

# Curriculum milestones

## Season 1 — Build the Smallest Query Engine

- [x] 001 — The Smallest Query Engine
- [x] 002 — Relational Algebra Without the Math
- [x] 003 — SQL Is Just a Frontend
- [x] 004 — Expressions Are Trees
- [x] 005 — Binding Gives Names Meaning
- [x] 006 — Multiple Outputs
- [ ] 007 — The First Join
- [ ] 008 — Join Syntax and Row Preservation
- [ ] 009 — GROUP BY and Aggregation
- [ ] 010 — Sort, DISTINCT and LIMIT
- [ ] 011 — Subqueries Are Plans Inside Plans

## Season 2 — How Query Engines Execute

- [ ] 012 — Materialize Everything
- [ ] 013 — Stop Materializing Everything
- [ ] 014 — Logical Plan vs Physical Plan

## Season 3 — Query Optimization

- [ ] 015 — The First Query Optimizer
- [ ] 016 — Statistics
- [ ] 017 — Cost
- [ ] 018 — Join Ordering

## Season 4 — Parallel Execution

- [ ] 019 — Split the Table Into Partitions
- [ ] 020 — The Plan Becomes a DAG
- [ ] 021 — Build a Scheduler

## Season 5 — Distributed Query Execution

- [ ] 022 — Our First Multi-Node Query
- [ ] 023 — Why Distributed Joins Break
- [ ] 024 — Invent Exchange
- [ ] 025 — Build a Shuffle
- [ ] 026 — Distributed Aggregation
- [ ] 027 — Distributed Hash Join
- [ ] 028 — Broadcast Join
- [ ] 029 — Distributed Physical Planning
- [ ] 030 — When Synchronous Networking Stops Scaling
- [ ] 031 — Failures Are Normal
- [ ] 032 — Lost Shuffle Data
- [ ] 033 — Data Skew
- [ ] 034 — Memory Is Finite
- [ ] 035 — Spill to Disk
- [ ] 036 — What Did We Build?

## Season 6 — Build a Storage Engine

- [ ] 037 — A Database Starts With Bytes
- [ ] 038 — Slotted Pages
- [ ] 039 — Heap Files
- [ ] 040 — The Buffer Pool
- [ ] 041 — Build a B+ Tree
- [ ] 042 — Connect Query Execution to Storage

## Season 7 — Transactions and ACID

- [ ] 043 — Break the Database
- [ ] 044 — Write-Ahead Logging
- [ ] 045 — Crash Recovery
- [ ] 046 — Concurrency Control With Locks
- [ ] 047 — Deadlocks
- [ ] 048 — MVCC
- [ ] 049 — Isolation Levels
- [ ] 050 — ACID, Finally

## Season 8 — Distributed Storage

- [ ] 051 — Replication
- [ ] 052 — Replication Lag
- [ ] 053 — The Primary Dies
- [ ] 054 — Build Raft
- [ ] 055 — Strongly Consistent Replicated Storage

## Season 9 — Sharding

- [ ] 056 — One Node Cannot Hold Everything
- [ ] 057 — Range Sharding
- [ ] 058 — Routing
- [ ] 059 — Rebalancing

## Season 10 — Distributed Transactions

- [ ] 060 — One Transaction, Two Shards
- [ ] 061 — Two-Phase Commit
- [ ] 062 — Coordinator Failure
- [ ] 063 — Distributed MVCC
- [ ] 064 — Serializable Distributed Transactions

## Season 11 — Advanced SQL and Compatibility

- [ ] 065 — Set Operations
- [ ] 066 — Common Table Expressions and Recursion
- [ ] 067 — Rich Values and Expressions
- [ ] 068 — Advanced Grouping
- [ ] 069 — Window Functions and Frames
- [ ] 070 — SQL Compatibility Checkpoint
- [ ] 071 — Identities and Authorization

## Season 12 — Bring Everything Together

- [ ] 072 — Distributed SQL Over Distributed Storage
- [ ] 073 — One SQL Query, End to End
- [ ] 074 — One Transaction, End to End
- [ ] 075 — Benchmark It
- [ ] 076 — Break Everything
- [ ] 077 — Where Real Databases Go Further

---

# Book production

- [ ] Add a series landing page and per-volume mdBook builds when Volume II manuscripts begin
- [ ] Preserve the existing root book URL while Volume I is the only published volume
- [ ] During the Volume II migration, redirect existing Volume I chapter URLs to `volume-1/`
- [ ] Share themes and reusable images across volume builds without duplicating the Rust codebase
- [ ] Keep Appendix B's checkpoint table synchronized whenever a lesson expands executable SQL
- [ ] Keep Appendix C synchronized whenever a lesson changes values, types, conversions, or operator behavior
- [ ] Complete Chapters 64–69 before claiming benchmark SQL coverage
- [ ] Complete Chapter 71 before claiming authorization support or final integration

- [x] Define cross-chapter continuity rules and maintain an editorial terminology ledger
- [x] Define and version an original database illustration style
- [x] Generate and review the lesson 001 opening illustration
- [x] Add the approved opening illustration and epigraph to chapter 001
- [x] Add rows, plan, execution-flow, and materialization visuals to chapter 001
- [x] Review all lesson 001 illustrations

- [x] Write and review the first chapter in plain Markdown
- [x] Add Appendix A to the roadmap and manuscript contents
- [x] Define Appendix A's reader contract and topic structure
- [x] Draft Appendix A using real code from the implemented chapters
- [x] Review Appendix A for concepts not yet used by the database
- [ ] Add links from chapters to relevant appendix sections where useful
- [ ] Define the smallest useful frontmatter and welcome section
- [ ] Write the welcome material that explains why we are building a database
- [ ] Explain how to read the book and follow the evolving repository
- [ ] Give readers a high-level map of the system without teaching future layers early
- [ ] Add welcome entries to `book/contents.md` only when their manuscripts exist
- [x] Define the guided, conversational narration style
- [x] Define the desired editorial web-book experience
- [x] Document the web-book visual and interaction direction
- [ ] Select permissively licensed serif, sans-serif, and monospace typefaces
- [ ] Define original colors, ornaments, and database-inspired visual motifs
- [ ] Prototype the season-based contents page at desktop and mobile widths
- [ ] Prototype one real chapter at desktop and mobile widths
- [ ] Include prose, Rust, SQL, output, a diagram, and an aside in the prototype
- [ ] Add previous, contents, and next chapter navigation
- [ ] Test keyboard navigation, focus visibility, contrast, and reduced motion
- [ ] Verify that prose and code remain usable with JavaScript disabled
- [ ] Evaluate HTML, EPUB, and PDF requirements using the real first chapter
- [x] Select mdBook as the first HTML book renderer
- [ ] Make code references verifiable against lesson tags
- [ ] Make diagrams reusable by the book and video pipeline where practical
- [x] Add deterministic book-build verification
- [x] Add a pinned mdBook build and GitHub Pages deployment workflow
- [x] Deploy the mdBook output publicly through GitHub Pages
- [ ] Define technical-review and copy-edit workflows
- [ ] Produce a complete draft of every implemented chapter
- [ ] Render and inspect the complete book

---

# Video pipeline

- [x] Document the shared scripts, lesson sources, and generated-artifact structure
- [x] Define the intended non-interactive video command interface
- [x] Choose browser-native HTML, CSS, SVG, and JavaScript for the first scene prototype
- [x] Implement the first reusable browser visual components and programmatic scene module
- [x] Select Playwright after testing it with the core-idea scene
- [x] Add `build/` and `dist/videos/` to `.gitignore`
- [x] Create only the shared script directories required by the first prototype
- [x] Create a small `kokoro-js` narration proof of concept
- [x] Approve `af_heart`, speed 1.0, and mono 24 kHz WAV as the initial audio settings
- [x] Pin the exact Kokoro model revision used for reproducible generation
- [x] Define pronunciation overrides for technical vocabulary
- [x] Cache model assets in a documented, reproducible location
- [x] Choose Playwright as the renderer using the lesson 001 prototype
- [x] Generate initial captions from narration timing
- [x] Compose narration, visuals, and captions with FFmpeg
- [x] Verify final media with FFprobe
- [x] Verify identical repeated frame capture at the same scene timestamp
- [x] Define shared title, content, and single-line caption-safe regions
- [ ] Add automatic safe-area and unexpected-overlap validation
- [ ] Derive all scene transitions from narration beats
- [x] Derive review timestamps from narration beats and editorial checkpoints
- [x] Generate per-scene contact sheets before full-frame rendering
- [x] Fingerprint scene sources, timing, dimensions, and frame rate for safe reuse
- [ ] Record the exact repository source commit in every published lesson manifest
- [ ] Render independent frame ranges with parallel browser workers
- [x] Limit deterministic double capture to review checkpoints
- [ ] Support optional NVENC encoding for disposable review previews
- [x] Document the complete non-interactive render command

---

# Release and maintenance

- [x] Define temporary lesson branches, forward-merged corrections, and one movable tag per lesson
- [ ] Add continuous integration after the Cargo project exists
- [ ] Check formatting, Clippy, tests, demos, links, and generated artifacts in CI
- [ ] Document supported development platforms
- [ ] Publish lesson tags only from verified states
- [ ] Keep dependency versions pinned where reproducibility requires it
- [ ] Review dependency advisories before releases
- [ ] Define artifact retention for book and video builds
- [ ] Write contribution guidance after the first lesson establishes the workflow
