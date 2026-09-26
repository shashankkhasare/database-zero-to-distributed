# Roadmap

# Database: Zero to Distributed

Implementation language: **Rust**

The series assumes general programming knowledge but does not assume advanced Rust expertise.

Rust concepts are introduced only when the database requires them.

The exact lesson boundaries may evolve while building the course.

The objective is not to cover database topics encyclopedically.

Each lesson should exist because the previous implementation exposes a problem worth solving.

Each completed lesson normally produces a reproducible implementation, a book
chapter, a runnable demo, and concept-focused tests. Companion videos are
organized around larger conceptual milestones and may combine several lessons.
See `BOOK.md` for the manuscript standard, `VIDEO.md` for the companion-video
strategy, and `TODO.md` for current progress.

The complete curriculum is published as four volumes backed by one evolving
repository and one Rust codebase. Volume boundaries are publication milestones,
not forks: lesson tags continue in one sequence across all four volumes.

# The course in three ideas

At the highest level, a database must:

1. read data
2. write data correctly
3. spread data and work across machines when one machine is not enough

Reading grows from SQL and query plans into execution, optimization, indexes,
parallelism, and distributed query work. Writing grows from pages and mutable
records into durability, recovery, concurrency, and transactions. Distribution
eventually applies to both computation and durable state, adding replication,
sharding, consensus, and cross-shard transactions.

The hard part is not merely performing these actions. It is preserving their
meaning and correctness while making them fast and resilient to failure.

---

# Appendix A: Enough Rust to Build a Database

Optional reference. This is an appendix rather than lesson 000, so readers can
begin building the query engine immediately and consult Rust explanations when
they need them.

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
- loops
- methods and `impl`
- modules, tests, and Cargo
- reading compiler errors

Avoid:

- async
- complex lifetimes
- macros
- unsafe
- advanced trait patterns

The goal is simply:

> Enough Rust to read and modify the database.

---

# Volume I — Read Rows

This part follows a query from text to rows. It first runs on one thread, then
uses parallel workers and multiple processes. Those early distributed chapters
spread query computation over teaching data; they do not yet claim that the
database owns durable distributed storage.

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

Use the operators created in Lesson 001 to answer one question:

> What makes two query plans mean the same thing?

Recognize the existing plan as a relational algebra tree. Define two plans as
equivalent when they produce the same result for every valid input, not merely
for the three example rows.

Introduce:

- relations
- Scan
- Selection
- Projection
- operator trees
- recursive execution
- equivalent plans
- rearrangements that preserve meaning
- rearrangements that change meaning or make a plan invalid

Example:

```text
Project(name)
    |
Filter(salary > 50000)
    |
Scan(employees)
```

Show how Rust enums naturally represent the tree. Compare one safe and one
unsafe rearrangement using the existing operations. Do not build an optimizer
or a general rewrite framework yet.

Name the algebra tree as a logical plan and briefly contrast what it computes
with how a physical plan computes it. Keep the current `Plan` enum combined.
Defer the architectural separation and physical alternatives to Lesson 012.

---

# SQL language direction

The frontend grows as an educational subset inspired by SQL-89. This is a
curriculum boundary, not a standards-compliance claim. Unsupported syntax must
fail explicitly, and each construct appears only when a lesson needs the
database behavior behind it.

- Lesson 003 introduces lexical structure, `SELECT`, `FROM`, and one simple
  `WHERE` comparison.
- Lesson 004 adds qualified identifiers, aliases, literals, comparison
  expressions, arithmetic, Boolean and `NULL` predicates. It establishes the
  expression hierarchy and precedence without resolving names yet.
- Lesson 005 binds tables, aliases, and columns against a catalog, checks
  expression types, and evaluates bound expressions with SQL three-valued
  logic.
- Lesson 006 adds SQL-89-style joins expressed with multiple `FROM` inputs and
  a `WHERE` predicate. After the underlying join is understood, it adds
  explicit `INNER`, `LEFT`, `RIGHT`, and `FULL JOIN ... ON` forms and makes
  their different row-preservation rules visible.
- Lesson 007 adds aggregate functions, `GROUP BY`, and `HAVING`.
- Lesson 008 adds `ORDER BY`, null ordering, `DISTINCT`, and `ALL`. It also adds
  `LIMIT` and `OFFSET` as explicit modern extensions rather than presenting
  them as SQL-89 syntax.
- Lesson 009 adds nested queries, beginning with uncorrelated scalar, `IN`, and
  `EXISTS` subqueries, then exposing correlation and its execution cost. It
  also introduces derived tables and non-recursive common table expressions
  once ordinary subquery scope is understood.

Schema definition, mutation, transaction control, and authorization remain
part of the long-term language target. Introduce `CREATE TABLE` and `INSERT`
when storage becomes writable; add `UPDATE` and `DELETE` when transactions can
make their effects meaningful; add `COMMIT` and `ROLLBACK` with transaction
control; and add `GRANT` and `REVOKE` only when the system has identities and
an authorization boundary. Assign their exact lesson numbers when those
milestones become active instead of designing their implementations early.

Season 11 completes the advanced language promised by Appendix B without
overloading the early frontend chapters. It covers set operations, recursive
common table expressions, richer scalar and date/time expressions, advanced
grouping, and window functions before checking compatibility against the
selected benchmark queries. Its final chapter introduces identities and an
enforcement boundary before adding `GRANT` and `REVOKE`.

These chapters are book commitments, not optional appendices. Appendix B maps
every grammar family to its owner and records actual checkpoint coverage.

The final benchmark suite should exercise TPC-style analytical and
transactional workloads. SQL-89 is not sufficient for that destination:
TPC-H defines its query functions in SQL-92, while TPC-DS uses SQL:1999 core
with OLAP features. Add later-standard constructs only when a benchmark or
database lesson motivates them, and record each extension in Appendix B.

---

## 003 — SQL Is Just a Frontend

Introduce SQL as a source language for producing our query tree.

Frame the conversion as a meaning-preserving translation from SQL into
relational work, following the boundary studied by Ceri and Gottlob. Use the
reference to ground the idea, not to introduce their complete semantics or
optimization treatment in this lesson.

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

## 004 — Expressions Are Trees

Implement:

- identifiers
- table aliases
- column references
- literals
- comparison expressions
- boolean expressions
- arithmetic expressions
- `NULL` predicates
- explicit operator precedence

Replace Chapter 3's flat query fields with a nested expression AST.

Introduce a simple expression enum.

---

## 005 — Binding Gives Names Meaning

Introduce:

- an in-memory catalog
- table, alias, and column resolution
- a distinct bound expression tree
- basic type checking
- SQL three-valued logic
- expression-based filter and projection execution

Explain why a structurally valid AST may still refer to missing objects or use
operators with incompatible types.

---

## 006 — Joins

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

## 007 — GROUP BY and Aggregation

Implement:

- GROUP BY
- COUNT
- SUM
- MIN
- MAX
- HAVING

Introduce hash aggregation.

---

## 008 — Sort, DISTINCT and LIMIT

Implement:

- ORDER BY
- DISTINCT
- LIMIT
- Top-K

Introduce blocking operators.

---

## 009 — Subqueries Are Plans Inside Plans

Extend the AST so an expression or table source can contain another query.

Begin with uncorrelated scalar, `IN`, and `EXISTS` subqueries. Define their
result-shape and empty-result behavior, then introduce correlated references
and nested binding scopes. Execute them in the simplest visible way first.

Expose repeated correlated execution as a limitation. Defer decorrelation,
semi-join rewrites, and cost-based choices until the optimizer season.

---

# Season 2 — How Query Engines Execute

## 010 — Materialize Everything

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

## 011 — Stop Materializing Everything

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

## 012 — Logical Plan vs Physical Plan

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

## 013 — The First Query Optimizer

Start with obvious rewrites.

Implement:

- predicate pushdown
- projection pruning
- constant folding

Show the difference in intermediate row counts.

---

## 014 — Statistics

Collect basic statistics:

- row count
- distinct values
- min/max
- null fraction

Use them to estimate selectivity.

---

## 015 — Cost

Build a deliberately simple cost model.

Estimate:

- scan cost
- filter cost
- join cost

Network cost will be added later.

---

## 016 — Join Ordering

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

This season begins distributing query work within one process. It is still part
of the read path, not the distributed-storage story.

---

## 017 — Split the Table Into Partitions

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

## 018 — The Plan Becomes a DAG

Represent computation dependencies explicitly.

Introduce:

- DAGs
- dependency tracking
- ready nodes
- topological execution
- shared subplans

---

## 019 — Build a Scheduler

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

This season moves query work between processes. The workers exchange rows and
recover lost computation, while the durable data itself remains outside the
engine. Replication, sharding, and distributed transactions arrive only after
the local storage and transaction layers exist.

## 020 — Our First Multi-Node Query

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

## 021 — Why Distributed Joins Break

Create the problem:

```text
Worker A has order(customer_id=42)

Worker B has customer(id=42)
```

Ask:

> How can the join happen?

This motivates data movement.

---

## 022 — Invent Exchange

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

## 023 — Build a Shuffle

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

## 024 — Distributed Aggregation

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

## 025 — Distributed Hash Join

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

## 026 — Broadcast Join

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

## 027 — Distributed Physical Planning

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

## 028 — When Synchronous Networking Stops Scaling

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

## 029 — Failures Are Normal

Kill a worker during a query.

Implement:

- task retry
- worker failure detection
- lost-task rescheduling
- idempotent task execution

---

## 030 — Lost Shuffle Data

Show why simply retrying a downstream task may not be sufficient.

Introduce shuffle lineage and recomputation.

---

## 031 — Data Skew

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

## 032 — Memory Is Finite

Set a memory limit.

Break:

- hash join
- hash aggregation
- sort

Introduce explicit memory accounting.

---

## 033 — Spill to Disk

Implement:

- external sort
- partitioned hash join
- aggregation spill

Explain the difference between deliberate materialization and spill.

---

## 034 — What Did We Build?

Compare the concepts we derived with systems such as:

- Trino
- Spark SQL
- DuckDB
- ClickHouse
- MPP databases

Focus on recognizing ideas, not claiming implementation equivalence.

---

# Volume II — Store and Write Rows Correctly

The query engine has so far consumed rows supplied to it. This part gives those
rows a durable home, makes mutation visible, and then asks what correctness
means when writes overlap or the process crashes.

# Season 6 — Build a Storage Engine

## 035 — A Database Starts With Bytes

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

## 036 — Slotted Pages

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

## 037 — Heap Files

Combine pages into a table.

Introduce:

- page IDs
- row IDs
- free-space tracking
- table scans

---

## 038 — The Buffer Pool

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

## 039 — Build a B+ Tree

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

## 040 — Connect Query Execution to Storage

Replace simple file-based scans with:

```text
TableScan
IndexScan
```

Allow the physical planner to choose between them.

---

# Season 7 — Transactions and ACID

This season must make the write path visible rather than introducing
transactions only as definitions. Add `CREATE TABLE` and `INSERT` once the
storage engine can own rows. Add `UPDATE` and `DELETE` when the transaction
machinery can make their effects atomic and recoverable. Assign their exact
lesson boundaries when this season becomes active.

## 041 — Break the Database

Create failures:

- crash during update
- two writers updating the same row
- reader observing partial state

Ask:

> What guarantees do we actually need?

---

## 042 — Write-Ahead Logging

Introduce WAL from the crash problem.

Implement:

- log records
- log sequence numbers
- commit records
- flush-before-data

---

## 043 — Crash Recovery

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

## 044 — Concurrency Control With Locks

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

## 045 — Deadlocks

Create a real deadlock.

Implement either:

- deadlock detection

or initially:

- timeout-based resolution

Introduce wait-for graphs.

---

## 046 — MVCC

Explore why readers and writers should not necessarily block each other.

Introduce:

```text
row version
transaction ID
snapshot
visibility
```

---

## 047 — Isolation Levels

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

## 048 — ACID, Finally

Bring the pieces together:

```text
Atomicity
Consistency
Isolation
Durability
```

Map each guarantee to mechanisms we built.

---

# Volume III — Distribute Data and Correctness

Parallel and distributed query execution spread work. This part spreads the
durable state itself. Replication, sharding, and distributed transactions must
preserve the guarantees established on one machine.

# Season 8 — Distributed Storage

## 049 — Replication

Our storage engine works.

Then destroy the machine.

Introduce replicas.

Implement a simple primary-replica model.

---

## 050 — Replication Lag

Show why asynchronous replication can lose acknowledged writes.

Introduce synchronous replication and durability tradeoffs.

---

## 051 — The Primary Dies

Ask:

> Who becomes the new leader?

Introduce:

- leader election
- epochs
- terms
- split brain

---

## 052 — Build Raft

Implement a minimal educational form of:

- RequestVote
- AppendEntries
- replicated log
- commit index
- leader election

Do not use an existing Raft implementation.

---

## 053 — Strongly Consistent Replicated Storage

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

## 054 — One Node Cannot Hold Everything

Introduce sharding.

Start with:

```text
hash(key) % N
```

---

## 055 — Range Sharding

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

## 056 — Routing

Build a shard map.

Route requests to the correct shard.

---

## 057 — Rebalancing

Add a node.

Move part of the data.

Handle requests while ownership changes.

---

# Season 10 — Distributed Transactions

## 058 — One Transaction, Two Shards

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

## 059 — Two-Phase Commit

Derive:

```text
PREPARE
 ↓
COMMIT / ABORT
```

Implement a basic coordinator.

---

## 060 — Coordinator Failure

Crash the coordinator after participants prepare.

Introduce:

```text
in-doubt transactions
```

Explore why distributed transactions are difficult.

---

## 061 — Distributed MVCC

Introduce timestamps spanning shards.

Build distributed snapshot reads.

---

## 062 — Serializable Distributed Transactions

Explore:

- timestamp ordering
- validation
- distributed conflicts
- serializable execution

Keep the treatment implementation-focused.

---

# Volume IV — Complete the Language and Bring Everything Together

# Season 11 — Advanced SQL and Compatibility

## 063 — Set Operations

Implement:

- `UNION` and `UNION ALL`
- `INTERSECT` and `INTERSECT ALL`
- `EXCEPT` and `EXCEPT ALL`

Make duplicate handling explicit and connect each SQL form to its relational
operation.

---

## 064 — Common Table Expressions and Recursion

Begin with non-recursive `WITH` as a named query. Then add `WITH RECURSIVE` and
make iterative evaluation, termination, and duplicate behavior visible.

---

## 065 — Rich Values and Expressions

Complete the scalar expression grammar required by the planned workloads:

- strings and exact decimals
- dates, timestamps, and intervals
- `CASE`
- `CAST`
- `EXTRACT`
- `SUBSTRING`
- concatenation and remaining predicates

Reuse the type and `NULL` semantics introduced earlier instead of creating a
second expression system.

---

## 066 — Advanced Grouping

Implement `ROLLUP` and `CUBE` as visible expansions of ordinary grouping sets.
Show how subtotal rows interact with `NULL` and ordering.

---

## 067 — Window Functions and Frames

Add `OVER`, `PARTITION BY`, window ordering, and `ROWS` and `RANGE` frames.
Contrast a window calculation with aggregation: a window computes across a
related set of rows without collapsing them into one row per group.

---

## 068 — SQL Compatibility Checkpoint

Audit Appendix B against executable parser and behavior tests. Run the complete
TPC-H query set and the selected TPC-DS query subset through SQL text rather
than manually constructed plans. Record unsupported constructs honestly before
the benchmark chapter measures execution.

---

## 069 — Identities and Authorization

Introduce database identities and an authorization check at a real execution
boundary. Then implement `GRANT` and `REVOKE` for `SELECT`, `INSERT`, `UPDATE`,
and `DELETE`. Syntax must not precede enforcement.

---

# Season 12 — Bring Everything Together

## 070 — Distributed SQL Over Distributed Storage

Connect:

```text
Distributed Query Engine
        +
Distributed Storage Engine
```

Build the integrated architecture.

---

## 071 — One SQL Query, End to End

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

## 072 — One Transaction, End to End

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

## 073 — Benchmark It

Build a small repeatable benchmark suite inspired by analytical and transactional workloads.

Include a staged compatibility matrix:

- run the complete TPC-H query set when its required SQL and data types exist
- run selected TPC-DS queries first, then expand coverage without hiding
  unsupported SQL behind manual plan construction
- run a TPC-C-inspired transaction mix after concurrency control, durability,
  and exact decimal arithmetic exist

Use official schemas, data generators, and validation rules where their terms
permit. Clearly label educational or scaled-down runs. Do not describe a result
as an official TPC result unless every applicable compliance and disclosure
requirement has been satisfied.

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

## 074 — Break Everything

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

## 075 — Where Real Databases Go Further

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
