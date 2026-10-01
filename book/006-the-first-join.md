# 6. The First Join

<!--
Chapter contract

Continue from Chapter 5's one-table scope. Accept multiple selected
expressions and input tables, resolve ambiguous names, bind columns to slots in
the combined row, and execute one logical Join with visible nested loops.

Visible outcome

A multiline employee-and-department query returns three named pairs. An
unqualified name shared by both tables fails as ambiguous before execution.
-->

> A join begins by asking which rows belong together.

Chapter 5 can check and execute many expressions, but every name still belongs
to one input table. It also accepts only one selected expression. The next
request exceeds both limits:

```sql
SELECT e.name AS employee_name, d.name AS department_name
FROM employees AS e, departments AS d
WHERE e.department_id = d.id;
```

This query needs two input rows before its predicate can be evaluated. It also
needs two output names because both source columns are called `name`.

The completed plan will keep the familiar filter and project operations:

```text
Project(employee_name, department_name)
                 |
Filter(e.department_id = d.id)
                 |
                Join
               /    \
 Scan(employees)    Scan(departments)
```

`Join` is the logical request to combine the inputs. Its first implementation
will simply pair every left row with every right row. The filter above it will
retain the pairs whose department identifiers match. We will make that simple
execution work before introducing physical join algorithms.

## 6.1 Let the prompt read a complete statement

The Chapter 5 prompt executes every line immediately. That was tolerable for
short single-table examples, but it forces the representative query onto one
long line. We will first let the prompt collect lines until the terminating
semicolon appears.

A continuation prompt will make the unfinished statement visible:

```text
sql> SELECT e.name AS employee_name, d.name AS department_name
...> FROM employees AS e, departments AS d
...> WHERE e.department_id = d.id;
```

This remains deliberately smaller than a script runner. It accepts one
semicolon-terminated statement at a time.

## 6.2 Expand the query grammar

The existing expression grammar does not change. The outer query gains two
comma-separated lists:

```text
query             = "SELECT" select_list
                    "FROM" table_list
                    "WHERE" expression ";" ;

select_list       = select_expression ("," select_expression)* ;
select_expression = expression ("AS"? identifier)? ;

table_list        = table_reference ("," table_reference)* ;
table_reference   = identifier alias? ;
alias             = "AS"? identifier ;
```

The select list stores output aliases. Table references store input aliases.
Those are different namespaces: `e` identifies an input inside expressions,
while `employee_name` labels a value in the result row.

## 6.3 Preserve both lists in the AST

`Query` must replace its single projection and table fields with collections.
A parser checkpoint will show two selected expressions and two table
references before binding tries to interpret any name.

## 6.4 Build a multi-table scope

A database may contain many tables, but this query makes only `employees` and
`departments` visible. The binder will create one scope entry per input,
recording its accepted qualifier, columns, and starting position in the row
that the join will produce.

Unqualified lookup now has three possible outcomes:

- no visible table contains the name, so the column is unknown;
- exactly one table contains it, so binding succeeds;
- more than one table contains it, so the name is ambiguous.

For example, both inputs contain `name`. The binder must reject unqualified
`name` rather than choose one silently.

## 6.5 Bind columns to slots

Chapter 5 stored a bound column by name. That was sufficient while a row could
contain only one column with that name. A joined row may contain both
`employees.name` and `departments.name`.

The binder will therefore replace each resolved name with its position in the
combined row while retaining the original name for readable diagnostics:

```text
employees row                 departments row
[id, name, salary, department_id] + [id, name]
                ↓
[id, name, salary, department_id, id, name]
  0    1      2          3         4    5
```

In this layout, `e.name` binds to slot 1 and `d.name` binds to slot 5. The two
labels may be identical because execution reads the checked slots.

## 6.6 Add the logical join

The plan gains a `Join` node with left and right input plans. For this chapter's
comma-separated `FROM` list, the node produces every pair of input rows. The
existing filter represents the `WHERE` condition that decides which pairs
belong in the result.

Keeping the node named `Join` matters. It describes what relation the query
needs, not the physical algorithm eventually chosen to compute it.

## 6.7 Execute the nested loops

The first execution rule is intentionally direct: execute both children, then
combine every left row with every right row. Three employees and three
departments create nine candidate rows. The filter keeps the three pairs whose
identifiers match.

This is materialized execution, just like the earlier plan nodes. A later
chapter will separate logical and physical plans and give the database a choice
between nested-loop and hash join algorithms.

## 6.8 Connect the employee and department query

The catalog will add a department identifier to each employee and register a
second table containing department names. The completed query should produce:

```text
Employees and their departments:
{employee_name: "Ada", department_name: "Engineering"}
{employee_name: "Linus", department_name: "Systems"}
{employee_name: "Grace", department_name: "Research"}
```

## 6.9 Inspect binding failures

The prompt should distinguish missing and ambiguous names before scanning any
rows. Representative failures include an unknown table, duplicate input alias,
unknown qualifier, unknown column, and unqualified `name` shared by both
inputs.

## 6.10 What we deliberately did not build

- Join syntax is limited to comma-separated inputs with a `WHERE` predicate.
- `INNER`, `LEFT`, `RIGHT`, and `FULL JOIN ... ON` belong to Chapter 7.
- Nested loops are the only execution method, but they are not represented as
  a physical plan yet.
- There is no join reordering or cost-based choice.
- The prompt accepts one complete statement, not a SQL script.
- Bound column slots are local to one plan and are not durable catalog IDs.

## 6.11 Try it

Run the prompt and predict which stage handles each change:

1. Put the representative query on three lines.
2. Remove both output aliases.
3. Replace `e.name` with unqualified `name`.
4. Replace `d.name` with `x.name`.
5. Give both input tables the alias `e`.
6. Change the predicate to `e.id = d.id` and predict the surviving rows.

## 6.12 One join operation can have different algorithms

The database can now combine two relations, but it considers every possible
row pair before the filter removes most of them. That cost is visible even in
our three-by-three example.

The next chapter will stay with this straightforward execution while adding
explicit inner and outer join syntax. The later physical-planning chapter will
return to the cost problem and let one logical `Join` become either a
`NestedLoopJoin` or a `HashJoin`.
