# 2. Relational Algebra Without the Math

<!--
Chapter contract

Continue directly from Chapter 1's closing question. Reuse vocabulary the
reader already learned, then introduce selection, projection, logical plans,
equivalence, and counterexamples when the employee example needs them.

Visible outcome

The reader can decide whether two small query plans mean the same thing. They
understand that equivalence requires the same result for every valid input,
not merely one example table. Tests also expose the difference between
textbook set projection and this engine's duplicate-preserving Project.
-->

> A plan is not a pile of operations. Its shape is part of the answer.

<figure class="book-illustration">
  <img src="images/002-equivalent-plans.png" alt="One employee relation passes through two differently arranged query-plan paths that produce matching result relations.">
  <figcaption>Different paths can preserve the same answer.</figcaption>
</figure>

Chapter 1 left us with a working query engine and one unanswered question:
how can we tell whether two query plans still produce the same result? This
question matters whenever a database rearranges work. A different arrangement
may be faster, but speed is useless if the answer changes.

The name relational algebra may suggest that rows are about to disappear
behind equations. They are not. We will keep the employee table visible and
give precise names to ideas already present in our program. Those names will
let us explain why one rearrangement is safe and another is not.

We will not build an optimizer yet. Season 3 will automate plan rewriting and
compare the costs of valid alternatives. This chapter establishes the rule
that work depends on: two plans may look different only when they preserve the
same meaning.

## 2.1 We already have the pieces

Return to our first request: find the names of employees who earn more than
50,000. Ada and Grace appear in the result. Linus does not. Three operations
produce that answer: a scan reads the rows, a filter applies a predicate, and
a project keeps the requested columns.

Here is the request in ordinary language:

> From the employees, keep those earning more than 50,000, then show only
> their names.

Each part corresponds to one plan node:

```text
Project(name)
    ↑
Filter(salary > 50000)
    ↑
Scan(employees)
```

Read from the bottom upward. The scan supplies all three employee rows. The
filter's predicate keeps Ada and Grace. The project removes `id` and `salary`
from those rows. Each node performs one small transformation, and its result
feeds the node above it.

The same structure could query products, books, or bank accounts. Only the
source rows, predicate, and requested columns would change. This repeatable
shape lets us compare plans instead of treating every query as unrelated
code.

## 2.2 Intermediate results are relations too

Chapter 1 introduced a relation as the table-shaped collection of rows on
which our engine operates. The original `employees` table is one relation:

| id | name  | salary |
|---:|-------|-------:|
| 1  | Ada   | 70,000 |
| 2  | Linus | 50,000 |
| 3  | Grace | 72,000 |

The important extension is that a relation does not need to be a stored table.
After the filter runs, its two-row result is also a relation. After the project
runs, its one-column result is another. An intermediate result may exist only
long enough to feed the next operation, but it still has rows and columns.

This shared shape is what lets operations connect. A filter accepts a relation
and produces a relation. A project does the same. The output of one operation
can therefore become the input of another without changing into a completely
different kind of value.

Now we can name the two transformations more precisely.

## 2.3 Selection, projection, and logical plans

Our `Filter` keeps rows for which its predicate is true. Relational algebra
calls this operation **selection** and represents it with the Greek letter
`σ`, pronounced “sigma.” The predicate is written as a subscript, so
<code>σ<sub>salary &gt; 50000</sub></code> means “keep rows whose salary is
greater than 50,000.”

The terminology can be confusing because SQL uses `SELECT` to choose output
columns. In relational algebra, selection chooses rows. Applied to our
employees, it produces:

| id | name  | salary |
|---:|-------|-------:|
| 1  | Ada   | 70,000 |
| 3  | Grace | 72,000 |

Our `Project` keeps named columns and removes the others. Relational algebra
calls this operation **projection**, represents it with `π`, pronounced “pi,”
and writes the retained columns as a subscript. Thus
<code>π<sub>name</sub></code> means “keep the name column.”

| name  |
|-------|
| Ada   |
| Grace |

Selection changes which rows continue. Projection changes which columns
continue. Together with relations and rules for connecting operations, they
form the small relational algebra that Chapter 1 uncovered. Our query can now
be written as an algebra tree:

<pre><code>Projection: π<sub>name</sub>
             ↑
Selection:  σ<sub>salary &gt; 50000</sub>
             ↑
Relation:   employees</code></pre>

The compact form contains the same nesting:

<p class="relational-expression"><code>π<sub>name</sub>(σ<sub>salary &gt; 50000</sub>(employees))</code></p>

Read the inner operation first. Selection receives `employees`, and projection
receives the selection result. The symbols are useful shorthand, but the tree
often makes the flow easier to inspect.

This tree describes **what** result the query requires without choosing among
algorithms for producing it. A description at this level is a **logical plan**.
It lets us reason about the query independently of whether rows later come from
memory, a file, or an index.

A **physical plan** describes **how** the database performs that logical work.
For example, one logical scan might become a full table scan or an index scan.
Our engine has no such alternatives yet, so a later Season 2 lesson will split
logical and physical plans when there are real choices to represent.

For now, the `Plan` enum serves both roles. Its `Scan` is the leaf that brings
stored rows into execution, while its boxed inputs connect operations into the
same tree shown above. Chapter 1 already followed `execute()` through that
structure, so we do not need to draw it again.

> **Production note: Projection and duplicate rows**
>
> In textbook relational algebra, a relation is a set, so it cannot contain
> duplicate rows. Projection therefore removes duplicates. Our engine stores
> rows in a `Vec<Row>` and produces one projected row for every input row. If
> two employees are named Ada, `Project(name)` returns two Ada rows. This is
> closer to SQL projection without `DISTINCT` than to textbook `π`.
>
> Chapter 1's third experiment showed that reversing the input also reverses
> our output. That observation describes this `Vec<Row>` implementation, not a
> promise made by the relational model, which does not define row order.

## 2.4 What makes two plans equivalent?

Suppose two different plan trees both return Ada and Grace for our current
table. That is encouraging, but it does not prove that they mean the same
thing. They may agree only because these three rows do not expose their
difference.

Two plans are **equivalent** when they produce the same result for every valid
input. Valid means the input supplies the columns and value types required by
both plans. The phrase “every valid input” prevents one convenient example
from becoming a false proof.

An equivalent plan must keep the same rows and produce the same columns and
values. For this chapter, our comparisons also preserve the order and number
of rows because that is what the current engine exposes. We will collect the
gap between this behavior and the mathematical model later in the chapter.

## 2.5 Rearranging a plan

The order of nodes is part of a plan's meaning. Moving an operation changes
which columns and rows are available to the next operation. We can see the
difference by trying one unsafe rearrangement and one safe one.

### 2.5.1 An unsafe projection

The working plan filters before removing columns. Now place
`Project(name)` below the filter:

```text
Filter(salary > 50000)
       │
Project(name)
       │
Scan(employees)
```

We already know that data moves from the bottom toward the root, so plain lines
can now stand for that flow. The scan supplies complete rows, but the project
removes `salary`. When the filter receives those smaller rows, its predicate
asks for a column that no longer exists. Our engine stops with
`unknown column: salary`.

The nodes have familiar names, but the plan cannot perform the request. A
rearrangement is valid only if every operation still receives the information
it needs.

### 2.5.2 A safe projection

Removing columns early was not the mistake. Removing a required column was.
An early projection may discard `id` while retaining `name` for the final
answer and `salary` for the predicate:

```text
Original                         Remove id early

Project(name)                    Project(name)
       │                                │
Filter(salary > 50000)           Filter(salary > 50000)
       │                                │
Scan(employees)                  Project(name, salary)
                                        │
                                 Scan(employees)
```

The lower project removes only `id`. The filter can still read `salary`, and
the upper project still returns `name`. This reasoning does not depend on Ada,
Linus, or Grace. For every valid employee input, removing `id` early cannot
change a filtering decision or a returned value.

<figure class="book-illustration book-diagram">
  <img src="images/002-safe-and-unsafe-projection.png" alt="An unsafe plan removes salary before filtering, while a safe plan removes only id and keeps salary until after filtering.">
  <figcaption>An early projection is safe only when later operations retain every column they need.</figcaption>
</figure>

We have justified one meaning-preserving transformation. We have not taught
the database to discover or apply it. Automatic rewriting belongs to the
optimizer we will build in Season 3.

### 2.5.3 A counterexample

Testing several inputs can expose an invalid claim. Suppose one plan contains
two salary filters while another accidentally drops the stricter filter:

```text
Both filters                     Stricter filter dropped

Filter(salary > 60000)           Filter(salary > 50000)
          │                                │
Filter(salary > 50000)           Scan(employees)
          │
Scan(employees)
```

Both plans return Ada and Grace for our original table. Neither table contains
a salary between 50,000 and 60,000, so the missing condition appears harmless.
Now add Edsger:

| id | name   | salary |
|---:|--------|-------:|
| 4  | Edsger | 55,000 |

The first plan removes Edsger; the second keeps him. This row is a
**counterexample**, one valid input that proves the plans are not equivalent.
Equivalence requires agreement for every valid input, so one disagreement is
enough to reject it.

There is a redundant condition in the first plan, but it is the weaker one.
Any salary greater than 60,000 is already greater than 50,000. We learn which
condition is removable from their meanings, not from the particular rows in
our first table.

The repository records the counterexample in a complete test.

`src/plan.rs`: inside `mod tests`, the complete counterexample test

```rust
#[test]
fn dropping_a_filter_based_on_one_input_changes_other_results() {
    let original_rows = employees();
    assert_eq!(
        strict_and_weak_salary_filters(original_rows.clone()).execute(),
        salary_filter(original_rows, 50_000).execute()
    );

    let revealing_rows = vec![Row::new(vec![
        ("id", Value::Integer(4)),
        ("name", Value::Text("Edsger".to_string())),
        ("salary", Value::Integer(55_000)),
    ])];

    assert_ne!(
        strict_and_weak_salary_filters(revealing_rows.clone()).execute(),
        salary_filter(revealing_rows, 50_000).execute()
    );
}
```

This code is copied from the real test module, where `employees`,
`salary_filter`, and `strict_and_weak_salary_filters` construct the plans named
in the test. Run it with:

```bash
cargo test dropping_a_filter_based_on_one_input_changes_other_results
```

A passing test supplies evidence about its examples. The general argument must
still come from the operations: which rows they keep, which columns they need,
and whether changing their order can alter either fact.

## 2.6 Why equivalent plans matter

A database often has several ways to answer the same query. One plan may
remove unused columns early. Another may delay that work. Joins will eventually
create choices with much larger consequences. Different arrangements may
process fewer rows, use less memory, or finish sooner.

The database can choose among those plans only after establishing that they
preserve the requested answer. A fast plan that returns different rows is not
an optimization. It is a bug. Equivalence is the safety boundary: change the
shape as much as useful, but do not change the meaning.

Season 3 will turn that freedom into a query optimizer. It will apply rewrite
rules, estimate costs, and choose among equivalent alternatives. Correctness
comes first because cost can choose only among plans that are allowed.

## 2.7 What we deliberately did not build

This chapter gives our small plans a logical interpretation, but the engine is
still intentionally incomplete:

- It does not separate logical nodes from physical execution algorithms.
- It cannot discover or apply equivalent-plan rewrites automatically.
- It has no statistics or cost model for choosing a faster plan.
- Its `Vec<Row>` preserves row order and permits duplicate rows, unlike a
  mathematical relation.
- Its `Project` preserves duplicates instead of implementing textbook `π`.
- Its predicates only read a column and compare an integer. We have not
  considered errors, nondeterministic expressions, or side effects.

These limitations matter, but solving them together would hide the idea we
needed first. This chapter asks whether a transformation is correct. Later
lessons can ask how to represent alternatives, find them, and choose among
them.

## 2.8 Try it

Use the current `Plan`, `Row`, and `Value` types for these experiments. For the
first three, write a test that executes both plans against more than one input.
Try to decide the answer before running the code.

1. Build two filters, `salary > 50000` and `id > 1`, then swap their order. Are
   the plans equivalent for every valid employee relation?
2. Place a projection below those two filters. What is the smallest set of
   columns it must retain for the plan to keep working and return names?
3. Construct a wrong early projection, then find the smallest input that
   exposes the mistake.
4. Add two employees named Ada and run `Project(name)`. How does the result
   differ from textbook `π`?

<details>
<summary>Check your reasoning</summary>

1. The filters are equivalent in either order. A row reaches the root only
   when both predicates are true.
2. The early projection must retain `id`, `salary`, and `name`: two columns for
   the predicates and one for the final answer. It cannot remove anything from
   our three-column rows.
3. For example, keeping only `name` before `salary > 50000` fails on a
   one-row input because the predicate cannot find `salary`.
4. Our project returns two identical `{name: "Ada"}` rows. Textbook projection
   produces one because mathematical relations do not contain duplicates.

</details>

The final behavior also has a repository test. It prevents a future refactor
from silently making the educational operator claim untrue.

`src/plan.rs`: duplicate-preserving projection

```rust
#[test]
fn project_preserves_duplicate_rows() {
    let rows = vec![
        Row::new(vec![("name", Value::Text("Ada".to_string()))]),
        Row::new(vec![("name", Value::Text("Ada".to_string()))]),
    ];
    let plan = Plan::Project {
        columns: vec!["name".to_string()],
        input: Box::new(Plan::Scan { rows }),
    };

    let result = plan.execute();

    assert_eq!(result.len(), 2);
    assert_eq!(result[0], result[1]);
}
```

## 2.9 From SQL to a plan

We can now read a logical plan as transformations of relations and compare two
plans by their meaning. Yet every plan in the program is still assembled from
Rust enum values. A person should not need to write
`Box::new(Plan::Filter { ... })` merely to ask for employee names.

SQL provides a convenient way to express the request. Its words and
punctuation are not the plan itself. They are source text from which the
database can build a plan. The plan carries the meaning we studied here,
regardless of the text that produced it.

That separation creates our next problem. How does a database turn characters
such as `SELECT`, `FROM`, and `WHERE` into the tree our engine knows how to
execute? The next lesson builds the smallest SQL frontend needed to answer
that question.
