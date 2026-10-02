# 7. The First Join

<!--
Chapter contract

Continue from Chapter 6's named projection list. Accept multiple input tables,
resolve ambiguous names, bind columns to slots in the combined row, and execute
one logical Join with visible nested loops.

Visible outcome

An employee-and-department query returns three named pairs. An unqualified
name shared by both tables fails as ambiguous before execution.
-->

> A join begins by asking which rows belong together.

Chapter 6 can project several named expressions, but every column still belongs
to one input table. The next request exceeds that remaining limit:

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

## 7.1 Expand the `FROM` grammar

The existing expression and projection grammars do not change. The outer query
now gives `FROM` a comma-separated list:

```text
query             = "SELECT" select_list
                    "FROM" table_list
                    "WHERE" expression ";" ;

table_list        = table_reference ("," table_reference)* ;
table_reference   = identifier alias? ;
alias             = "AS"? identifier ;
```

Table references store input aliases. Those differ from Chapter 6's output
aliases: `e` identifies an input inside expressions, while `employee_name`
labels a value in the result row.

## 7.2 Preserve the input list in the AST

`Query` already stores a collection of selected expressions. It will now
replace its single table fields with a collection of table references. A
parser checkpoint will show both inputs before binding interprets their names.

## 7.3 Build a multi-table scope

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

## 7.4 Bind columns to slots

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

## 7.5 Add the logical join

The plan gains a `Join` node with left and right input plans. For this chapter's
comma-separated `FROM` list, the node produces every pair of input rows. The
existing filter represents the `WHERE` condition that decides which pairs
belong in the result.

Keeping the node named `Join` matters. It describes what relation the query
needs, not the physical algorithm eventually chosen to compute it.

## 7.6 Execute the nested loops

The first execution rule is intentionally direct: execute both children, then
combine every left row with every right row. Three employees and three
departments create nine candidate rows. The filter keeps the three pairs whose
identifiers match.

This is materialized execution, just like the earlier plan nodes. A later
chapter will separate logical and physical plans and give the database a choice
between nested-loop and hash join algorithms.

## 7.7 Connect the employee and department query

The catalog will add a department identifier to each employee and register a
second table containing department names. The completed query should produce:

```text
Employees and their departments:
{employee_name: "Ada", department_name: "Engineering"}
{employee_name: "Linus", department_name: "Systems"}
{employee_name: "Grace", department_name: "Research"}
```

## 7.8 Inspect binding failures

The prompt should distinguish missing and ambiguous names before scanning any
rows. Representative failures include an unknown table, duplicate input alias,
unknown qualifier, unknown column, and unqualified `name` shared by both
inputs.

## 7.9 What we deliberately did not build

- Join syntax is limited to comma-separated inputs with a `WHERE` predicate.
- `INNER`, `LEFT`, `RIGHT`, and `FULL JOIN ... ON` belong to Chapter 8.
- Nested loops are the only execution method, but they are not represented as
  a physical plan yet.
- There is no join reordering or cost-based choice.
- Bound column slots are local to one plan and are not durable catalog IDs.

## 7.10 Try it

Run the prompt and predict which stage handles each change:

1. Remove both output aliases.
2. Replace `e.name` with unqualified `name`.
3. Replace `d.name` with `x.name`.
4. Give both input tables the alias `e`.
5. Change the predicate to `e.id = d.id` and predict the surviving rows.

## 7.11 One join operation can have different algorithms

The database can now combine two relations, but it considers every possible
row pair before the filter removes most of them. That cost is visible even in
our three-by-three example.

The next chapter will stay with this straightforward execution while adding
explicit inner and outer join syntax. The later physical-planning chapter will
return to the cost problem and let one logical `Join` become either a
`NestedLoopJoin` or a `HashJoin`.
