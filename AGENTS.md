# AGENTS.md

# Instructions for Coding Agents

This repository is an educational implementation of a distributed SQL database built from first principles in Rust.

Agents working on this repository must optimize for teaching quality, conceptual clarity, and incremental evolution.

Production-grade sophistication is not the primary objective.

---

# 0. Session bootstrap and project memory

The repository documentation is the durable memory for work that spans many AI
agent sessions.

At the beginning of a new session, read the documents relevant to the task in
this order:

1. `AGENTS.md` — non-negotiable implementation and teaching constraints
2. `TODO.md` — current progress, active milestone, and verified completion state
3. `Roadmap.md` — curriculum order and the problem each lesson should expose
4. `BOOK.md` — chapter contract, writing standards, and web-book direction
5. `VIDEO.md` — video source layout, artifact policy, and execution workflow
6. `README.md` — project vision and public overview

For a narrowly scoped task, inspect the relevant sections rather than assuming
the entire long-term architecture is already required. Before implementing a
lesson, read that lesson's roadmap section and its current checklist in
`TODO.md`.

Treat these files as distinct sources of truth:

- `AGENTS.md` governs how work is performed.
- `Roadmap.md` governs why concepts appear and in what order.
- `BOOK.md` governs how the written and web-book experience is produced.
- `VIDEO.md` governs how lesson sources become generated video artifacts.
- `TODO.md` records what has actually been completed and what is active next.
- The Rust implementation, tests, and demos remain the source of truth for
  executable behavior.

Keep the documentation synchronized when work changes project status or
teaching intent. Check a `TODO.md` item only after its outcome exists and has
been verified. Never mark future work complete based only on a plan, draft, or
partial implementation.

Before ending a substantial session:

1. update only the checklist items whose outcomes were verified
2. record any deliberate simplifications or changed decisions in the relevant
   document
3. leave the active milestone clear enough for a fresh agent to resume without
   relying on chat history
4. report validation performed and any remaining blockers

Do not use chat history as the only record of an important project decision.

---

# 1. Core principle

The most important rule is:

> Do not introduce an abstraction before the lesson needs it.

The codebase intentionally begins naive.

A later lesson may replace an earlier implementation with a better abstraction.

Do not prematurely introduce future architecture because it appears cleaner.

Examples:

If the current lesson teaches materialized execution, do not introduce Volcano iterators early.

If the current lesson teaches nested-loop joins, do not automatically replace them with hash joins.

If distributed execution has not yet been introduced, do not create distributed abstractions.

If synchronous networking still explains the concept clearly, do not introduce async Rust.

The evolution of the implementation is part of the curriculum.

---

# 2. This is a database course, not a Rust course

Rust is the implementation language.

Advanced Rust is not itself a goal.

Prefer Rust that a competent programmer can read easily, even when a more sophisticated implementation would be more idiomatic or slightly faster.

Introduce Rust concepts only when they solve a database problem encountered in the roadmap.

---

# 3. Optimize for understandability

Prefer:

```text
simple
explicit
easy to debug
easy to explain
```

over:

```text
clever
generic
highly abstract
framework-heavy
prematurely optimized
```

A developer should be able to read the implementation alongside the lesson and understand why each piece exists.

---

# 4. Avoid premature architecture

Do not create the final project layout at the beginning.

An early lesson may legitimately contain only:

```text
src/
├── main.rs
├── row.rs
└── operator.rs
```

Later lessons may introduce:

```text
sql/
logical/
optimizer/
execution/
distributed/
storage/
transaction/
```

Only create Cargo workspace crates when those boundaries have become useful.

The repository structure itself should evolve with the curriculum.

---

# 5. Avoid premature abstraction

Do not create generalized frameworks unless multiple existing features require them.

Avoid structures such as:

```text
AbstractOperatorFactoryRegistry
GenericExecutionStrategyProvider
UniversalStorageAdapter
```

unless the current architecture genuinely requires them.

Prefer concrete implementations first.

Refactor after the limitation becomes visible.

---

# 6. Prefer enums for plans and expressions

Rust enums map naturally to database intermediate representations.

Prefer structures conceptually similar to:

```rust
enum LogicalPlan {
    Scan {
        table: String,
    },

    Filter {
        predicate: Expr,
        input: Box<LogicalPlan>,
    },

    Project {
        expressions: Vec<Expr>,
        input: Box<LogicalPlan>,
    },

    Join {
        left: Box<LogicalPlan>,
        right: Box<LogicalPlan>,
        condition: Expr,
    },
}
```

Likewise, expressions may use:

```rust
enum Expr {
    Column(String),
    Literal(Value),
    Binary {
        left: Box<Expr>,
        op: BinaryOp,
        right: Box<Expr>,
    },
}
```

Do not immediately replace these representations with deeply generic trait hierarchies.

The query plan should remain visible in the type structure.

---

# 7. Introduce traits only when needed

Do not create traits merely because they may eventually be useful.

For example:

```rust
trait Operator
trait Executor
trait Planner
trait StorageBackend
```

should appear only when multiple implementations exist or a lesson specifically motivates polymorphism.

A `match` over an enum is often preferable in early lessons because the architecture is easier to see.

---

# 8. Start synchronous

Early query-engine lessons should use synchronous execution.

Expected progression:

```text
single thread
 ↓
iterators
 ↓
std::thread
 ↓
worker pool
 ↓
process boundaries
 ↓
networking
 ↓
async where justified
```

Do not introduce Tokio during early query execution.

Async Rust should appear only when handling many concurrent network operations becomes an actual problem.

---

# 9. Distinguish parallelism from async I/O

When parallel execution is introduced, begin with:

```rust
std::thread
```

The learner should first understand:

```text
parallel computation
```

before introducing:

```text
asynchronous network I/O
```

Do not hide this distinction behind an async runtime from the beginning.

---

# 10. Avoid unsafe Rust

Safe Rust is the default.

Do not introduce `unsafe` unless:

1. the lesson specifically requires something that cannot reasonably be demonstrated otherwise, and
2. the educational reason is explicitly documented.

Pages, buffer pools, indexes, WAL, and query execution should initially use safe Rust.

---

# 11. Avoid lifetime-heavy APIs

Prefer owned values or simple references where this improves clarity.

An educational representation such as:

```rust
struct Row {
    values: Vec<Value>,
}
```

may be preferable to a highly optimized borrowed tuple representation.

Do not introduce complicated lifetime relationships simply to eliminate small allocations.

Optimization should be driven by a later lesson and measurements.

---

# 12. Keep the implementation small

When adding functionality:

- minimize new concepts
- minimize dependencies
- minimize indirection
- avoid unnecessary traits
- avoid unnecessary modules
- avoid unnecessary generics

A straightforward 80-line implementation may be better than a sophisticated 300-line implementation.

---

# 13. Every lesson must have a visible outcome

A lesson should result in something runnable.

Examples:

```text
execute a filter
execute a join
print a query plan
run a distributed aggregation
kill a worker and observe retry
crash storage and recover from WAL
```

Avoid lessons that add only invisible infrastructure.

---

# 14. Tests are mandatory

Every meaningful feature must include tests.

Tests should demonstrate the concept taught by the lesson.

Prefer readable test names such as:

```text
filter_removes_non_matching_rows
hash_join_matches_rows_by_key
partial_aggregation_combines_results
transaction_recovers_after_crash
```

Avoid testing implementation details unless necessary.

---

# 15. Preserve previous lessons

New lessons should not casually break previously implemented behavior.

Before completing a task:

```text
cargo fmt --check
cargo clippy
cargo test
```

Also run the lesson demo when one exists.

If an intentional architectural change alters earlier behavior, document it clearly.

---

# 16. Rust tooling

All committed Rust code should normally pass:

```bash
cargo fmt --check
cargo clippy
cargo test
```

Use reasonable Clippy guidance.

Do not make educational code harder to understand solely to satisfy stylistic lint suggestions.

---

# 17. Error handling

Avoid meaningless `.unwrap()` calls when a failure matters to the database concept.

However, do not introduce large error-handling frameworks early.

Begin with simple project-specific errors when needed.

Example:

```rust
enum DbError {
    Io(std::io::Error),
    Parse(String),
    InvalidColumn(String),
}
```

Expand incrementally.

---

# 18. Dependencies

Prefer the Rust standard library where practical.

Before adding a crate, ask:

> Does this crate support the lesson, or does it implement the lesson for us?

Reasonable dependencies later may include:

```text
serde
clap
tracing
tokio
```

when the corresponding need actually appears.

Potentially inappropriate dependencies include libraries that already implement:

```text
query optimization
distributed scheduling
storage engines
consensus
MVCC
transaction management
```

when those are the concepts being taught.

---

# 19. SQL parsing

Do not assume a full SQL parser library is required from the beginning.

The early course may deliberately implement a tiny parser to explain:

```text
SQL
 ↓
tokens
 ↓
AST
 ↓
logical plan
```

A larger SQL parser library may be introduced later if maintaining syntax becomes a distraction from database concepts.

Do not make that choice prematurely.

---

# 20. One concept per lesson

Do not silently bundle unrelated features.

If implementing hash joins, do not also:

- introduce cost-based optimization
- redesign storage
- add distributed execution
- introduce async Rust

unless explicitly required.

---

# 21. Code shown in videos must be real

Whenever possible, code presented in lessons or videos must come directly from the repository.

Do not maintain a fake presentation-only implementation.

Examples and diagrams may simplify details, but executable code remains the source of truth.

---

# 22. Lesson structure

A lesson directory may eventually contain:

```text
lessons/NNN-title/
│
├── README.md
├── lesson.yaml
├── narration.md
├── diagrams/
├── examples/
└── expected/
```

Not every lesson needs every file.

Do not create unused structure in advance.

---

# 23. Lesson metadata

A lesson specification may eventually look conceptually like:

```yaml
id: 021
title: Build a Shuffle

goals:
  - Understand why joins require repartitioning
  - Implement hash partitioning
  - Move partitions between workers

prerequisites:
  - 020-exchange

demo:
  command: cargo run --example shuffle

scenes:
  - narration: >
      Worker one has the order, but worker seven has the customer.

    visual:
      type: diagram
      source: diagrams/missing-row-location.yaml
```

Do not over-engineer this format early.

Add fields only when the video-generation pipeline requires them.

---

# 24. Video-generation constraints

The repository is intended to support programmatic video generation.

Therefore:

- examples should produce deterministic output where possible
- plans should have stable text representations
- diagrams should be reproducible
- demos should be scriptable
- avoid manual GUI dependencies
- commands should be non-interactive where possible
- concurrency demos should stabilize ordering when ordering itself is irrelevant

---

# 25. Determinism

Keep outputs deterministic where practical.

This matters because:

- lessons may be rendered automatically
- expected outputs may be version-controlled
- diagrams may be generated from plans
- tests should produce stable demonstrations

When concurrency causes nondeterministic ordering, sort output for demos unless nondeterminism itself is the lesson.

---

# 26. Architecture direction

The long-term conceptual architecture is:

```text
SQL Frontend
    |
Logical Plan
    |
Optimizer
    |
Physical Plan
    |
Distributed Planner
    |
Execution Engine
    |
Transaction Layer
    |
Storage Engine
```

Not all layers should exist from the beginning.

Create them when the roadmap reaches the problems they solve.

---

# 27. Query operators

Expected logical concepts may eventually include:

```text
Scan
Filter
Project
Join
Aggregate
Sort
Limit
Union
Intersect
Except
```

Physical implementations may eventually include:

```text
TableScan
IndexScan
NestedLoopJoin
HashJoin
MergeJoin
HashAggregate
ExternalSort
```

Do not implement future operators unless requested by the current lesson.

---

# 28. Distributed execution

Eventually the system may contain:

```text
Query
 ↓
Stage DAG
 ↓
Tasks
 ↓
Workers
```

Distributed plan edges may represent:

```text
Pipeline
Gather
Broadcast
HashExchange
RoundRobinExchange
```

Make data movement explicit.

Do not hide shuffle behavior behind magical networking abstractions.

The learner should be able to see why rows move.

---

# 29. Storage representation

Storage should evolve roughly from:

```text
Bytes
 ↓
Pages
 ↓
Slotted Pages
 ↓
Heap Files
 ↓
Buffer Pool
 ↓
Indexes
 ↓
WAL
 ↓
Transactions
```

Prefer explicit byte-oriented representations.

For example:

```rust
const PAGE_SIZE: usize = 4096;

struct Page {
    data: [u8; PAGE_SIZE],
}
```

Do not hide page structure behind general-purpose serialization frameworks.

Students should see how bytes become records, pages, and tables.

---

# 30. Failure injection

Failures are part of the curriculum.

Where practical, support deliberate failure scenarios such as:

```text
kill worker
drop RPC
delay worker
fail disk write
crash before commit
crash after WAL flush
lose shuffle partition
```

Failure tests should be deterministic where possible.

---

# 31. Observability

Educational visibility is important.

Prefer exposing:

```text
logical plan
physical plan
stage DAG
task states
partition sizes
shuffle bytes
memory usage
spill size
WAL records
transaction state
replication state
```

Simple readable output is preferable to hiding everything in sophisticated logging infrastructure.

---

# 32. Performance

Correctness and clarity come before performance.

Optimize only when:

1. the lesson is about performance, or
2. the current implementation prevents the lesson from working.

Performance improvements should preferably be motivated by measurements.

---

# 33. Benchmark before optimizing

When demonstrating an optimization:

```text
measure baseline
 ↓
make change
 ↓
measure again
```

Keep benchmark inputs reproducible where possible.

---

# 34. Avoid unrelated refactoring

When implementing a lesson, make the smallest coherent change needed.

Do not opportunistically rewrite unrelated areas.

Large refactors make it difficult for learners to understand what changed between episodes.

---

# 35. Git history matters

The repository may use tags such as:

```text
lesson-001
lesson-002
lesson-003
```

Each tagged state should ideally:

- compile
- pass tests
- run its demo
- match the corresponding lesson

The evolution between tags is part of the learning material.

---

# 36. Comments

Use comments to explain:

```text
why
tradeoffs
intentional simplifications
```

Good:

```rust
// We intentionally materialize the entire child relation here.
// Streaming execution is introduced in lesson 009.
```

Less useful:

```rust
// Loop through rows
for row in rows {
```

---

# 37. Educational simplifications

When taking shortcuts, document them explicitly.

Example:

```text
Production systems use significantly more sophisticated
cardinality estimation. For this lesson we assume a uniform
distribution of values.
```

Never present a teaching simplification as universally correct database behavior.

---

# 38. Naming

Prefer names corresponding directly to database concepts.

Good:

```text
LogicalPlan
HashJoin
Exchange
Task
Worker
Page
BufferPool
Transaction
```

Avoid generic names such as:

```text
Manager
Processor
Handler
Helper
Util
```

unless their role is genuinely obvious.

---

# 39. Expected agent workflow

For a typical task:

```text
1. Read AGENTS.md
2. Read the relevant lesson
3. Inspect the current implementation
4. Identify the smallest required change
5. Implement it
6. Add tests
7. Add or update the executable demo
8. Run cargo fmt --check
9. Run cargo clippy
10. Run cargo test
11. Run the lesson demo
12. Report deliberate simplifications and tradeoffs
```

---

# 40. Before completing a task

Verify:

```text
[ ] Does this teach the intended database concept?
[ ] Did we introduce anything from a future lesson unnecessarily?
[ ] Is the Rust understandable?
[ ] Did we avoid unnecessary traits/generics/lifetimes?
[ ] Are tests included?
[ ] Do previous tests pass?
[ ] Is there a runnable demonstration?
[ ] Are shortcuts documented?
[ ] Did we avoid unrelated refactoring?
[ ] Is output deterministic enough for video generation?
```

---

# 41. When uncertain

Prefer the implementation that makes the database concept easier to teach.

The primary product of this repository is not the database binary.

It is the reader's mental model.
