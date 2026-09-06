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
- [ ] Add a full `LICENSE` file
- [x] Publish Rust orientation as optional Appendix A instead of lesson 000
- [ ] Decide the repository tagging convention for completed lessons
- [ ] Define the smallest lesson directory only when lesson 001 needs it

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
- [ ] The video lesson definition is complete
- [ ] Narration and pronunciation have been reviewed
- [ ] The generated episode has been rendered and checked
- [x] Educational simplifications and tradeoffs are documented
- [ ] The completed state is tagged

These boxes describe the shared completion standard. Lesson milestone boxes
below should be checked only after this standard has been applied.

---

# Current milestone — 001: The Smallest Query Engine

## Learning outcome

- [x] State the question the lesson answers: how can we execute a query without SQL?
- [x] Show the target `Scan → Filter → Project` result before discussing architecture
- [x] Keep execution synchronous, single-threaded, and materialized

## Implementation

- [x] Initialize the smallest useful Cargo binary project
- [x] Represent a row with an intentionally simple owned value structure
- [x] Add an in-memory employees relation for the demo
- [x] Represent `Scan`, `Filter`, and `Project` directly in a plan enum
- [x] Execute the plan recursively
- [x] Support the one predicate needed by the lesson
- [x] Print deterministic result rows
- [x] Avoid custom execution traits, iterators, SQL parsing, async, and future module structure

## Tests and demo

- [x] Test that scan returns the source rows
- [x] Test that filter removes non-matching rows
- [x] Test that project keeps only requested columns
- [x] Test the complete `Scan → Filter → Project` plan
- [x] Add one deterministic demo command
- [x] Record the expected demo output
- [x] Run formatting, Clippy, and all tests

## Book chapter

- [x] Explain rows and relations using the demo data
- [x] Keep Rust instruction in Appendix A and database reasoning in the chapter
- [x] Motivate each operator from the example query
- [x] Explain why an enum makes the plan tree visible
- [x] Walk through recursive materialized execution
- [x] Explain intentional limitations
- [x] End with the relational-algebra tree recognized in lesson 002

## Video episode

- [x] Define the video source, intermediate, and final-artifact locations
- [x] Define the reusable video-pipeline execution plan
- [x] Create the minimum lesson 001 directory and source files
- [x] Define the minimum lesson metadata required by the first episode
- [x] Draft the complete scene-by-scene narration for lesson 001
- [x] Review the complete lesson 001 narration
- [x] Split narration into stable beats and generate the audio timing manifest
- [x] Compose and verify a joined lesson 001 narration review file
- [x] Review the joined narration for voice, pace, pauses, and pronunciation
- [x] Draft the reviewable scene plan for the lesson 001 core-idea prototype
- [x] Review the core-idea scene plan
- [x] Implement and render the synchronized core-idea scene prototype
- [x] Review the synchronized core-idea scene prototype
- [x] Draft the remaining lesson 001 scene plans
- [x] Implement all lesson 001 scene modules
- [x] Prefix lesson-specific scene modules with the three-digit lesson ID
- [x] Prefix lesson-specific visual components with the three-digit lesson ID
- [x] Move lesson 001 editorial checkpoints from shared scripts into its manifest
- [x] Require explicit lesson IDs in shared video commands
- [x] Render and inspect representative frames from every lesson 001 scene
- [x] Review the complete lesson 001 preview and record timestamped corrections
- [x] Add the original project ident and lesson-title opening scene
- [x] Add a lesson end card that previews the next lesson
- [x] Decide that music is limited to the opening ident and closing lesson card
- [x] Create an original opening and closing musical theme
- [x] Review the opening and closing theme in the final episode
- [x] Review the revised animated ident and next-lesson outro
- [x] Record music provenance and licensing in `ASSETS.md`
- [x] Add explicit music paths, levels, and fades to the lesson manifest
- [x] Mix and verify ident and outro music without rerendering visual frames
- [x] Review the generated lesson 001 YouTube thumbnail
- [x] Center scene compositions inside a shared title and caption-safe layout
- [x] Correct overlapping and stale visual states found in the first preview
- [x] Show plan nodes feeding rows upward without reversing their relationship
- [ ] Drive scene transitions from generated narration-beat boundaries
- [x] Split and validate captions as single-line phrase-level cues
- [x] Verify one clean command rebuilds lesson 001 from repository sources
- [ ] Commit all video sources and verify the build from a clean checkout
- [x] Pin the Kokoro model repository to an immutable revision
- [x] Bound delivery-render disk use by deleting encoded PNG sequences
- [x] Add final MP4 composition with an embedded selectable caption track
- [x] Verify the final container, streams, dimensions, frame rate, and duration
- [x] Review beat-boundary and reported-timestamp contact sheets for every scene
- [ ] Review corrected short previews for every lesson 001 scene
- [x] Create reproducible plan and row visuals
- [x] Prototype narration generation with `kokoro-js`
- [x] Verify pronunciation of all database and Rust terms in lesson 001
- [x] Render the first episode with deterministic inputs
- [x] Verify audio, captions, code, diagrams, and final encoding

---

# Curriculum milestones

## Season 1 — Build the Smallest Query Engine

- [ ] 001 — The Smallest Query Engine
- [ ] 002 — Relational Algebra Without the Math
- [ ] 003 — SQL Is Just a Frontend
- [ ] 004 — Binding and Expressions
- [ ] 005 — Joins
- [ ] 006 — GROUP BY and Aggregation
- [ ] 007 — Sort, DISTINCT and LIMIT

## Season 2 — How Query Engines Execute

- [ ] 008 — Materialize Everything
- [ ] 009 — Stop Materializing Everything
- [ ] 010 — Logical Plan vs Physical Plan

## Season 3 — Query Optimization

- [ ] 011 — The First Query Optimizer
- [ ] 012 — Statistics
- [ ] 013 — Cost
- [ ] 014 — Join Ordering

## Season 4 — Parallel Execution

- [ ] 015 — Split the Table Into Partitions
- [ ] 016 — The Plan Becomes a DAG
- [ ] 017 — Build a Scheduler

## Season 5 — Distributed Query Execution

- [ ] 018 — Our First Multi-Node Query
- [ ] 019 — Why Distributed Joins Break
- [ ] 020 — Invent Exchange
- [ ] 021 — Build a Shuffle
- [ ] 022 — Distributed Aggregation
- [ ] 023 — Distributed Hash Join
- [ ] 024 — Broadcast Join
- [ ] 025 — Distributed Physical Planning
- [ ] 026 — When Synchronous Networking Stops Scaling
- [ ] 027 — Failures Are Normal
- [ ] 028 — Lost Shuffle Data
- [ ] 029 — Data Skew
- [ ] 030 — Memory Is Finite
- [ ] 031 — Spill to Disk
- [ ] 032 — What Did We Build?

## Season 6 — Build a Storage Engine

- [ ] 033 — A Database Starts With Bytes
- [ ] 034 — Slotted Pages
- [ ] 035 — Heap Files
- [ ] 036 — The Buffer Pool
- [ ] 037 — Build a B+ Tree
- [ ] 038 — Connect Query Execution to Storage

## Season 7 — Transactions and ACID

- [ ] 039 — Break the Database
- [ ] 040 — Write-Ahead Logging
- [ ] 041 — Crash Recovery
- [ ] 042 — Concurrency Control With Locks
- [ ] 043 — Deadlocks
- [ ] 044 — MVCC
- [ ] 045 — Isolation Levels
- [ ] 046 — ACID, Finally

## Season 8 — Distributed Storage

- [ ] 047 — Replication
- [ ] 048 — Replication Lag
- [ ] 049 — The Primary Dies
- [ ] 050 — Build Raft
- [ ] 051 — Strongly Consistent Replicated Storage

## Season 9 — Sharding

- [ ] 052 — One Node Cannot Hold Everything
- [ ] 053 — Range Sharding
- [ ] 054 — Routing
- [ ] 055 — Rebalancing

## Season 10 — Distributed Transactions

- [ ] 056 — One Transaction, Two Shards
- [ ] 057 — Two-Phase Commit
- [ ] 058 — Coordinator Failure
- [ ] 059 — Distributed MVCC
- [ ] 060 — Serializable Distributed Transactions

## Season 11 — Bring Everything Together

- [ ] 061 — Distributed SQL Over Distributed Storage
- [ ] 062 — One SQL Query, End to End
- [ ] 063 — One Transaction, End to End
- [ ] 064 — Benchmark It
- [ ] 065 — Break Everything
- [ ] 066 — Where Real Databases Go Further

---

# Book production

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
- [ ] Pin the exact Kokoro model revision used for reproducible generation
- [ ] Define pronunciation overrides for technical vocabulary
- [x] Cache model assets in a documented, reproducible location
- [x] Choose Playwright as the renderer using the lesson 001 prototype
- [x] Generate initial captions from narration timing
- [ ] Compose narration, visuals, and captions with FFmpeg
- [ ] Verify final media with FFprobe
- [x] Verify identical repeated frame capture at the same scene timestamp
- [ ] Define shared title, content, and single-line caption-safe regions
- [ ] Add automatic safe-area and unexpected-overlap validation
- [ ] Derive all scene transitions from narration beats
- [x] Derive review timestamps from narration beats and editorial checkpoints
- [x] Generate per-scene contact sheets before full-frame rendering
- [x] Fingerprint scene sources, timing, dimensions, and frame rate for safe reuse
- [ ] Render independent frame ranges with parallel browser workers
- [x] Limit deterministic double capture to review checkpoints
- [ ] Support optional NVENC encoding for disposable review previews
- [ ] Document the complete non-interactive render command

---

# Release and maintenance

- [ ] Add continuous integration after the Cargo project exists
- [ ] Check formatting, Clippy, tests, demos, links, and generated artifacts in CI
- [ ] Document supported development platforms
- [ ] Publish lesson tags only from verified states
- [ ] Keep dependency versions pinned where reproducibility requires it
- [ ] Review dependency advisories before releases
- [ ] Define artifact retention for book and video builds
- [ ] Write contribution guidance after the first lesson establishes the workflow
