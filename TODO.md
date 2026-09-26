# Project TODO

This is the living progress tracker for **Database: Zero to Distributed**.

`Roadmap.md` explains why lessons occur in their current order. `BOOK.md`
defines the standard for the written book. This file records what has actually
been completed.

Check an item only when its outcome exists in the repository and has been
verified. Add detail to the current lesson as its design becomes concrete; do
not design distant lessons prematurely.

---

# Project foundation

- [x] Write the project vision and teaching philosophy
- [x] Define the long-term curriculum roadmap
- [x] Define coding-agent teaching constraints
- [x] Establish the book as a first-class deliverable
- [x] Install and verify the Rust development toolchain
- [x] Install and verify Node.js, FFmpeg, and FFprobe
- [x] Add `kokoro-js` as the initial local narration engine
- [x] License code and code snippets under MIT, and book prose and original
  illustrations under CC BY 4.0
- [x] Publish Rust orientation as optional Appendix A instead of lesson 000
- [x] Use one movable `lesson-NNN` tag per verified lesson while the series is in active development
- [x] Define the smallest lesson directory only when lesson 001 needs it
- [x] Define the SQL-89-inspired language boundary and map frontend constructs to lessons
- [x] Record staged TPC-H, TPC-DS, and TPC-C coverage as long-term validation targets
- [x] Make the book the complete curriculum and select videos by conceptual milestone rather than chapter count
- [x] Divide the complete curriculum into four publishable volumes backed by one codebase

---

# Definition of done for every lesson

Each lesson is complete only when all applicable items are satisfied:

- [x] The lesson starts from a visible limitation or question
- [x] The smallest coherent implementation is complete
- [x] Concept-focused tests are included
- [x] Previous tests still pass
- [x] A deterministic runnable demo exists
- [x] `cargo fmt --check` passes
- [x] `cargo clippy` passes
- [x] `cargo test` passes
- [x] The book chapter is complete and matches the code
- [x] Diagrams and expected output are reproducible
- [x] Educational simplifications and tradeoffs are documented
- [x] The completed state is tagged

These boxes describe the shared completion standard. Lesson milestone boxes
below should be checked only after this standard has been applied.

Companion videos have their own milestone checklists. A lesson does not remain
incomplete merely because it has no standalone episode; one video may synthesize
several completed chapters.

---

# Completed milestone: 001, The Smallest Query Engine

Lesson 001 is implemented, reviewed, released, and publicly available. The next
curriculum step is milestone 002, Relational Algebra Without the Math.

## Learning outcome and implementation

- [x] Explain how a known query can execute without parsing SQL
- [x] Build the visible `Scan -> Filter -> Project` plan
- [x] Keep execution synchronous, single-threaded, and materialized
- [x] Represent rows with a deliberately simple owned structure
- [x] Execute the plan recursively and print deterministic results
- [x] Avoid traits, iterators, async, SQL parsing, and future architecture
- [x] Test scan, filter, project, and the complete plan
- [x] Pass formatting, Clippy, tests, and the deterministic demo

## Book

- [x] Publish the reviewed chapter and Appendix A through GitHub Pages
- [x] Explain rows, plans, recursive execution, and materialization in plain language
- [x] Document intentional limitations and lead into relational algebra
- [x] Add and review original lesson illustrations and the chapter epigraph
- [x] Verify the generated book and its internal links
- [x] Correct Rust fragment rendering, project scaffolding, executor context, and cross-chapter ordering guidance

## Video

- [x] Remove repeated full employee transformations from the revised episode
- [x] Rewrite narration into shorter TTS beats with pauses after visible results
- [x] Compare generated voices and speeds; select `af_heart` at speed `0.82`
- [x] Move the concrete table-and-result hook into the first twelve seconds
- [x] Retain one slow transformation, one named-tree execution, and one short algebra callback
- [x] Regenerate captions, render review artifacts, and inspect the revision at 1.25 times speed
- [x] Rebuild and verify the final episode before moving `lesson-001`
- [x] Review the narration, pronunciation, scene plan, and final episode
- [x] Generate narration from a pinned Kokoro model revision
- [x] Implement all declared scenes with stable lesson-prefixed modules
- [x] Add the original ident, restrained music, and next-lesson end card
- [x] Keep compositions inside shared title, content, and caption-safe regions
- [x] Generate single-line captions and embed a selectable subtitle track
- [x] Generate and review the dedicated YouTube thumbnail
- [x] Verify the final MP4 streams, dimensions, frame rate, duration, and demo output
- [x] Provide one clean command that regenerates all delivery artifacts

## Publication

- [x] Deploy the web book and add it to the GitHub About panel
- [x] Create the YouTube course playlist and record its stable ID
- [x] Define manifest-driven YouTube metadata and delivery-asset paths
- [x] Add dry-run-first OAuth, upload, and publishing-verification commands
- [x] Authorize the publisher for the channel owner account
- [x] Commit all Lesson 001 sources and release metadata
- [x] Rebuild and verify Lesson 001 from an isolated clean checkout
- [x] Review dependency advisories that affect the release
- [x] Push the verified release commit
- [x] Create and push the `lesson-001` tag
- [x] Upload the MP4 and captions to YouTube as private
- [x] Verify YouTube processing, subtitles, metadata, and playlist placement
- [x] Enable custom thumbnails for the channel and upload the lesson thumbnail
- [x] Make the video and playlist public
- [x] Mark curriculum milestone 001 complete

The release audit was repeated on 2026-09-12. The remaining npm
findings originate in `sharp` through the pinned local narration stack, have no
available upstream fix, and are accepted while the pipeline processes only
trusted repository inputs.

The revised build generated a 761.618-second, 1920 by 1080 MP4 at 29.996 FPS
with H.264 video, AAC audio, and selectable English captions. The thumbnail was
regenerated from its committed scene source. A new agent should follow the
bootstrap order in `AGENTS.md`, then begin milestone 002 from its roadmap entry
before expanding its checklist here.

### Revision 2 publication

- [x] Upload revision 2 privately as `jIuHtU4PjIs`
- [x] Attach the custom thumbnail and serving English captions
- [x] Verify successful processing and playlist placement
- [x] Review the processed upload and make it public manually
- [x] Retire public revision 1, `57IAZvOUHcg`, with the guarded command
- [x] Verify the replacement publicly and move the `lesson-001` tag

### Revision 3 outro correction

- [x] Add the book and GitHub URLs to the Lesson 001 outro
- [x] Keep configured bookend music in review previews without doubling it during final composition
- [x] Rebuild and verify the complete Lesson 001 delivery artifacts
- [x] Upload and verify the replacement privately
- [x] Make the replacement public, retire revision 2, and move `lesson-001`

The replacement is public, processed, serving English captions, and present in
the public playlist. Revisions 1 and 2 are unlisted and have no playlist
entries. The Google Cloud project is unaudited, so future uploads must still
be made public manually rather than attempting to bypass YouTube's
private-only API restriction. New work resumes at milestone 002.
Generated files are intentionally ignored and can be recreated with the clean
command documented in `VIDEO.md`.

# Completed milestone: 002, Relational Algebra Without the Math

Lesson 002 uses relational algebra to answer the question promised by the
Lesson 001 video: what makes two query plans mean the same thing? It should
strengthen the reader's mental model without adding SQL parsing, optimization,
streaming execution, or new query operators.

## Learning outcome and scope

- [x] Begin with the working employee query from Lesson 001
- [x] Build on Chapter 1's relation definition by showing that intermediate results are relations too
- [x] Connect filtering to selection and choosing columns to projection
- [x] Explain how operators compose into a tree whose leaves supply data
- [x] Trace recursive execution through the tree without reteaching Rust syntax
- [x] Name the algebra tree as a logical plan and briefly distinguish a physical plan
- [x] Define equivalent plans as plans that agree for every valid input
- [x] Explain why agreement on the three employee rows alone is not proof
- [x] Show one rearrangement that changes meaning or makes the plan invalid
- [x] Show one rearrangement that preserves meaning and explain why
- [x] Give the reader equivalence and duplicate-semantics exercises with verifiable answers
- [x] End with the need for a convenient way to write plans, motivating SQL
- [x] Avoid SQL parsing, optimizer implementation, rewrite frameworks, and new operators

## Book

- [x] Add the skeletal Chapter 2 manuscript and contents entry
- [x] Select and verify an opening epigraph
- [x] Draft the chapter in plain language before introducing formal vocabulary
- [x] Use real Lesson 001 rows, plans, code, tests, and output as evidence
- [x] Add only the diagrams needed to explain tree structure and equivalence
- [x] Decide that only concept-focused tests are needed; keep production execution unchanged
- [x] Review the complete chapter for teaching flow and technical accuracy
- [x] Rebuild the revised chapter and verify links, layout, and responsive images

## Implementation and verification

- [x] Keep the production implementation unchanged
- [x] Add concept-focused equivalence and duplicate-projection tests
- [x] Run `cargo fmt --check`, `cargo clippy`, and `cargo test`
- [x] Run the deterministic demo and compare it with the expected output

## Video and publication

- [x] Create lesson metadata after approval of the chapter's teaching sequence
- [x] Write and review conceptual narration derived from the chapter
- [x] Plan and implement the minimum visual scenes needed for the lesson
- [x] Render, review, and verify the completed episode at 1920 by 1080 and 29.996 FPS
- [x] Upload the episode privately and verify processing, captions, thumbnail, and playlist placement
- [x] Make the processed episode public and verify its viewer-facing state
- [x] Tag the verified repository state as `lesson-002`

Lesson 002 revision 2 was built from source commit
`0dac49c9df957a44a23cce405b0e453f727984e1`. The final 919.983-second,
1920 by 1080 video runs at 29.995 FPS and contains H.264 video, AAC audio,
and selectable English captions. It is public as `Xlwhbx8FMLU`, with its
custom thumbnail, serving caption track, and public playlist placement
verified on 2026-09-21. The superseded upload `InE6WfCcJK4` is unlisted and
has been removed from the course playlist.

---

# Completed milestone: 003, SQL Is Just a Frontend

Lesson 003 replaces hand-built plans with the smallest visible SQL frontend.
It accepts one deliberately narrow query shape, converts it through tokens and
an AST into the existing logical plan, and executes that plan. It does not add
binding, general expressions, joins, optimizer rules, or full SQL-89 support.

## Learning outcome and scope

- [x] Begin with Chapter 2's unanswered need for a convenient plan language
- [x] Follow one query through `SQL -> tokens -> AST -> logical plan -> rows`
- [x] Provide an interactive SQL prompt without sacrificing the deterministic demo
- [x] Explain the distinct jobs of a lexer, parser, AST, and logical plan
- [x] Define the exact grammar supported by the lesson
- [x] Accept `SELECT <column> FROM <table> WHERE <column> > <integer>;`
- [x] Reject unsupported or malformed syntax with clear, deterministic errors
- [x] Keep keywords case-insensitive while preserving identifier spelling
- [x] Translate the parsed employee query into the existing plan explicitly
- [x] Execute the SQL input and reproduce Ada and Grace
- [x] Identify binding and general expressions as deliberate future work
- [x] Avoid aliases, qualified names, Boolean expressions, joins, and subqueries

## Book

- [x] Add the Chapter 3 skeleton and contents entry
- [x] Continue directly from Chapter 2 before beginning Section 3.1
- [x] Add Appendix B as the living, implementation-backed SQL grammar reference
- [x] Audit every Appendix B grammar family and assign it to a chapter or subsystem owner
- [x] Select and verify an opening epigraph or replace the provisional line
- [x] Explain tokenization with the exact employee query
- [x] Introduce the grammar before its parser implementation
- [x] Explain the AST as a representation rather than an executable plan
- [x] Ground SQL-to-plan translation in Ceri and Gottlob's semantics-preserving treatment
- [x] Show complete, file-labelled, copy-pasteable Rust snippets
- [x] Show the complete lexer, parser checkpoint, and final REPL shell in build order
- [x] Add only diagrams that materially clarify the frontend stages
- [x] Define the minimum Chapter 3 illustration set and record reproducible prompts
- [x] Generate and review the Chapter 3 opening, tokenization, and AST-to-plan images
- [x] Place the approved images with useful alt text and captions
- [x] Add a real try-it section with verifiable exercises
- [x] Collect unsupported syntax and teaching simplifications in one section
- [x] Update `book/TERMS.md` when lexer, token, parser, grammar, and AST appear
- [x] Review the complete chapter for continuity and non-specialist readability
- [x] Build the web book and verify links, code rendering, and responsive layout

## Implementation and verification

- [x] Add the smallest token enum required by the supported grammar
- [x] Implement deterministic tokenization without a parser dependency
- [x] Add readable lexer tests, including whitespace and keyword case
- [x] Add a small AST that represents only the supported query shape
- [x] Implement parsing with explicit end-of-input and syntax errors
- [x] Add parser tests for the valid query and representative invalid inputs
- [x] Convert the AST into the existing `Plan` without redesigning the executor
- [x] Add an end-to-end test from SQL text to result rows
- [x] Update the executable demo and expected output
- [x] Route the fixed demonstration and repeated prompt queries through one SQL entry point
- [x] Run `cargo fmt --check`, `cargo clippy`, and `cargo test`
- [x] Run the deterministic demo and compare its output with the lesson artifact

## Checkpoint and companion-video coverage

- [x] Approve the Chapter 3 teaching sequence through a complete reader build-along
- [x] Decide that Chapter 3 does not require a standalone episode
- [ ] Cover SQL, tokens, ASTs, binding, and plans in a later milestone video such as “How SQL Becomes Rows”
- [x] Record verified source commit `b57026e01c0a9824a11a523895cbab99deb98133` and tag the completed state as `lesson-003`

Lesson 003 was verified with 16 passing tests, the deterministic Ada-and-Grace
demo, and all 10 generated book pages. It closes without a standalone video
under the milestone-based companion-video strategy.

---

# Completed milestone: 004, Expressions Are Trees

Lesson 004 begins from Chapter 3's fixed four-field `Query`. It expands the
frontend so nested arithmetic, comparisons, Boolean logic, null tests,
qualified columns, and precedence survive in an expression AST. It deliberately
stops before resolving names or checking types.

## Chapter contract

Begin with the richer request that Chapter 3's flat fields cannot represent:

```sql
SELECT e.name
FROM employees AS e
WHERE e.salary + 5000 > 70000 AND e.name IS NOT NULL;
```

Replace the filter's special-purpose column and integer fields with a small
expression tree. Preserve the richer structure without claiming that parsed
names or operand types are valid.

This chapter owns the syntax and AST foundation promised by Appendix B:

- qualified and unqualified column references
- table aliases using optional `AS`
- integer, text, and `NULL` literals
- unary `+`, unary `-`, and `NOT`
- arithmetic `+`, `-`, `*`, and `/`
- comparisons `=`, `<>`, `<`, `<=`, `>`, and `>=`
- `AND` and `OR`
- `IS NULL` and `IS NOT NULL`
- parentheses and explicit precedence

Defer `BETWEEN`, `LIKE`, `IN`, function calls, `CASE`, `CAST`, dates,
intervals, and windows to their assigned later chapters. Do not introduce a
general optimizer, physical-plan split, or storage catalog.

## Planned teaching sequence

1. Show why Chapter 3's flat query fields stop working.
2. Extend `Value` with the values required by expressions.
3. Extend the lexer token set for the expanded grammar.
4. Define expression operators and the unresolved AST.
5. Parse columns, literals, and precedence in stages.
6. Run an AST checkpoint that exposes the complete query shape.
7. State the deliberate syntax and representation limitations.
8. Provide precedence and unresolved-name experiments with answers.
9. Lead from preserved structure into binding.

## Visible outcome and verification

- [x] Operator precedence is visible in the parsed expression tree
- [x] The Chapter 4 grammar is shown beside the parser stages
- [x] The complete query AST makes expression precedence visible
- [x] Boolean, null, string, arithmetic, comparison, and qualified-column forms are represented
- [x] The Chapter 4 AST illustration is generated, reviewed, and embedded
- [x] Chapter snippets are copy-pasteable from the `lesson-003` checkpoint
- [x] Create and verify the standalone `lesson-004` AST checkpoint

Lesson 004 was verified with 8 passing tests, a deterministic AST prompt,
Clippy with warnings denied, the mdBook build, and the book-link verifier.

---

# Next milestone: 005, Binding Gives Names Meaning

Lesson 005 begins from the unresolved expression AST. It introduces the
in-memory catalog, `BoundExpr`, name resolution, type checking, SQL
three-valued evaluation, expression-based plans, and the complete
parse-bind-execute application path.

Its representative query will return Ada and Grace. Missing tables, columns,
qualifiers, and incompatible operand types must fail before execution. The
Chapter 5 build-along, implementation, tests, and `lesson-005` checkpoint
remain to be completed.

---

# Curriculum milestones

## Season 1 — Build the Smallest Query Engine

- [x] 001 — The Smallest Query Engine
- [x] 002 — Relational Algebra Without the Math
- [x] 003 — SQL Is Just a Frontend
- [x] 004 — Expressions Are Trees
- [ ] 005 — Binding Gives Names Meaning
- [ ] 006 — Joins
- [ ] 007 — GROUP BY and Aggregation
- [ ] 008 — Sort, DISTINCT and LIMIT
- [ ] 009 — Subqueries Are Plans Inside Plans

## Season 2 — How Query Engines Execute

- [ ] 010 — Materialize Everything
- [ ] 011 — Stop Materializing Everything
- [ ] 012 — Logical Plan vs Physical Plan

## Season 3 — Query Optimization

- [ ] 013 — The First Query Optimizer
- [ ] 014 — Statistics
- [ ] 015 — Cost
- [ ] 016 — Join Ordering

## Season 4 — Parallel Execution

- [ ] 017 — Split the Table Into Partitions
- [ ] 018 — The Plan Becomes a DAG
- [ ] 019 — Build a Scheduler

## Season 5 — Distributed Query Execution

- [ ] 020 — Our First Multi-Node Query
- [ ] 021 — Why Distributed Joins Break
- [ ] 022 — Invent Exchange
- [ ] 023 — Build a Shuffle
- [ ] 024 — Distributed Aggregation
- [ ] 025 — Distributed Hash Join
- [ ] 026 — Broadcast Join
- [ ] 027 — Distributed Physical Planning
- [ ] 028 — When Synchronous Networking Stops Scaling
- [ ] 029 — Failures Are Normal
- [ ] 030 — Lost Shuffle Data
- [ ] 031 — Data Skew
- [ ] 032 — Memory Is Finite
- [ ] 033 — Spill to Disk
- [ ] 034 — What Did We Build?

## Season 6 — Build a Storage Engine

- [ ] 035 — A Database Starts With Bytes
- [ ] 036 — Slotted Pages
- [ ] 037 — Heap Files
- [ ] 038 — The Buffer Pool
- [ ] 039 — Build a B+ Tree
- [ ] 040 — Connect Query Execution to Storage

## Season 7 — Transactions and ACID

- [ ] 041 — Break the Database
- [ ] 042 — Write-Ahead Logging
- [ ] 043 — Crash Recovery
- [ ] 044 — Concurrency Control With Locks
- [ ] 045 — Deadlocks
- [ ] 046 — MVCC
- [ ] 047 — Isolation Levels
- [ ] 048 — ACID, Finally

## Season 8 — Distributed Storage

- [ ] 049 — Replication
- [ ] 050 — Replication Lag
- [ ] 051 — The Primary Dies
- [ ] 052 — Build Raft
- [ ] 053 — Strongly Consistent Replicated Storage

## Season 9 — Sharding

- [ ] 054 — One Node Cannot Hold Everything
- [ ] 055 — Range Sharding
- [ ] 056 — Routing
- [ ] 057 — Rebalancing

## Season 10 — Distributed Transactions

- [ ] 058 — One Transaction, Two Shards
- [ ] 059 — Two-Phase Commit
- [ ] 060 — Coordinator Failure
- [ ] 061 — Distributed MVCC
- [ ] 062 — Serializable Distributed Transactions

## Season 11 — Advanced SQL and Compatibility

- [ ] 063 — Set Operations
- [ ] 064 — Common Table Expressions and Recursion
- [ ] 065 — Rich Values and Expressions
- [ ] 066 — Advanced Grouping
- [ ] 067 — Window Functions and Frames
- [ ] 068 — SQL Compatibility Checkpoint
- [ ] 069 — Identities and Authorization

## Season 12 — Bring Everything Together

- [ ] 070 — Distributed SQL Over Distributed Storage
- [ ] 071 — One SQL Query, End to End
- [ ] 072 — One Transaction, End to End
- [ ] 073 — Benchmark It
- [ ] 074 — Break Everything
- [ ] 075 — Where Real Databases Go Further

---

# Book production

- [ ] Add a series landing page and per-volume mdBook builds when Volume II manuscripts begin
- [ ] Preserve the existing root book URL while Volume I is the only published volume
- [ ] During the Volume II migration, redirect existing Volume I chapter URLs to `volume-1/`
- [ ] Share themes and reusable images across volume builds without duplicating the Rust codebase
- [ ] Keep Appendix B's checkpoint table synchronized whenever a lesson expands executable SQL
- [ ] Complete Chapters 62–67 before claiming benchmark SQL coverage
- [ ] Complete Chapter 69 before claiming authorization support or final integration

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
