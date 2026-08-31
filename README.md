# Database: Zero to Distributed

Build a distributed SQL database from first principles.

This project is a tutorial series and working codebase that starts with the smallest possible query engine and gradually evolves into a distributed SQL database with its own storage engine, transactions, replication, consensus, and ACID guarantees.

The goal is not to build a production database.

The goal is to understand how databases work by building one step by step.

---

# The idea

We start with something simple:

```sql
SELECT name
FROM employees
WHERE salary > 50000;
```

Then ask:

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

Then:

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

# Why Rust?

The database is implemented in **Rust**.

Rust gives us:

- predictable performance
- explicit memory ownership
- strong type modeling for query plans
- low-level control over pages and bytes
- safe concurrency primitives
- a natural path from single-node execution to distributed systems
- excellent tooling through Cargo

But this is a **database course, not a Rust course**.

We intentionally use straightforward Rust and introduce language features only when the database requires them.

The project begins with:

```text
Stable Rust
Single process
Single thread
Synchronous execution
Safe Rust
Minimal dependencies
```

and evolves gradually toward:

```text
Iterators
Threads
Worker pools
Processes
Networking
Async I/O
Distributed workers
```

We deliberately avoid introducing async Rust, complicated lifetime patterns, unsafe code, or heavy frameworks before they solve a real problem.

The progression should mirror the database architecture:

```text
Simple Rust
    ↓
Single-threaded query engine
    ↓
Iterator execution
    ↓
Parallel execution
    ↓
Networking
    ↓
Distributed execution
    ↓
Storage internals
    ↓
Concurrency control
```

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

- record encoding
- slotted pages
- heap files
- buffer pools
- B+ trees
- write-ahead logging
- crash recovery
- locking
- MVCC
- isolation levels
- replication
- leader election
- Raft
- sharding
- two-phase commit
- distributed snapshots
- serializable transactions

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

The repository structure evolves with the lessons.

We intentionally do **not** create the final architecture on day one.

An early version may be:

```text
database-zero-to-distributed/
│
├── Cargo.toml
├── README.md
├── Roadmap.md
├── BOOK.md
├── TODO.md
├── AGENTS.md
│
├── src/
│   ├── main.rs
│   ├── row.rs
│   └── operator.rs
│
├── tests/
├── examples/
├── lessons/
└── video/
```

As the database grows, boundaries may emerge:

```text
src/
├── sql/
├── logical/
├── optimizer/
├── physical/
├── execution/
├── distributed/
├── storage/
└── transaction/
```

Eventually, if those boundaries become useful, the repository may evolve into a Cargo workspace:

```text
database-zero-to-distributed/
│
├── Cargo.toml
├── Cargo.lock
│
├── crates/
│   ├── sql/
│   ├── query/
│   ├── execution/
│   ├── distributed/
│   ├── storage/
│   └── transaction/
│
├── lessons/
├── examples/
├── tests/
├── video/
├── benchmarks/
└── tools/
```

Crates should be extracted because the codebase needs them, not because the final architecture looks cleaner that way.

---

# Lessons as executable history

Every lesson should correspond to a reproducible state of the database.

Example tags:

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

# The book

This project will also produce a complete executable book that teaches a
complex system by building, running, testing, and breaking the real
implementation beside the text.

The book is not a transcript of the videos. It is a standalone technical
narrative in which each chapter explains a problem, derives one database
concept, builds it in the real repository, tests it, runs it, and exposes the
next limitation.

See [`BOOK.md`](BOOK.md) for the writing and chapter contract. See
[`TODO.md`](TODO.md) for current implementation, book, and video progress.

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

The repository remains the source of truth for both the implementation and the videos.

Code shown in videos should come from the actual repository whenever possible.

---

# Dependency philosophy

Prefer the Rust standard library whenever practical.

Dependencies are acceptable when they support the implementation without hiding the database concept being taught.

Reasonable dependencies may eventually include:

- SQL parsing support
- serialization
- CLI handling
- tracing/logging
- networking/runtime support
- testing utilities

Avoid libraries that implement the core concept of the current lesson.

For example:

- do not use a query optimizer while teaching query optimization
- do not use a storage engine while teaching storage
- do not use a consensus library while teaching Raft
- do not use a transaction manager while teaching transactions

Before adding a crate, ask:

> Does this crate support the lesson, or does it implement the lesson for us?

---

# Rust progression

Rust itself should evolve with the database.

Early lessons should mainly require:

```text
struct
enum
Vec<T>
Option<T>
Result<T, E>
match
Box<T>
Iterator
```

Parallel execution may introduce:

```text
std::thread
channels
Arc
Mutex
RwLock
```

Distributed execution may introduce:

```text
TCP
HTTP or RPC
serialization
multiple processes
```

Async Rust should appear only when concurrent network I/O creates a concrete need for it.

We should not jump directly to Tokio simply because the final system is distributed.

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
11. Prefer safe Rust.
12. Introduce advanced Rust only when the database requires it.
13. Let the repository architecture evolve with the curriculum.

---

# What this project is not

This is not intended to become:

- a PostgreSQL replacement
- a production distributed database
- a highly optimized OLAP engine
- a full ANSI SQL implementation
- a database framework
- a showcase of advanced Rust type-system techniques

Whenever production-grade sophistication and educational simplicity conflict, this project normally chooses educational simplicity and documents the tradeoff.

---

# Who this is for

This series is aimed at developers who understand programming but want a deeper mental model of:

- databases
- SQL engines
- query optimizers
- distributed systems
- storage engines
- transaction processing

Basic programming experience is assumed.

Advanced Rust knowledge is not.

Rust concepts are introduced as they become necessary.

---

# Roadmap

The project is divided into major arcs:

```text
Season 1 — Build a Query Engine
Season 2 — How Query Engines Execute
Season 3 — Query Optimization
Season 4 — Parallel Execution
Season 5 — Distributed Query Execution
Season 6 — Build a Storage Engine
Season 7 — Transactions and ACID
Season 8 — Distributed Storage
Season 9 — Sharding
Season 10 — Distributed Transactions
Season 11 — Bring Everything Together
```

See [`Roadmap.md`](Roadmap.md) for the full lesson plan and
[`TODO.md`](TODO.md) for current progress.

---

# Development

The standard development loop should eventually be:

```bash
cargo fmt --check
cargo clippy
cargo test
```

Individual lessons should also provide deterministic runnable demos wherever possible.

---

# Status

This project is being built incrementally.

Expect APIs, directory structure, Rust abstractions, and implementations to evolve as the tutorial progresses.

That evolution is intentional.

---

# License

This project is licensed under the MIT License.
