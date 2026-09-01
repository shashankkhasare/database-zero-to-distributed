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
- [ ] Decide whether lesson 000 will be published or remain optional reference
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
- [ ] The book chapter is complete and matches the code
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
- [x] Avoid traits, iterators, SQL parsing, async, and future module structure

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
- [x] Motivate each operator from the example query
- [x] Explain why an enum makes the plan tree visible
- [x] Walk through recursive materialized execution
- [x] Explain intentional limitations
- [x] End with the relational-algebra tree recognized in lesson 002

## Video episode

- [ ] Define the minimum lesson metadata required by the first episode
- [ ] Create reproducible plan and row visuals
- [ ] Prototype narration generation with `kokoro-js`
- [ ] Verify pronunciation of all database and Rust terms
- [ ] Render the first episode with deterministic inputs
- [ ] Verify audio, captions, code, diagrams, and final encoding

---

# Curriculum milestones

## Season 0 — Rust orientation

- [ ] 000 — Enough Rust to Build a Database

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

- [ ] Write and review the first chapter in plain Markdown
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
- [ ] Select a book renderer only after that evaluation
- [ ] Make code references verifiable against lesson tags
- [ ] Make diagrams reusable by the book and video pipeline where practical
- [ ] Add deterministic book-build verification
- [ ] Define technical-review and copy-edit workflows
- [ ] Produce a complete draft of every implemented chapter
- [ ] Render and inspect the complete book

---

# Video pipeline

- [ ] Create a small `kokoro-js` narration proof of concept
- [ ] Pin the model revision, voice, speed, and audio format
- [ ] Define pronunciation overrides for technical vocabulary
- [ ] Cache model assets in a documented, reproducible location
- [ ] Choose a renderer using the lesson 001 prototype
- [ ] Generate captions from narration timing
- [ ] Compose narration, visuals, and captions with FFmpeg
- [ ] Verify final media with FFprobe
- [ ] Make repeated renders deterministic enough for review
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
