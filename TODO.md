# Project TODO

This is the living progress tracker for **Database: Zero to Distributed**.

`Roadmap.md` explains why lessons occur in their current order. `BOOK.md`
defines the standard for the written book. This file records the active
milestone, future checkpoints, and what has been verified.

Check an item only when its outcome exists in the repository and has been
verified. Add detail to the current lesson as its design becomes concrete; do
not design distant lessons prematurely.

---

# Current milestone: 006, The First Join

Lesson 006 begins from Chapter 5's one-table binding scope. It will introduce a
multiline prompt, multiple selected expressions and input tables, make
ambiguous columns visible, and execute the first logical join with a simple
nested loop. The chapter will expose the algorithm's cost without introducing
physical-plan alternatives yet.

## Chapter 6 contract

Use one query to expose the complete change:

```sql
SELECT e.name AS employee_name, d.name AS department_name
FROM employees AS e, departments AS d
WHERE e.department_id = d.id;
```

The visible result contains employee and department names from two input
tables. An unqualified `name` fails as ambiguous, while an unknown qualifier or
column still fails before execution.

## Chapter 6 teaching sequence

- [ ] Begin with the prompt's one-line restriction and collect one SQL statement
      through its terminating semicolon, using `...> ` for continuation lines
- [ ] Extend the grammar and AST from one selected expression to a comma-separated
      select list with optional output aliases
- [ ] Extend `FROM` from one table reference to a comma-separated input list
- [ ] Run a parser checkpoint that preserves every selected expression, output
      alias, table name, and input alias
- [ ] Add `departments` to the in-memory catalog and create one binding scope
      containing all query inputs
- [ ] Reject duplicate input aliases, unknown qualifiers, unknown columns, and
      ambiguous unqualified columns
- [ ] Replace bare-name bound columns with the smallest explicit identity that
      distinguishes columns belonging to different inputs
- [ ] Give every projected expression an output name, using its explicit alias
      when present and rejecting duplicate output names if they would make the
      result unclear
- [ ] Add a logical `Join` node whose two children are input plans
- [ ] Execute `Join` with two visible nested loops, combine each row pair, and
      leave the `WHERE` predicate in the existing `Filter` node
- [ ] Build and print the complete `Project -> Filter -> Join(Scan, Scan)` plan
- [ ] Run the representative query and explain why three employees and three
      departments require nine candidate row pairs before filtering
- [ ] Add concept-focused parser, binding, plan, execution, ambiguity, alias,
      multiline-input, and end-to-end tests without placing test code in the
      chapter narrative
- [ ] Update Appendix B, Appendix C if type behavior changes, `TERMS.md`, the
      contents page, chapter art sources, and the verified `lesson-006` tag

## Chapter 6 boundaries

- Use comma-separated inputs plus `WHERE`; explicit `JOIN ... ON` belongs to
  Chapter 7.
- Keep `Join` logical. Do not add `NestedLoopJoin`, `HashJoin`, or a physical
  plan yet.
- Do not optimize the nested loop or introduce join ordering.
- Continue materializing complete child results.
- Accept one semicolon-terminated statement at a time; do not build a general
  multi-statement script parser.

## Chapter 6 representation decision

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

# Planned milestone: 007, Join Syntax and Row Preservation

Chapter 7 will keep the multi-table binding and straightforward execution from
Chapter 6 while adding explicit join syntax and the rule that outer joins retain
otherwise unmatched rows.

## Chapter 7 contract

Use related inner- and outer-join queries over a small data set containing at
least one unmatched row. The output must make the difference between matched
rows and null-extended preserved rows visible.

## Chapter 7 teaching sequence

- [ ] Relate Chapter 6's comma-plus-`WHERE` inner join to `INNER JOIN ... ON`
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
      sources, and the verified `lesson-007` tag

## Chapter 7 boundaries

- Keep nested loops as the only execution method.
- Defer physical `NestedLoopJoin` and `HashJoin` alternatives to Chapter 13.
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

Lesson 003 was verified with 16 passing tests, the deterministic Ada-and-Grace
demo, and all 10 generated book pages. It closes without a standalone video
at `lesson-003` under the milestone-based companion-video strategy.

---

# Completed milestone: 004, Expressions Are Trees

Lesson 004 begins from Chapter 3's fixed four-field `Query`. It expands the
frontend so nested arithmetic, comparisons, Boolean logic, null tests,
qualified columns, and precedence survive in an expression AST. It deliberately
stops before resolving names or checking types.

Lesson 004 was verified with 8 passing tests, a deterministic AST prompt,
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
was verified with 18 passing tests, Clippy with warnings denied, the fixed
demo, prompt error recovery, the mdBook build, and the book-link verifier at
`lesson-005`.

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
- [ ] 006 — The First Join
- [ ] 007 — Join Syntax and Row Preservation
- [ ] 008 — GROUP BY and Aggregation
- [ ] 009 — Sort, DISTINCT and LIMIT
- [ ] 010 — Subqueries Are Plans Inside Plans

## Season 2 — How Query Engines Execute

- [ ] 011 — Materialize Everything
- [ ] 012 — Stop Materializing Everything
- [ ] 013 — Logical Plan vs Physical Plan

## Season 3 — Query Optimization

- [ ] 014 — The First Query Optimizer
- [ ] 015 — Statistics
- [ ] 016 — Cost
- [ ] 017 — Join Ordering

## Season 4 — Parallel Execution

- [ ] 018 — Split the Table Into Partitions
- [ ] 019 — The Plan Becomes a DAG
- [ ] 020 — Build a Scheduler

## Season 5 — Distributed Query Execution

- [ ] 021 — Our First Multi-Node Query
- [ ] 022 — Why Distributed Joins Break
- [ ] 023 — Invent Exchange
- [ ] 024 — Build a Shuffle
- [ ] 025 — Distributed Aggregation
- [ ] 026 — Distributed Hash Join
- [ ] 027 — Broadcast Join
- [ ] 028 — Distributed Physical Planning
- [ ] 029 — When Synchronous Networking Stops Scaling
- [ ] 030 — Failures Are Normal
- [ ] 031 — Lost Shuffle Data
- [ ] 032 — Data Skew
- [ ] 033 — Memory Is Finite
- [ ] 034 — Spill to Disk
- [ ] 035 — What Did We Build?

## Season 6 — Build a Storage Engine

- [ ] 036 — A Database Starts With Bytes
- [ ] 037 — Slotted Pages
- [ ] 038 — Heap Files
- [ ] 039 — The Buffer Pool
- [ ] 040 — Build a B+ Tree
- [ ] 041 — Connect Query Execution to Storage

## Season 7 — Transactions and ACID

- [ ] 042 — Break the Database
- [ ] 043 — Write-Ahead Logging
- [ ] 044 — Crash Recovery
- [ ] 045 — Concurrency Control With Locks
- [ ] 046 — Deadlocks
- [ ] 047 — MVCC
- [ ] 048 — Isolation Levels
- [ ] 049 — ACID, Finally

## Season 8 — Distributed Storage

- [ ] 050 — Replication
- [ ] 051 — Replication Lag
- [ ] 052 — The Primary Dies
- [ ] 053 — Build Raft
- [ ] 054 — Strongly Consistent Replicated Storage

## Season 9 — Sharding

- [ ] 055 — One Node Cannot Hold Everything
- [ ] 056 — Range Sharding
- [ ] 057 — Routing
- [ ] 058 — Rebalancing

## Season 10 — Distributed Transactions

- [ ] 059 — One Transaction, Two Shards
- [ ] 060 — Two-Phase Commit
- [ ] 061 — Coordinator Failure
- [ ] 062 — Distributed MVCC
- [ ] 063 — Serializable Distributed Transactions

## Season 11 — Advanced SQL and Compatibility

- [ ] 064 — Set Operations
- [ ] 065 — Common Table Expressions and Recursion
- [ ] 066 — Rich Values and Expressions
- [ ] 067 — Advanced Grouping
- [ ] 068 — Window Functions and Frames
- [ ] 069 — SQL Compatibility Checkpoint
- [ ] 070 — Identities and Authorization

## Season 12 — Bring Everything Together

- [ ] 071 — Distributed SQL Over Distributed Storage
- [ ] 072 — One SQL Query, End to End
- [ ] 073 — One Transaction, End to End
- [ ] 074 — Benchmark It
- [ ] 075 — Break Everything
- [ ] 076 — Where Real Databases Go Further

---

# Book production

- [ ] Add a series landing page and per-volume mdBook builds when Volume II manuscripts begin
- [ ] Preserve the existing root book URL while Volume I is the only published volume
- [ ] During the Volume II migration, redirect existing Volume I chapter URLs to `volume-1/`
- [ ] Share themes and reusable images across volume builds without duplicating the Rust codebase
- [ ] Keep Appendix B's checkpoint table synchronized whenever a lesson expands executable SQL
- [ ] Keep Appendix C synchronized whenever a lesson changes values, types, conversions, or operator behavior
- [ ] Complete Chapters 63–68 before claiming benchmark SQL coverage
- [ ] Complete Chapter 70 before claiming authorization support or final integration

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
