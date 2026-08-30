# Roadmap

# Database: Zero to Distributed

This roadmap describes the intended learning journey.

The exact lesson boundaries may evolve while building the course.

The objective is not to cover database topics encyclopedically.

Each lesson should exist because the previous implementation exposes a problem worth solving.

---

# Season 1 — Build the Smallest Query Engine

## 001 — The Smallest Query Engine

Build a query engine before building SQL.

Implement:

```text
Scan
 ↓
Filter
 ↓
Project
```

Use a simple CSV file as the table.

Goal:

```text
plan = Project(
    ["name"],
    Filter(
        salary > 50000,
        Scan("employees.csv")
    )
)
```

Execute the plan and produce rows.

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

---

## 004 — Binding and Expressions

Implement:

- identifiers
- table aliases
- column references
- literals
- comparison expressions
- boolean expressions
- type checking

Explain why parsing alone is not enough.

---

## 005 — Joins

Start with the simplest possible implementation:

```text
NestedLoopJoin
```

Then introduce:

```text
HashJoin
```

Explore why physical algorithms matter.

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

Introduce the idea of blocking operators.

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

Use temporary files or in-memory relations.

This gives us an easy-to-understand baseline.

---

## 009 — Stop Writing Everything to Disk

Introduce pipelining.

Build an iterator interface:

```text
open()
next()
close()
```

Introduce the Volcano execution model.

Compare:

```text
materialization
vs
streaming execution
```

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

can eventually become:

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
- network cost later

Show why optimization requires estimates rather than rules alone.

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

Implement a basic join-ordering algorithm.

---

# Season 4 — Parallel Execution

## 015 — Split the Table Into Partitions

Take one large table and divide it into multiple partitions.

Execute:

```text
Scan P1
Scan P2
Scan P3
Scan P4
```

concurrently.

---

## 016 — The Plan Becomes a DAG

Represent computation dependencies explicitly.

Introduce:

- DAG
- dependency tracking
- ready nodes
- topological execution

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

---

# Season 5 — Distributed Query Execution

## 018 — Our First Multi-Node Query

Move workers onto separate processes or machines.

Introduce:

- coordinator
- workers
- RPC
- remote tasks
- heartbeats

Execute a distributed scan.

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

---

## 021 — Build a Shuffle

Implement:

```text
hash(key) % partitions
```

Send rows to their destination partitions.

Introduce:

- partition writers
- partition readers
- network transfer
- shuffle files
- buffering

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

Partition both sides using the join key.

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

Join it locally against partitions of the large table.

Add planner logic for choosing broadcast vs shuffle.

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

## 026 — Failures Are Normal

Kill a worker during a query.

Implement:

- task retry
- worker failure detection
- lost-task rescheduling
- idempotent task execution

---

## 027 — Lost Shuffle Data

Show why simply retrying a downstream task may not be sufficient.

Introduce shuffle lineage and recomputation.

---

## 028 — Data Skew

Create a hot key:

```text
customer_id = 42
```

representing a large percentage of the dataset.

Observe:

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

## 029 — Memory Is Finite

Set a memory limit.

Break:

- hash join
- hash aggregation
- sort

Introduce memory accounting.

---

## 030 — Spill to Disk

Implement:

- external sort
- partitioned hash join
- aggregation spill

Explain the difference between deliberate materialization and emergency spill.

---

## 031 — What Did We Build?

Compare the concepts we derived with systems such as:

- Trino
- Spark SQL
- DuckDB
- ClickHouse
- MPP databases

Do not focus on implementation equivalence.

Focus on recognizing the ideas.

---

# Season 6 — Build a Storage Engine

## 032 — A Database Starts With Bytes

Start with:

```python
page = bytearray(4096)
```

Ask:

> How do we store rows?

Introduce:

- fixed-size pages
- record encoding

---

## 033 — Slotted Pages

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

---

## 034 — Heap Files

Combine pages into a table.

Introduce:

- page IDs
- row IDs
- free-space tracking
- table scans

---

## 035 — The Buffer Pool

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

Start with a simple replacement strategy.

---

## 036 — Build a B+ Tree

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

## 037 — Connect Query Execution to Storage

Replace file-based scans with:

```text
TableScan
IndexScan
```

Allow the physical planner to choose between them.

---

# Season 7 — Transactions and ACID

## 038 — Break the Database

Create failures:

- crash during update
- two writers updating the same row
- reader observing partial state

Ask:

> What guarantees do we actually need?

---

## 039 — Write-Ahead Logging

Introduce WAL from the crash problem.

Implement:

- log records
- log sequence numbers
- commit records
- flush-before-data rule

---

## 040 — Crash Recovery

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

## 041 — Concurrency Control With Locks

Implement:

- shared locks
- exclusive locks
- lock manager

Then create a deadlock.

---

## 042 — Deadlocks

Implement either:

- detection

or:

- timeout-based resolution

Explain wait-for graphs.

---

## 043 — MVCC

Replace the idea of readers blocking writers.

Introduce:

```text
row version
transaction ID
snapshot
visibility
```

---

## 044 — Isolation Levels

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

## 045 — ACID, Finally

Only now explicitly bring the pieces together.

```text
Atomicity
Consistency
Isolation
Durability
```

Map each guarantee to mechanisms we built.

---

# Season 8 — Distributed Storage

## 046 — Replication

Our storage engine works.

Then destroy the machine.

Introduce replicas.

Implement a simple primary-replica model.

---

## 047 — Replication Lag

Show why asynchronous replication can lose acknowledged writes.

Introduce synchronous replication and durability tradeoffs.

---

## 048 — The Primary Dies

Ask:

> Who becomes the new leader?

Introduce:

- leader election
- epochs
- terms
- split brain

---

## 049 — Build Raft

Implement a minimal form of:

- RequestVote
- AppendEntries
- replicated log
- commit index
- leader election

Keep the implementation educational.

---

## 050 — Strongly Consistent Replicated Storage

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

## 051 — One Node Cannot Hold Everything

Introduce sharding.

Start with:

```text
hash(key) % N
```

---

## 052 — Range Sharding

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

## 053 — Routing

Build a shard map.

Route requests to the correct shard.

---

## 054 — Rebalancing

Add a node.

Move part of the data.

Handle requests while ownership changes.

---

# Season 10 — Distributed Transactions

## 055 — One Transaction, Two Shards

Create:

```text
Transfer ₹100

Shard A:
account A -= 100

Shard B:
account B += 100
```

Crash between operations.

---

## 056 — Two-Phase Commit

Derive:

```text
PREPARE
 ↓
COMMIT / ABORT
```

Implement a basic coordinator.

---

## 057 — Coordinator Failure

Crash the coordinator after participants prepare.

Introduce:

```text
in-doubt transactions
```

Explore why distributed transactions are difficult.

---

## 058 — Distributed MVCC

Introduce timestamps that span shards.

Build distributed snapshot reads.

---

## 059 — Serializable Distributed Transactions

Explore:

- timestamp ordering
- validation
- distributed conflicts
- serializable execution

Keep the treatment conceptual and implementation-focused.

---

# Season 11 — Bring Everything Together

## 060 — Distributed SQL Over Distributed Storage

Connect:

```text
Distributed Query Engine
        +
Distributed Storage Engine
```

Build the integrated architecture.

---

## 061 — One SQL Query, End to End

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
Transaction / Snapshot
 ↓
Result
```

---

## 062 — One Transaction, End to End

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

## 063 — Benchmark It

Build a small repeatable benchmark suite inspired by analytical and transactional workloads.

Measure:

- scan throughput
- join performance
- aggregation performance
- scale-out
- storage latency
- transaction throughput
- replication cost
- failure recovery

---

## 064 — Break Everything

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

## 065 — Where Real Databases Go Further

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