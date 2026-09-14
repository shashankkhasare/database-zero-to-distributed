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
- [x] Add a full `LICENSE` file
- [x] Publish Rust orientation as optional Appendix A instead of lesson 000
- [x] Use one movable `lesson-NNN` tag per verified lesson while the series is in active development
- [x] Define the smallest lesson directory only when lesson 001 needs it
- [x] Define the SQL-89-inspired language boundary and map frontend constructs to lessons
- [x] Record staged TPC-H, TPC-DS, and TPC-C coverage as long-term validation targets

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
- [x] The video lesson definition is complete
- [x] Narration and pronunciation have been reviewed
- [x] The generated episode has been rendered and checked
- [x] Educational simplifications and tradeoffs are documented
- [x] The completed state is tagged

These boxes describe the shared completion standard. Lesson milestone boxes
below should be checked only after this standard has been applied.

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

Lesson 002 was built from source commit
`59ef57760a63286794e78278bfeaf93e5413246d`. The final 760.723-second video
is public as `InE6WfCcJK4`, with its custom thumbnail, serving English
captions, and public playlist placement verified on 2026-09-14.

---

# Current milestone: 003, SQL Is Just a Frontend

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
- [x] Select and verify an opening epigraph or replace the provisional line
- [x] Explain tokenization with the exact employee query
- [x] Introduce the grammar before its parser implementation
- [x] Explain the AST as a representation rather than an executable plan
- [x] Show complete, file-labelled, copy-pasteable Rust snippets
- [x] Show the complete lexer, parser checkpoint, and final REPL shell in build order
- [x] Add only diagrams that materially clarify the frontend stages
- [x] Define the minimum Chapter 3 illustration set and record reproducible prompts
- [x] Generate and review the Chapter 3 opening, tokenization, and AST-to-plan images
- [x] Place the approved images with useful alt text and captions
- [x] Add a real try-it section with verifiable exercises
- [x] Collect unsupported syntax and teaching simplifications in one section
- [x] Update `book/TERMS.md` when lexer, token, parser, grammar, and AST appear
- [ ] Review the complete chapter for continuity and non-specialist readability
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

## Video and publication

- [ ] Create Lesson 003 metadata after the chapter's teaching sequence is approved
- [ ] Write and review conceptual narration rather than reading parser code aloud
- [ ] Generate narration beats and review pronunciation at normal speed
- [ ] Plan the minimum scenes needed to show characters becoming structure
- [ ] Implement lesson-prefixed scenes and a dedicated thumbnail
- [ ] Render and review scene previews before the final frame sequence
- [ ] Build and verify the final 1080p episode with selectable captions
- [ ] Upload privately and verify processing, thumbnail, captions, and playlist placement
- [ ] Make the reviewed episode public and verify its viewer-facing state
- [ ] Record the exact source commit and tag the verified state as `lesson-003`

---

# Curriculum milestones

## Season 1 — Build the Smallest Query Engine

- [x] 001 — The Smallest Query Engine
- [x] 002 — Relational Algebra Without the Math
- [ ] 003 — SQL Is Just a Frontend
- [ ] 004 — Binding and Expressions
- [ ] 005 — Joins
- [ ] 006 — GROUP BY and Aggregation
- [ ] 007 — Sort, DISTINCT and LIMIT
- [ ] 008 — Subqueries Are Plans Inside Plans

## Season 2 — How Query Engines Execute

- [ ] 009 — Materialize Everything
- [ ] 010 — Stop Materializing Everything
- [ ] 011 — Logical Plan vs Physical Plan

## Season 3 — Query Optimization

- [ ] 012 — The First Query Optimizer
- [ ] 013 — Statistics
- [ ] 014 — Cost
- [ ] 015 — Join Ordering

## Season 4 — Parallel Execution

- [ ] 016 — Split the Table Into Partitions
- [ ] 017 — The Plan Becomes a DAG
- [ ] 018 — Build a Scheduler

## Season 5 — Distributed Query Execution

- [ ] 019 — Our First Multi-Node Query
- [ ] 020 — Why Distributed Joins Break
- [ ] 021 — Invent Exchange
- [ ] 022 — Build a Shuffle
- [ ] 023 — Distributed Aggregation
- [ ] 024 — Distributed Hash Join
- [ ] 025 — Broadcast Join
- [ ] 026 — Distributed Physical Planning
- [ ] 027 — When Synchronous Networking Stops Scaling
- [ ] 028 — Failures Are Normal
- [ ] 029 — Lost Shuffle Data
- [ ] 030 — Data Skew
- [ ] 031 — Memory Is Finite
- [ ] 032 — Spill to Disk
- [ ] 033 — What Did We Build?

## Season 6 — Build a Storage Engine

- [ ] 034 — A Database Starts With Bytes
- [ ] 035 — Slotted Pages
- [ ] 036 — Heap Files
- [ ] 037 — The Buffer Pool
- [ ] 038 — Build a B+ Tree
- [ ] 039 — Connect Query Execution to Storage

## Season 7 — Transactions and ACID

- [ ] 040 — Break the Database
- [ ] 041 — Write-Ahead Logging
- [ ] 042 — Crash Recovery
- [ ] 043 — Concurrency Control With Locks
- [ ] 044 — Deadlocks
- [ ] 045 — MVCC
- [ ] 046 — Isolation Levels
- [ ] 047 — ACID, Finally

## Season 8 — Distributed Storage

- [ ] 048 — Replication
- [ ] 049 — Replication Lag
- [ ] 050 — The Primary Dies
- [ ] 051 — Build Raft
- [ ] 052 — Strongly Consistent Replicated Storage

## Season 9 — Sharding

- [ ] 053 — One Node Cannot Hold Everything
- [ ] 054 — Range Sharding
- [ ] 055 — Routing
- [ ] 056 — Rebalancing

## Season 10 — Distributed Transactions

- [ ] 057 — One Transaction, Two Shards
- [ ] 058 — Two-Phase Commit
- [ ] 059 — Coordinator Failure
- [ ] 060 — Distributed MVCC
- [ ] 061 — Serializable Distributed Transactions

## Season 11 — Bring Everything Together

- [ ] 062 — Distributed SQL Over Distributed Storage
- [ ] 063 — One SQL Query, End to End
- [ ] 064 — One Transaction, End to End
- [ ] 065 — Benchmark It
- [ ] 066 — Break Everything
- [ ] 067 — Where Real Databases Go Further

---

# Book production

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
