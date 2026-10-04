# 8. Join Syntax and Row Preservation

<!--
Review draft

This file proposes the chapter's teaching sequence and implementation shape.
Exact source-edit snippets, tests, illustrations, terminology updates, and
checkpoint output will be added only after the structure is approved.

Chapter contract

Continue from Chapter 7's comma-separated inputs and logical Join. Add explicit
INNER, LEFT, RIGHT, and FULL JOIN ... ON syntax. Bind each ON expression in the
scope of its two inputs and make row preservation visible through null-extended
rows. Keep nested loops as the only execution strategy.

Visible outcome

An inner join returns the three matched employee-department pairs. A left join
also retains one employee without a department, a right join retains one
department without an employee, and a full join retains both unmatched rows.
-->

> An outer join records which missing rows must not disappear.

<!--
Opening illustration proposal: the same matched center pair surrounded by an
unmatched left row and unmatched right row. INNER keeps the center, LEFT keeps
the center plus the left row, RIGHT keeps the center plus the right row, and
FULL keeps all three regions.
-->

Chapter 7 creates every possible pair and lets `WHERE` discard the pairs that
do not match:

```sql
SELECT e.name AS employee_name, d.name AS department_name
FROM employees AS e, departments AS d
WHERE e.department_id = d.id;
```

That is enough for an inner join. A row without a match simply disappears. It
cannot express a different request: retain the employee even when no department
matches, and fill the missing department fields with `NULL`.

This chapter will make that distinction visible by adding one unmatched row to
each input:

```text
employees                              departments
Ada      department_id 10              10  Engineering
Linus    department_id 20              20  Systems
Grace    department_id 30              30  Research
Edsger   department_id 99              40  Operations
```

The representative left join is:

```sql
SELECT e.name AS employee_name, d.name AS department_name
FROM employees AS e
LEFT JOIN departments AS d ON e.department_id = d.id;
```

It returns the three matches plus `{employee_name: "Edsger",
department_name: NULL}`. A right join instead preserves the unmatched
`Operations` department. A full join preserves both.

Supporting that result requires more than new keywords. The parser must attach
an `ON` expression to a particular join. The binder must resolve that
expression after both inputs are visible. The executor must distinguish a pair
that satisfies `ON` from an unmatched row that the join kind promises to keep.

This chapter makes those changes in four steps:

1. Represent explicit join clauses and their `ON` expressions in the query AST.
2. Bind each `ON` expression in the scope of the inputs available at that join.
3. Add the join kind and checked condition to the logical `Join` node.
4. Extend the nested loops to emit null-extended rows when the join kind
   preserves an unmatched side.

Before changing the program, begin from the completed Chapter 7 checkpoint:

```bash
git switch --create chapter-008 lesson-007
```

## 8.1 A filter cannot preserve a missing match

For inner joins, these two queries return the same rows:

```sql
SELECT e.name, d.name
FROM employees AS e, departments AS d
WHERE e.department_id = d.id;
```

```sql
SELECT e.name, d.name
FROM employees AS e
INNER JOIN departments AS d ON e.department_id = d.id;
```

Both forms retain only matching pairs. The second form places the matching rule
beside the operation that combines the tables, which becomes essential for an
outer join.

`WHERE` receives rows only after its input plan has produced them. If an
ordinary join has already discarded Edsger because no department matched,
placing a filter above that join cannot bring his row back. A left join must
notice the absence of a match while it is combining the two inputs and emit:

```text
employee values + NULL department values
```

That is **null extension**. It makes the preserved row the same width as an
ordinary joined row, so the existing slot-based expressions can still read it.

The distinction gives `ON` and `WHERE` separate jobs:

- `ON` decides whether a left and right row match.
- the join kind decides which unmatched rows are preserved;
- `WHERE`, when present, filters the rows produced by the join, including
  null-extended rows.

We will preserve that order in the grammar, AST, logical plan, and executor.

## 8.2 Extend the join grammar

Chapter 7 treats `FROM` as a comma-separated list of simple table references.
The expanded grammar lets each table reference carry explicit joins:

```text
query            = "SELECT" select_list
                   "FROM" table_reference ("," table_reference)*
                   ("WHERE" expression)? ";" ;

table_reference  = table_primary join_clause* ;
table_primary    = identifier alias? ;

join_clause      = ("INNER"
                   | "LEFT" "OUTER"?
                   | "RIGHT" "OUTER"?
                   | "FULL" "OUTER"?)?
                   "JOIN" table_primary "ON" expression ;
```

`table_primary` is still deliberately small: one catalog table with an
optional alias. Subqueries and parenthesized table expressions remain later
work.

The optional prefix makes bare `JOIN` mean `INNER JOIN`. `OUTER` is optional in
`LEFT OUTER JOIN`, `RIGHT OUTER JOIN`, and `FULL OUTER JOIN`; it does not change
their meaning.

The lexer will need fixed tokens for `INNER`, `LEFT`, `RIGHT`, `FULL`, `OUTER`,
`JOIN`, and `ON`. Once those tokens exist, the parser can preserve the boundary
between one table input and each join attached to it.

## 8.3 Represent a chain of joins in the AST

The current `TableReference` stores only one table name and alias. It cannot
record that `departments AS d` is the right input of a left join or that the
following expression belongs to its `ON` clause.

The proposed AST separates the first input from the joins that follow it:

```rust
pub struct TableReference {
    pub first: TablePrimary,
    pub joins: Vec<JoinClause>,
}

pub struct TablePrimary {
    pub name: String,
    pub alias: Option<String>,
}

pub struct JoinClause {
    pub kind: JoinKind,
    pub right: TablePrimary,
    pub condition: Expr,
}

pub enum JoinKind {
    Inner,
    Left,
    Right,
    Full,
}
```

For the representative query, `first` stores `employees AS e`. Its one
`JoinClause` stores `Left`, `departments AS d`, and the unresolved expression
tree for `e.department_id = d.id`.

The outer `Vec<TableReference>` remains useful. A comma between two table
references still requests the Cartesian combination introduced in Chapter 7;
an explicit join inside one table reference carries a join kind and condition.

## 8.4 Parse table primaries and join clauses

The parser will follow the new productions directly:

```text
parse_table_reference()
    ↓ first table_primary
parse_table_primary()
    ↓ zero or more join_clause values
parse_join_clause()
    ↓ join kind, right table_primary, ON expression
```

`parse_table_reference()` first parses one required table primary. It then
loops while the next token can begin a join. The loop matters because a query
may build a left-deep chain:

```sql
FROM employees AS e
LEFT JOIN departments AS d ON e.department_id = d.id
INNER JOIN locations AS l ON d.location_id = l.id
```

This chapter's demonstration uses two tables, but the AST should not need a
special two-table shape.

An AST checkpoint will print the representative query before binding. The
checkpoint should make three facts visible:

- `Left` belongs to the join clause;
- `departments AS d` is its right input;
- `e.department_id = d.id` remains an unresolved `Expr`.

That tree preserves the request. The binder must now decide which names and
types make the request valid.

## 8.5 Bind `ON` when both inputs are visible

Chapter 7 builds one scope containing every comma-separated input before it
binds projection and `WHERE`. An explicit join needs a more precise moment for
its condition.

For:

```sql
FROM employees AS e
LEFT JOIN departments AS d ON e.department_id = d.id
```

binding proceeds in this order:

```text
add employees AS e to scope
        ↓
add departments AS d to scope
        ↓
bind e.department_id = d.id in that scope
        ↓
construct the checked Join
```

The right input must be visible before binding `ON`, but a table mentioned
later in `FROM` must not be used early by that condition. Building the scope
incrementally keeps that boundary explicit.

As with `WHERE`, the checked condition must produce `Boolean` or `Null`:

```text
error: ON expression must be Boolean
```

`NULL` is accepted as a condition type because SQL three-valued logic treats
it as not matching a pair. Name resolution, ambiguity checks, column slots, and
ordinary operator type checks remain the same as Chapter 7.

After the complete `FROM` input is bound, projection and the optional `WHERE`
expression use the full resulting scope.

## 8.6 Put matching and preservation in the logical plan

Chapter 7's logical `Join` only means “combine every left row with every right
row.” The new node must also record which pairs match and which unmatched sides
survive.

The proposed logical shape is:

```rust
Join {
    kind: JoinKind,
    condition: Option<BoundExpr>,
    left_columns: Vec<String>,
    right_columns: Vec<String>,
    left: Box<Plan>,
    right: Box<Plan>,
}
```

`condition` is absent only for Chapter 7's comma-separated Cartesian join.
Explicit joins carry their checked `ON` expression.

The column-name lists are execution metadata, not projected output names. When
one side has no match, the executor needs its names to construct the correct
number of labelled `NULL` values. It cannot infer that shape from the first row
because an input table may be empty.

The logical plan for the representative query becomes:

```text
Project(employee_name, department_name)
                 |
        Left Join(on: e.department_id = d.id)
               /     \
 Scan(employees)     Scan(departments)
```

There is no `Filter` unless the SQL also contains `WHERE`. The match condition
now belongs to `Join` because row preservation depends on it.

## 8.7 Add null-extended rows

`Row::combine()` already establishes the slot order: all left values followed
by all right values. Add a constructor that creates one `NULL` value for each
column name supplied by the plan:

```text
null row for departments
[(id, NULL), (name, NULL)]
```

Combining Edsger's employee row with that null row preserves the six-slot
layout predicted by binding:

```text
[4, Edsger, 65000, 99] + [NULL, NULL]
```

`d.name` still reads the department-name slot. The value at that slot is now
`NULL` rather than missing, so projection and later expressions need no special
outer-join lookup rule.

The same mechanism creates null employee values when a right or full join
preserves the unmatched `Operations` department.

## 8.8 Execute `INNER JOIN` with the existing loops

The existing nested loops already visit every left-right pair. Inner-join
execution adds one decision inside those loops:

```text
combine left and right rows
        ↓
evaluate ON against the combined row
        ↓
TRUE: emit the row
FALSE or NULL: discard it
```

The three matching employee-department pairs survive. Edsger and Operations do
not appear because neither has a match.

This produces the same rows as Chapter 7's comma-plus-`WHERE` query. That
equivalence is useful, but it is limited to inner joins. Moving an outer join's
`ON` condition into `WHERE` changes which unmatched rows survive.

## 8.9 Preserve the left or right side

A left join remembers whether each left row matched at least one right row.
After the inner loop finishes:

- if a match occurred, the matching combined rows have already been emitted;
- if no match occurred, emit the left row combined with a null right row.

For the representative query, Edsger reaches the second branch.

A right join needs the mirror image, but the loop order need not change. Keep a
Boolean entry for each materialized right row. Whenever a pair matches, mark
that right position. After all left rows have been examined, emit a null left
row combined with each right row that was never marked.

The output remains deterministic:

1. matching pairs appear in left-row then right-row order;
2. unmatched right rows follow in right-input order.

The chapter keeps this straightforward materialized algorithm. It does not yet
choose another physical strategy.

## 8.10 Preserve both sides with `FULL JOIN`

A full join combines the two preservation rules. It emits unmatched left rows
during the outer loop and remembers right-side matches for a final pass.

For the sample data, the result contains five rows:

```text
Ada      Engineering
Linus    Systems
Grace    Research
Edsger   NULL
NULL     Operations
```

This checkpoint should make the join kinds comparable:

| Join kind | Matched rows | Unmatched employees | Unmatched departments |
| --- | --- | --- | --- |
| `INNER` | keep | discard | discard |
| `LEFT` | keep | keep | discard |
| `RIGHT` | keep | discard | keep |
| `FULL` | keep | keep | keep |

The table describes row preservation, not a physical algorithm. All four forms
still use the same visible nested loops.

## 8.11 Apply `WHERE` after row preservation

Add a filter to the representative left join:

```sql
SELECT e.name AS employee_name, d.name AS department_name
FROM employees AS e
LEFT JOIN departments AS d ON e.department_id = d.id
WHERE d.name IS NOT NULL;
```

The left join first creates Edsger's null-extended row. `Filter` then evaluates
`d.name IS NOT NULL` against that row and removes it. The final result therefore
looks like an inner join, but the plan reached it through different semantics:

```text
Project
   |
Filter(d.name IS NOT NULL)
   |
Left Join(on: e.department_id = d.id)
```

This ordering explains why an outer-join rewrite requires more care than the
inner-join equivalence shown earlier. Moving conditions between `ON` and
`WHERE` can change the result.

## 8.12 Reconnect the application

Update the in-memory catalog with Edsger and Operations, then make the fixed
demonstration run the representative left join. The prompt should also accept
the inner, right, and full forms without changing its statement-collection
loop.

The visible demonstration should print:

```text
Employees and their departments:
{employee_name: "Ada", department_name: "Engineering"}
{employee_name: "Linus", department_name: "Systems"}
{employee_name: "Grace", department_name: "Research"}
{employee_name: "Edsger", department_name: NULL}
```

Binding failures remain ordinary query errors. An unknown name in `ON`, an
ambiguous unqualified column, or a non-Boolean condition must fail before any
rows are scanned.

The completed `lesson-008` checkpoint will contain the parser, binding,
null-extension, row-preservation, and end-to-end tests. Their source remains in
the Rust files rather than the build-along narration.

## 8.13 What we deliberately did not build

- Nested loops remain the only join execution strategy.
- The logical and physical plan representations are still combined.
- There is no hash join, merge join, join reordering, or cost-based choice.
- `NATURAL JOIN`, `USING`, lateral inputs, and semi/anti joins are absent.
- A table primary is still a catalog table, not a subquery or parenthesized
  table expression.
- Conditions are not pushed below joins.

These limits keep the chapter focused on one semantic distinction: matching a
pair and preserving an unmatched row are separate decisions.

## 8.14 Try it

Run the prompt and predict each result before executing it:

1. Replace `LEFT JOIN` with `INNER JOIN`.
2. Replace it with bare `JOIN`.
3. Use `RIGHT JOIN` and identify the null-extended row.
4. Use `FULL OUTER JOIN` and predict the complete row order.
5. Change `ON e.department_id = d.id` to `ON FALSE` for each join kind.
6. Restore the left join and add `WHERE d.name IS NOT NULL`.
7. Use `ON e.department_id + d.name` and predict which stage rejects it.

<details>
<summary>Check your reasoning</summary>

1. Only Ada, Linus, and Grace remain because an inner join discards both
   unmatched sides.
2. Bare `JOIN` has the same meaning as `INNER JOIN`.
3. The result includes `{employee_name: NULL, department_name: "Operations"}`.
4. The three matches appear first, followed by Edsger with `NULL`, then `NULL`
   with Operations.
5. `INNER` emits no rows, `LEFT` preserves every employee, `RIGHT` preserves
   every department, and `FULL` preserves every row from both inputs.
6. The join creates Edsger's null-extended row, then `WHERE` removes it.
7. Binding rejects the expression because arithmetic requires integers before
   it checks whether the complete `ON` result is Boolean.

</details>

## 8.15 Many rows can become one answer

The database can now express whether unmatched rows disappear or survive. Its
logical plan records the join kind and match condition, while one deliberately
simple nested-loop implementation executes all four forms.

The result is still one row per surviving pair. Questions such as “How many
employees belong to each department?” require a different operation: several
input rows must contribute to one output value. The next chapter introduces
aggregate functions, `GROUP BY`, and `HAVING` to make that many-to-one flow
visible.
