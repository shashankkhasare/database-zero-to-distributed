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

The release audit on 2026-09-07 upgraded `yaml` to 2.9.0. The remaining npm
findings originate in `sharp` through the pinned local narration stack, have no
available upstream fix, and are accepted while the pipeline processes only
trusted repository inputs.

The isolated clean build regenerated the 575.968-second MP4 and thumbnail from
commit `e0b0878`. Both files were byte-for-byte identical to the reviewed
delivery artifacts. A new agent should follow the bootstrap order in
`AGENTS.md`, then begin milestone 002 from its roadmap entry before expanding
its checklist here.
Generated files are intentionally ignored and can be recreated with the clean
command documented in `VIDEO.md`.

---

# Current milestone: 002, Relational Algebra Without the Math

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
- [ ] Review the complete chapter for teaching flow and technical accuracy
- [x] Rebuild the revised chapter and verify links, layout, and responsive images

## Implementation and verification

- [x] Keep the production implementation unchanged
- [x] Add concept-focused equivalence and duplicate-projection tests
- [x] Run `cargo fmt --check`, `cargo clippy`, and `cargo test`
- [x] Run the deterministic demo and compare it with the expected output

## Video and publication

- [ ] Create lesson metadata only after the chapter's teaching sequence is approved
- [ ] Write and review conceptual narration derived from the chapter
- [ ] Plan and implement the minimum visual scenes needed for the lesson
- [ ] Render, review, verify, and publish the completed episode
- [ ] Tag the verified repository state as `lesson-002`

---

# Curriculum milestones

## Season 1 — Build the Smallest Query Engine

- [x] 001 — The Smallest Query Engine
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
