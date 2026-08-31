# Roadmap

# Database: Zero to Distributed

Implementation language: **Rust**

The series assumes general programming knowledge but does not assume advanced Rust expertise.

Rust concepts are introduced only when the database requires them.

The exact lesson boundaries may evolve while building the course.

The objective is not to cover database topics encyclopedically.

Each lesson should exist because the previous implementation exposes a problem worth solving.

Each completed lesson normally produces a reproducible implementation, a book
chapter, a runnable demo, concept-focused tests, and a generated video episode.
See `BOOK.md` for the manuscript standard and `TODO.md` for current progress.

---

# 000 — Enough Rust to Build a Database

Optional introductory lesson.

This is not a general Rust tutorial.

Cover only the concepts needed to understand the first part of the database:

- `struct`
- `enum`
- `Vec<T>`
- `Option<T>`
- `Result<T, E>`
- `match`
- `Box<T>`
- basic ownership
- basic borrowing
- iterators

Avoid:

- async
- complex lifetimes
- macros
- unsafe
- advanced trait patterns

The goal is simply:

> Enough Rust to read and modify the database.

---

# Season 1 — Build the Smallest Query Engine

## 001 — The Smallest Query Engine

Build a query engine before building SQL.

Start with simple rows held in memory or loaded from CSV.

Implement:

```text
Scan
 ↓
Filter
 ↓
Project
```

Example:

```rust
let plan = Plan::Project {
    columns: vec!["name".into()],
    input: Box::new(
        Plan::Filter {
            predicate: ...,
            input: Box::new(
                Plan::Scan {
                    table: "employees.csv".into()
                }
            ),
        }
    ),
};
```

Execute the plan and produce rows.

Keep the implementation single-threaded and synchronous.

---

## 002 — Relational Algebra Without the Math

Recognize that the operators we created form a relational algebra tree.

Introduce:

- relations
- Scan
- Selection
- Projection
- operator trees
- recursive execution

Example:

```text
Project(name)
    |
Filter(salary > 50000)
    |
Scan(employees)
```

Show how Rust enums naturally represent the tree.

---

## 003 — SQL Is Just a Frontend

Introduce SQL as a source language for producing our query tree.

Build:

```text
SQL
 ↓
Lexer
 ↓
Parser
 ↓
AST
 ↓
Logical Plan
```

Support a deliberately tiny SQL subset.

Do not attempt full ANSI SQL.

---

## 004 — Binding and Expressions

Implement:

- identifiers
- table aliases
- column references
- literals
- comparison expressions
- boolean expressions
- basic type checking

Explain why parsing alone is not enough.

Introduce a simple expression enum.

---

## 005 — Joins

Start with:

```text
NestedLoopJoin
```

Then expose its limitations.

Introduce:

```text
HashJoin
```

Explore why logical operations and physical algorithms are different concepts.

---

## 006 — GROUP BY and Aggregation

Implement:

- GROUP BY
- COUNT
- SUM
- MIN
- MAX
- HAVING

Introduce hash aggregation.

---

## 007 — Sort, DISTINCT and LIMIT

Implement:

- ORDER BY
- DISTINCT
- LIMIT
- Top-K

Introduce blocking operators.

---

# Season 2 — How Query Engines Execute

## 008 — Materialize Everything

Use the simplest complete execution strategy.

Every operator:

```text
reads child result
computes output
materializes result
```

Start with in-memory relations.

Optionally introduce temporary files.

---

## 009 — Stop Materializing Everything

Introduce pipelining.

Build an iterator-style executor.

Conceptually:

```text
open()
next()
close()
```

or an idiomatic but still understandable Rust iterator representation.

Introduce the Volcano execution model.

Compare:

```text
materialization
vs
streaming
```

Avoid lifetime-heavy designs.

---

## 010 — Logical Plan vs Physical Plan

Separate:

```text
WHAT to compute
```

from:

```text
HOW to compute it
```

Examples:

```text
Join
```

can become:

```text
NestedLoopJoin
HashJoin
MergeJoin
```

And:

```text
Filter(id = 123)
```

may eventually become:

```text
TableScan + Filter
```

or:

```text
IndexScan
```

---

# Season 3 — Query Optimization

## 011 — The First Query Optimizer

Start with obvious rewrites.

Implement:

- predicate pushdown
- projection pruning
- constant folding

Show the difference in intermediate row counts.

---

## 012 — Statistics

Collect basic statistics:

- row count
- distinct values
- min/max
- null fraction

Use them to estimate selectivity.

---

## 013 — Cost

Build a deliberately simple cost model.

Estimate:

- scan cost
- filter cost
- join cost

Network cost will be added later.

---

## 014 — Join Ordering

Demonstrate that:

```text
(A JOIN B) JOIN C
```

and:

```text
A JOIN (B JOIN C)
```

can have dramatically different costs.

Implement a basic join-ordering strategy.

---

# Season 4 — Parallel Execution

Until this point, execution should remain synchronous and largely single-threaded.

Concurrency is introduced here because the database now has a problem that benefits from it.

---

## 015 — Split the Table Into Partitions

Take one large table and divide it into partitions.

Execute:

```text
Scan P1
Scan P2
Scan P3
Scan P4
```

concurrently.

Start with:

```rust
std::thread
```

Do not introduce async Rust.

The goal is to distinguish CPU/data parallelism from asynchronous networking.

---

## 016 — The Plan Becomes a DAG

Represent computation dependencies explicitly.

Introduce:

- DAGs
- dependency tracking
- ready nodes
- topological execution
- shared subplans

---

## 017 — Build a Scheduler

Introduce:

```text
Query
 ↓
Stages
 ↓
Tasks
 ↓
Workers
```

Build:

- task states
- ready queue
- worker pool
- completion tracking
- channels

Use simple Rust concurrency primitives.

---

# Season 5 — Distributed Query Execution

## 018 — Our First Multi-Node Query

Move workers into separate processes.

Introduce:

- coordinator
- workers
- TCP or simple RPC
- serialization
- remote tasks
- heartbeats

Execute a distributed scan.

Stay synchronous initially if that keeps the implementation clearer.

---

## 019 — Why Distributed Joins Break

Create the problem:

```text
Worker A has order(customer_id=42)

Worker B has customer(id=42)
```

Ask:

> How can the join happen?

This motivates data movement.

---

## 020 — Invent Exchange

Add an explicit physical operator:

```text
Exchange
```

Support:

```text
GatherExchange
BroadcastExchange
HashExchange
RoundRobinExchange
```

Make data movement visible in the physical plan.

---

## 021 — Build a Shuffle

Implement:

```text
hash(key) % partitions
```

Send rows to destination partitions.

Introduce:

- partition writers
- partition readers
- buffering
- network transfer
- shuffle files

---

## 022 — Distributed Aggregation

Transform:

```text
Aggregate
```

into:

```text
PartialAggregate
       |
HashExchange(key)
       |
FinalAggregate
```

Explain why many aggregates are composable.

---

## 023 — Distributed Hash Join

Partition both sides by the join key.

```text
Orders
  |
HashExchange(customer_id)
  |
  +------+
         |
       Join
         |
  +------+
  |
HashExchange(id)
  |
Customers
```

---

## 024 — Broadcast Join

If one side is small:

```text
Small Table
     |
 Broadcast
 /   |   |   \
W1  W2  W3   W4
```

Join locally against partitions of the large table.

Add planner logic for choosing broadcast versus shuffle.

---

## 025 — Distributed Physical Planning

Convert a physical operator tree into:

```text
Stage DAG
```

Split stages at exchange boundaries.

Example:

```text
Stage 1:
Scan → Filter → PartialAggregate

        |
        | HashExchange
        v

Stage 2:
FinalAggregate
```

---

## 026 — When Synchronous Networking Stops Scaling

Create enough concurrent worker communication that the synchronous model becomes awkward.

Only now introduce async Rust if justified.

Possible topics:

- `async` / `await`
- Tokio
- tasks
- async TCP
- concurrent RPC

The lesson should answer:

> Why do we need async?

rather than:

> How does Tokio work?

---

## 027 — Failures Are Normal

Kill a worker during a query.

Implement:

- task retry
- worker failure detection
- lost-task rescheduling
- idempotent task execution

---

## 028 — Lost Shuffle Data

Show why simply retrying a downstream task may not be sufficient.

Introduce shuffle lineage and recomputation.

---

## 029 — Data Skew

Create a hot key representing a large percentage of the dataset.

Observe something like:

```text
Worker 1: 4 GB
Worker 2: 5 GB
Worker 3: 300 GB
Worker 4: 6 GB
```

Introduce:

- skew detection
- salting
- adaptive partitioning

---

## 030 — Memory Is Finite

Set a memory limit.

Break:

- hash join
- hash aggregation
- sort

Introduce explicit memory accounting.

---

## 031 — Spill to Disk

Implement:

- external sort
- partitioned hash join
- aggregation spill

Explain the difference between deliberate materialization and spill.

---

## 032 — What Did We Build?

Compare the concepts we derived with systems such as:

- Trino
- Spark SQL
- DuckDB
- ClickHouse
- MPP databases

Focus on recognizing ideas, not claiming implementation equivalence.

---

# Season 6 — Build a Storage Engine

## 033 — A Database Starts With Bytes

Start with:

```rust
const PAGE_SIZE: usize = 4096;

struct Page {
    data: [u8; PAGE_SIZE],
}
```

Ask:

> How do we store rows?

Introduce:

- fixed-size pages
- byte layout
- record encoding

Use safe Rust.

---

## 034 — Slotted Pages

Support variable-sized records.

Implement:

```text
Page
 ├── Header
 ├── Slot Directory
 ├── Free Space
 └── Records
```

Support:

- insert
- delete
- compact

Avoid serialization frameworks that hide the byte layout.

---

## 035 — Heap Files

Combine pages into a table.

Introduce:

- page IDs
- row IDs
- free-space tracking
- table scans

---

## 036 — The Buffer Pool

Observe repeated disk reads.

Build:

```text
BufferPool
```

Implement:

- page caching
- pin/unpin
- dirty pages
- eviction

Introduce simple synchronization only if concurrent access now requires it.

---

## 037 — Build a B+ Tree

Demonstrate why:

```sql
WHERE id = 847381
```

should not scan the entire table.

Build:

- B+ tree nodes
- lookup
- insertion
- split
- range scan

---

## 038 — Connect Query Execution to Storage

Replace simple file-based scans with:

```text
TableScan
IndexScan
```

Allow the physical planner to choose between them.

---

# Season 7 — Transactions and ACID

## 039 — Break the Database

Create failures:

- crash during update
- two writers updating the same row
- reader observing partial state

Ask:

> What guarantees do we actually need?

---

## 040 — Write-Ahead Logging

Introduce WAL from the crash problem.

Implement:

- log records
- log sequence numbers
- commit records
- flush-before-data

---

## 041 — Crash Recovery

Crash the process deliberately.

On restart:

```text
read WAL
 ↓
REDO
 ↓
UNDO
```

Introduce checkpoints.

---

## 042 — Concurrency Control With Locks

Implement:

- shared locks
- exclusive locks
- lock manager

Rust concepts may now include:

```text
Arc
Mutex
RwLock
```

Introduce them because shared database state requires synchronization.

---

## 043 — Deadlocks

Create a real deadlock.

Implement either:

- deadlock detection

or initially:

- timeout-based resolution

Introduce wait-for graphs.

---

## 044 — MVCC

Explore why readers and writers should not necessarily block each other.

Introduce:

```text
row version
transaction ID
snapshot
visibility
```

---

## 045 — Isolation Levels

Create anomalies rather than starting with definitions.

Demonstrate:

- dirty read
- non-repeatable read
- phantom
- lost update
- write skew

Then introduce:

- read committed
- repeatable read
- snapshot isolation
- serializable

---

## 046 — ACID, Finally

Bring the pieces together:

```text
Atomicity
Consistency
Isolation
Durability
```

Map each guarantee to mechanisms we built.

---

# Season 8 — Distributed Storage

## 047 — Replication

Our storage engine works.

Then destroy the machine.

Introduce replicas.

Implement a simple primary-replica model.

---

## 048 — Replication Lag

Show why asynchronous replication can lose acknowledged writes.

Introduce synchronous replication and durability tradeoffs.

---

## 049 — The Primary Dies

Ask:

> Who becomes the new leader?

Introduce:

- leader election
- epochs
- terms
- split brain

---

## 050 — Build Raft

Implement a minimal educational form of:

- RequestVote
- AppendEntries
- replicated log
- commit index
- leader election

Do not use an existing Raft implementation.

---

## 051 — Strongly Consistent Replicated Storage

Connect the consensus log to storage operations.

Study:

```text
client write
 ↓
leader
 ↓
replicated log
 ↓
majority
 ↓
commit
 ↓
storage
```

---

# Season 9 — Sharding

## 052 — One Node Cannot Hold Everything

Introduce sharding.

Start with:

```text
hash(key) % N
```

---

## 053 — Range Sharding

Compare:

```text
hash sharding
vs
range sharding
```

Explore:

- locality
- hot ranges
- scans
- balancing

---

## 054 — Routing

Build a shard map.

Route requests to the correct shard.

---

## 055 — Rebalancing

Add a node.

Move part of the data.

Handle requests while ownership changes.

---

# Season 10 — Distributed Transactions

## 056 — One Transaction, Two Shards

Create:

```text
Transfer 100 units

Shard A:
account A -= 100

Shard B:
account B += 100
```

Crash between operations.

---

## 057 — Two-Phase Commit

Derive:

```text
PREPARE
 ↓
COMMIT / ABORT
```

Implement a basic coordinator.

---

## 058 — Coordinator Failure

Crash the coordinator after participants prepare.

Introduce:

```text
in-doubt transactions
```

Explore why distributed transactions are difficult.

---

## 059 — Distributed MVCC

Introduce timestamps spanning shards.

Build distributed snapshot reads.

---

## 060 — Serializable Distributed Transactions

Explore:

- timestamp ordering
- validation
- distributed conflicts
- serializable execution

Keep the treatment implementation-focused.

---

# Season 11 — Bring Everything Together

## 061 — Distributed SQL Over Distributed Storage

Connect:

```text
Distributed Query Engine
        +
Distributed Storage Engine
```

Build the integrated architecture.

---

## 062 — One SQL Query, End to End

Take a query such as:

```sql
SELECT c.country, SUM(o.amount)
FROM orders o
JOIN customers c
    ON o.customer_id = c.id
WHERE o.created_at >= ?
GROUP BY c.country;
```

Follow it through:

```text
SQL
 ↓
Parse
 ↓
Bind
 ↓
Logical Plan
 ↓
Optimize
 ↓
Physical Plan
 ↓
Distributed Plan
 ↓
Stages
 ↓
Tasks
 ↓
Storage Reads
 ↓
Shuffle
 ↓
Join
 ↓
Aggregation
 ↓
Snapshot
 ↓
Result
```

---

## 063 — One Transaction, End to End

Follow a distributed write through:

```text
SQL
 ↓
Transaction
 ↓
Shard routing
 ↓
MVCC
 ↓
WAL
 ↓
Consensus
 ↓
2PC
 ↓
Commit
```

---

## 064 — Benchmark It

Build a small repeatable benchmark suite inspired by analytical and transactional workloads.

Measure:

- scan throughput
- join performance
- aggregation performance
- scale-out
- storage latency
- transaction throughput
- replication cost
- recovery time

---

## 065 — Break Everything

Run failure experiments:

- worker dies
- coordinator dies
- storage node dies
- network partition
- disk fills
- slow worker
- hot shard
- corrupted temporary file

Observe which guarantees survive.

---

## 066 — Where Real Databases Go Further

Use our database as a mental model for understanding real systems.

Compare design ideas with:

- PostgreSQL
- SQLite
- DuckDB
- ClickHouse
- Trino
- Spark SQL
- CockroachDB
- TiDB
- YugabyteDB
- Spanner

The goal is not:

> Our toy database works exactly like these systems.

The goal is:

> We now understand the problems these systems are solving.

---

# Final destination

At the end of the journey, the learner should be able to look at:

```text
SQL query
```

and mentally see:

```text
Compiler
+
Optimizer
+
Distributed Runtime
+
Storage Engine
+
Transaction System
+
Replication Protocol
+
Consensus
```

working underneath it.

That mental model is the real product of the series.
