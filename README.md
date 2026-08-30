# Database: Zero to Distributed

Build a distributed SQL database from first principles.

This project is a tutorial series and working codebase that starts with the smallest possible query engine and gradually evolves into a distributed SQL database with its own storage engine, transactions, replication, and ACID guarantees.

The goal is not to build a production database.

The goal is to understand how databases work by building one step by step.

## The idea

We start with something simple:

```sql
SELECT name
FROM employees
WHERE salary > 50000;
```

Then we ask:

> What would it take to execute this ourselves?

That leads us to:

```text
SQL
 ↓
Parser
 ↓
Logical Plan
 ↓
Relational Algebra
 ↓
Physical Plan
 ↓
Execution Engine
```

Then we ask:

> What if the data is too large for one machine?

That leads us to:

```text
Distributed Query Engine
        |
        ├── Coordinator
        ├── Workers
        ├── Stages
        ├── Tasks
        ├── Shuffle
        └── Exchange
```

Then:

> What if we build the storage layer ourselves?

That leads us to:

```text
Pages
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
 ↓
MVCC
```

And finally:

> What happens when the data and storage themselves must span machines?

That leads us to:

```text
Replication
 ↓
Consensus
 ↓
Sharding
 ↓
Distributed Transactions
 ↓
Distributed ACID Database
```

By the end, a single SQL statement travels through a database stack that we built ourselves.

---

# Teaching philosophy

The core rule of this series is:

> We do not introduce an abstraction until the previous implementation forces us to invent it.

Instead of beginning with definitions of query optimizers, shuffle, WAL, MVCC, Raft, or two-phase commit, we first build something naive.

Then we break it.

Then we derive the abstraction that solves the problem.

The pattern throughout the series is:

```text
Build the simplest thing
        ↓
Discover a limitation
        ↓
Understand the problem
        ↓
Derive the abstraction
        ↓
Implement it
```

The code should remain small enough that a developer can understand the system end to end.

Clarity is more important than production-grade performance.

---

# What we will build

The project has two major systems.

## 1. Distributed Query Engine

```text
SQL
 ↓
Parser / Binder
 ↓
Logical Plan
 ↓
Optimizer
 ↓
Physical Plan
 ↓
Distributed Planner
 ↓
Stage DAG
 ↓
Task Scheduler
 ↓
Workers
 ↓
Shuffle / Exchange
```

We will implement concepts including:

- Scan
- Filter
- Project
- Join
- Aggregation
- Sort
- SQL parsing
- Relational algebra
- Volcano-style execution
- Physical operators
- Predicate pushdown
- Projection pruning
- Statistics
- Cost estimation
- Join ordering
- Parallel execution
- Stage scheduling
- Multi-node execution
- Shuffle
- Broadcast joins
- Distributed aggregation
- Data skew handling
- Spill to disk
- Retry and failure handling

## 2. Distributed Storage Engine

```text
Rows
 ↓
Pages
 ↓
Heap Files
 ↓
Buffer Pool
 ↓
B+ Tree
 ↓
WAL
 ↓
Recovery
 ↓
Transactions
 ↓
MVCC
 ↓
Replication
 ↓
Consensus
 ↓
Sharding
 ↓
Distributed Transactions
```

We will implement concepts including:

- Record encoding
- Slotted pages
- Heap files
- Buffer pools
- B+ trees
- Write-ahead logging
- Crash recovery
- Locking
- MVCC
- Isolation levels
- Replication
- Leader election
- Raft
- Sharding
- Two-phase commit
- Distributed snapshots
- Serializable transactions

---

# Architecture at the end of the series

```text
                         Client
                           |
                          SQL
                           |
                    SQL Frontend
                           |
                  Logical Planner
                           |
                    Query Optimizer
                           |
                  Physical Planner
                           |
                Distributed Planner
                           |
                     Coordinator
                           |
                 Stage / Task DAG
                    /      |      \
                   /       |       \
              Worker    Worker    Worker
                   \       |       /
                    \      |      /
                  Transaction Layer
                           |
                 Distributed Storage
                    /      |      \
                 Shard   Shard   Shard
                  / \     / \     / \
              Replica Replica Replica
```

---

# Repository structure

```text
database-zero-to-distributed/
│
├── README.md
├── ROADMAP.md
├── AGENTS.md
│
├── engine/
│   ├── parser/
│   ├── logical/
│   ├── optimizer/
│   ├── physical/
│   ├── execution/
│   ├── distributed/
│   ├── storage/
│   └── transaction/
│
├── tests/
│
├── examples/
│   ├── queries/
│   ├── data/
│   └── plans/
│
├── lessons/
│   ├── 001-smallest-query-engine/
│   ├── 002-relational-algebra/
│   └── ...
│
├── video/
│   ├── scenes/
│   ├── renderer/
│   ├── tts/
│   └── assets/
│
├── benchmarks/
│
└── tools/
```

The exact directory structure may evolve as the project grows.

---

# Lessons as executable history

Every lesson should correspond to a reproducible state of the database.

Example:

```text
lesson-001
lesson-002
lesson-003
...
```

A viewer should eventually be able to run:

```bash
git checkout lesson-018
```

and see exactly the implementation shown in that lesson.

The evolution of the codebase is part of the curriculum.

---

# Programmatically generated videos

The videos for this series are generated from source-controlled lesson definitions.

A lesson may contain:

```text
Narration
+
Code references
+
Diagrams
+
Animations
+
Expected outputs
```

Conceptually:

```text
lesson specification
       |
       ├── narration
       ├── code
       ├── diagrams
       └── scenes
             |
         Renderer
             |
            TTS
             |
           FFmpeg
             |
         episode.mp4
```

The goal is for the repository to remain the source of truth for both the code and the videos.

Code shown in the videos should come from the actual repository whenever possible.

---

# Project principles

1. Build from first principles.
2. Prefer simple code over clever code.
3. Every abstraction must solve a demonstrated problem.
4. Avoid hiding core concepts behind large libraries.
5. Each lesson should produce something runnable.
6. Every major operator should have tests.
7. Previous lessons must continue to work.
8. Optimize for understanding before performance.
9. Explain why an implementation changes, not only how.
10. Keep the complete system small enough to reason about.

---

# What this project is not

This is not intended to become:

- a PostgreSQL replacement
- a production distributed database
- a highly optimized OLAP engine
- a full ANSI SQL implementation
- a database framework

Whenever production-grade correctness and educational simplicity conflict, this project normally chooses educational simplicity and documents the tradeoff.

---

# Who this is for

This series is aimed at developers who understand programming but want a deeper mental model of:

- databases
- SQL engines
- query optimizers
- distributed systems
- storage engines
- transaction processing

You should not need prior database-internals experience.

We will derive the important concepts as we encounter the problems they solve.

---

# Roadmap

The project is divided into several major arcs:

```text
Season 1 — Build a Query Engine
Season 2 — Make It Fast
Season 3 — Make It Parallel
Season 4 — Make It Distributed
Season 5 — Build a Storage Engine
Season 6 — Transactions and ACID
Season 7 — Replication and Consensus
Season 8 — Distributed ACID
```

See [ROADMAP.md](ROADMAP.md) for the full lesson plan.

---

# Status

This project is being built incrementally.

Expect APIs, directory structure, and implementations to evolve as the tutorial progresses.

That evolution is intentional.

---

# License

Choose an appropriate open-source license before publishing the first release.