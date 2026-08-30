# AGENTS.md

# Instructions for Coding Agents

This repository is an educational implementation of a distributed SQL database built from first principles.

Agents working on this repository must optimize for teaching quality, conceptual clarity, and incremental evolution.

Production-grade sophistication is not the primary objective.

---

# 1. Core principle

The most important rule is:

> Do not introduce an abstraction before the lesson needs it.

The codebase intentionally begins naive.

A later lesson may replace an earlier implementation with a better abstraction.

Do not prematurely introduce future architecture because it appears cleaner.

For example:

If the current lesson teaches materialized execution, do not introduce Volcano iterators early.

If the current lesson teaches nested-loop joins, do not automatically replace them with hash joins.

If distributed execution has not yet been introduced, do not create distributed abstractions.

The evolution of the implementation is part of the curriculum.

---

# 2. Optimize for understandability

Prefer:

```text
simple
explicit
verbose enough to understand
easy to debug
```

over:

```text
clever
generic
abstract
highly optimized
framework-heavy
```

A developer should be able to read the implementation alongside the lesson and understand why each piece exists.

---

# 3. Avoid premature abstraction

Do not create generalized frameworks unless multiple lessons already require them.

Avoid patterns such as:

```text
AbstractOperatorFactoryRegistry
GenericExecutionStrategyProvider
UniversalStorageAdapter
```

unless the current architecture genuinely requires them.

Prefer concrete code first.

Refactor only after duplication or complexity becomes educationally relevant.

---

# 4. Keep the implementation small

When adding functionality:

- minimize new concepts
- minimize dependencies
- minimize indirection
- avoid unnecessary classes
- avoid unnecessary interfaces

A simple 80-line implementation is often better than a sophisticated 300-line implementation.

---

# 5. Every lesson must have a visible outcome

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

# 6. Tests are mandatory

Every meaningful feature must include tests.

Tests should demonstrate the concept taught by the lesson.

Prefer tests that are readable enough to appear in teaching material.

For example:

```text
test_filter_removes_non_matching_rows
test_hash_join_matches_rows_by_key
test_partial_aggregation_combines_correctly
test_transaction_recovers_after_crash
```

Avoid testing implementation details unless necessary.

---

# 7. Preserve previous lessons

New lessons should not casually break previously implemented behavior.

Before completing a task:

```text
run existing tests
run new tests
run the lesson demo
```

If an intentional architectural change alters prior behavior, document it clearly.

---

# 8. One concept per lesson

Do not silently bundle unrelated features.

For example, if implementing hash joins, do not also:

- add cost-based optimization
- introduce new storage APIs
- redesign expression evaluation
- add distributed execution

unless explicitly required by the lesson.

---

# 9. Code shown in videos must be real

Whenever possible, code presented in lessons or videos must come from the repository itself.

Do not maintain a separate fake implementation solely for presentation.

Examples and diagrams may simplify details, but executable code must remain the source of truth.

---

# 10. Lesson structure

Each lesson directory may contain:

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

---

# 11. Lesson metadata

A lesson specification should eventually support something conceptually similar to:

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
  command: ./run-demo.sh

scenes:
  - narration: >
      Worker one has the order, but worker seven has the customer.

    visual:
      type: diagram
      source: diagrams/missing-row-location.yaml
```

Do not over-engineer this format early.

Add fields only when the video pipeline needs them.

---

# 12. Video-generation constraints

The repository may be used to programmatically generate tutorial videos.

Therefore:

- examples should produce deterministic output where possible
- plans should have stable text representations
- diagrams should be reproducible
- demos should be scriptable
- avoid relying on manual GUI interactions
- commands should be executable non-interactively where possible

---

# 13. Architecture boundaries

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

However, not all these layers should exist from the beginning.

Create them incrementally as required by the roadmap.

---

# 14. Query operators

Expected logical concepts eventually include:

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

Expected physical implementations may eventually include:

```text
TableScan
IndexScan
NestedLoopJoin
HashJoin
MergeJoin
HashAggregate
SortAggregate
ExternalSort
```

Do not implement future operators unless requested.

---

# 15. Expressions

Keep expressions distinct from relational operators.

Expected expression concepts may include:

```text
ColumnRef
Literal
BinaryExpression
Comparison
BooleanExpression
FunctionCall
```

Expression evaluation should remain understandable and testable.

---

# 16. Distributed execution

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

When distributed functionality is introduced, make data movement explicit.

Do not hide shuffle behavior behind magical RPC calls.

The learner should be able to see why rows move.

---

# 17. Storage engine

Storage functionality should evolve roughly from:

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

Do not introduce transaction machinery before storage exists.

---

# 18. Failure injection

Failures are part of the curriculum.

Where practical, systems should support deliberate failure scenarios.

Examples:

```text
kill worker
drop RPC
delay worker
fail disk write
crash before commit
crash after WAL flush
lose shuffle partition
```

Failure tests should be deterministic when possible.

---

# 19. Observability

Educational visibility is important.

Prefer exposing useful information such as:

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

Do not hide everything behind logging frameworks.

Simple readable output is preferred.

---

# 20. Dependencies

Before adding a dependency, ask:

> Does this dependency hide the concept this lesson is trying to teach?

Acceptable examples may include:

```text
basic HTTP/RPC library
serialization library
testing framework
CLI helper
```

Potentially harmful examples include libraries that already implement:

```text
query optimization
distributed scheduling
database storage
consensus
MVCC
```

when those are the concepts being taught.

---

# 21. Performance

Correctness and clarity come before performance.

Optimize only when:

1. the lesson is specifically about performance, or
2. the current implementation prevents the lesson from working.

Performance improvements should preferably be motivated by measurements.

---

# 22. Benchmark before optimizing

When demonstrating an optimization:

```text
measure baseline
 ↓
make change
 ↓
measure again
```

Keep benchmark data reproducible where possible.

---

# 23. Do not rewrite large areas unnecessarily

When implementing a lesson, make the smallest coherent change needed.

Avoid opportunistic refactoring unrelated to the lesson.

Large refactors make it difficult for learners to understand what changed between episodes.

---

# 24. Git history matters

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

Agents should avoid changes that make historical lesson boundaries difficult to reconstruct.

---

# 25. Comments

Use comments to explain:

```text
why
tradeoffs
intentional simplifications
```

Avoid comments that merely restate code.

Good:

```text
We intentionally materialize the entire child relation here.
Streaming execution is introduced in lesson 009.
```

Less useful:

```text
# Loop through rows
for row in rows:
```

---

# 26. Educational simplifications

When taking shortcuts, document them explicitly.

Example:

```text
Production systems use more sophisticated cardinality estimation.
For this lesson we assume uniform value distribution.
```

Never present a teaching simplification as universally correct database behavior.

---

# 27. Naming

Prefer domain names that correspond to concepts being taught.

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

Avoid overly generic names such as:

```text
Manager
Processor
Handler
Helper
Util
```

unless their role is genuinely obvious.

---

# 28. README updates

When implementing a substantial lesson:

- update the lesson documentation
- update usage instructions if required
- update architecture diagrams only if the architecture actually changed

Do not rewrite the root README for every lesson.

---

# 29. Expected agent workflow

For a typical implementation task:

```text
1. Read AGENTS.md
2. Read the relevant lesson
3. Inspect the current implementation
4. Identify the smallest required change
5. Implement it
6. Add tests
7. Add/update the executable demo
8. Run existing tests
9. Run new tests
10. Report what changed and any deliberate simplifications
```

---

# 30. Before completing a task

Verify:

```text
[ ] Does this teach the intended concept?
[ ] Did we introduce anything from a future lesson unnecessarily?
[ ] Is the implementation understandable?
[ ] Are tests included?
[ ] Do old tests pass?
[ ] Is there a runnable demonstration?
[ ] Are shortcuts documented?
[ ] Did we avoid unrelated refactoring?
```

---

# 31. When uncertain

Prefer the implementation that makes the concept easier to teach.

The primary product of this repository is not the database binary.

It is the reader's mental model.