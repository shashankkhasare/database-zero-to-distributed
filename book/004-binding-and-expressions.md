# 4. Binding Gives Names Meaning

<!--
Chapter contract

Continue from Chapter 3's unresolved table name. Show that parsing establishes
structure but not whether names exist or operations make sense. Add a minimal
catalog, expression trees, binding, type checking, and SQL three-valued logic.

Visible outcome

The representative qualified query returns Ada and Grace. Unknown tables,
columns, qualifiers, and invalid operand types fail before execution.
-->

> A parser can recognize a name. A database must decide what it names.

Chapter 3 deliberately accepted this query:

```sql
SELECT name FROM missing_table WHERE salary > 50000;
```

Worse, it ran the employee rows supplied by the caller and returned Ada and
Grace. The parser had done its job: the text followed the grammar. But valid
syntax did not make `missing_table` a real table.

In this chapter we add the missing step. **Binding** connects names in the AST
to tables and columns known by the database. While doing that, it also checks
whether expressions use compatible types. Our completed path becomes:

```text
SQL → tokens → AST → binding → bound plan → rows
                         ↑
                       catalog
```

We will finish with a more expressive request:

```sql
SELECT e.name
FROM employees AS e
WHERE e.salary + 5000 > 70000 AND e.name IS NOT NULL;
```

Ada and Grace satisfy the condition. Linus does not.

Before changing the program, create a branch from the previous checkpoint:

```bash
git switch --create chapter-004 lesson-003
```

## 4.1 Reproduce the false success

Run the Chapter 3 prompt and enter the `missing_table` query. It returns rows
because `Query::into_plan()` ignores the parsed table name and accepts rows
directly from its caller.

That observation separates three questions:

1. Can these characters become tokens?
2. Do those tokens form a query?
3. Do the names and operations in that query make sense here?

The lexer answers the first question and the parser answers the second.
Binding will answer the third.

## 4.2 Give names something to refer to

Binding needs a description of the database objects currently available. A
database calls that description a **catalog**. Our first catalog is only an
in-memory list of tables. Each table carries its name, columns, types, and
rows:

```rust
#[derive(Clone)]
pub struct Column {
    pub name: String,
    pub data_type: DataType,
}

#[derive(Clone)]
pub struct Table {
    pub name: String,
    pub columns: Vec<Column>,
    pub rows: Vec<Row>,
}

pub struct Catalog {
    tables: Vec<Table>,
}
```

This is not yet a storage catalog. It is the smallest value that can answer
whether `employees`, `salary`, and `name` exist and what kinds of values their
columns contain.

The application now registers the employee table explicitly:

```rust
Catalog::new(vec![Table {
    name: "employees".into(),
    columns: vec![
        Column { name: "id".into(), data_type: DataType::Integer },
        Column { name: "name".into(), data_type: DataType::Text },
        Column { name: "salary".into(), data_type: DataType::Integer },
    ],
    rows: employee_rows,
}])
```

Now a missing table can fail before a scan exists.

## 4.3 Expressions need a tree

Chapter 3 stored one filter column and one integer directly in `Query`. That
shape cannot represent addition, parentheses, or two conditions joined by
`AND`. Replace those special fields with an expression tree:

```rust
pub enum Expr {
    Column {
        qualifier: Option<String>,
        name: String,
    },
    Literal(Value),
    Unary {
        op: UnaryOp,
        expression: Box<Expr>,
    },
    Binary {
        left: Box<Expr>,
        op: BinaryOp,
        right: Box<Expr>,
    },
    IsNull {
        expression: Box<Expr>,
        negated: bool,
    },
}
```

The AST still records what the SQL said. A column may have a qualifier such as
`e`, but the parser does not decide whether `e` is a valid alias.

## 4.4 Precedence preserves structure

The expression grammar is arranged from weakest binding to strongest:

```text
expression  → OR
OR          → AND
AND         → NOT
NOT         → predicate
predicate   → comparison or IS NULL
value       → addition and subtraction
term        → multiplication and division
factor      → unary + or -
primary     → column, literal, or parenthesized expression
```

Each parser method handles one level and calls the next stronger level. As a
result, `salary + 2 * 3` becomes addition whose right child is multiplication.
The tree preserves the conventional meaning without the executor having to
re-read SQL precedence rules.

## 4.5 Resolve a table and its alias

For one input table, the binder's scope contains the table name, its optional
alias, and its columns. Given `employees AS e`, `e.name` is valid while
`x.name` is not.

```rust
let table = self.tables.iter()
    .find(|table| table.name == query.table)
    .ok_or_else(|| format!("unknown table: {}", query.table))?;
```

Once a table alias is present, it becomes the name used to qualify columns in
this query. This rule matters more in Chapter 5, where two tables may contain
columns with the same name.

## 4.6 Bind columns and check types

Binding walks the expression tree. A column becomes a `BoundExpr::Column` only
after the binder finds it in the current table. At the same time, the walk
returns the expression's type.

Arithmetic requires integers. `AND`, `OR`, and `NOT` require Boolean
expressions. Comparisons require compatible operands. Therefore this query
fails during binding:

```sql
SELECT name FROM employees WHERE name + 1 > 0;
```

```text
error: arithmetic requires integers: found Text
```

The executor no longer discovers this mistake by panicking halfway through a
scan. It receives an expression whose names and operand types have already
been checked.

## 4.7 `NULL` needs a third truth value

SQL uses `NULL` for a missing or unknown value. A comparison involving `NULL`
does not become true or false; it becomes **unknown**.

```text
TRUE  AND UNKNOWN = UNKNOWN
FALSE AND UNKNOWN = FALSE
TRUE  OR  UNKNOWN = TRUE
FALSE OR  UNKNOWN = UNKNOWN
```

A filter retains only rows for which its predicate is true. Both false and
unknown remove the row. `IS NULL` and `IS NOT NULL` are different: they always
produce true or false, which lets a query ask about nullness directly.

## 4.8 Execute only bound expressions

The plan no longer stores a special filter column and boundary. It stores the
bound predicate:

```rust
pub enum Plan {
    Scan { rows: Vec<Row> },
    Filter { predicate: BoundExpr, input: Box<Plan> },
    Project {
        expressions: Vec<ProjectExpression>,
        input: Box<Plan>,
    },
}
```

Execution evaluates that predicate for each row. Projection evaluates its own
expressions and gives each result a column name. The plan operates on resolved
expressions; it does not search the catalog or reinterpret SQL.

The shared entry point now makes every stage visible in one short function:

```rust
fn execute_sql(sql: &str, catalog: &Catalog) -> Result<Vec<Row>, String> {
    let query = parse(sql).map_err(|error| error.to_string())?;
    catalog.bind(query)?.execute()
}
```

Run the completed demonstration:

```bash
cargo run --quiet
```

```text
Employees matching the bound expression:
{name: "Ada"}
{name: "Grace"}
```

## 4.9 Try it

Run the prompt with `cargo run --quiet -- --prompt`, predict the stage that
will reject each query, and then test it:

1. Replace `employees` with `missing_table`.
2. Replace `e.name` with `x.name`.
3. Replace `e.salary` with `e.missing`.
4. Try `name + 1 > 0`.
5. Compare `NULL = NULL`, then compare the result with `NULL IS NULL`.
6. Remove the table alias and use unqualified column names.

The important boundary has moved. The parser still decides whether the input
has a valid shape. The binder now decides whether that structured request can
refer to this database and whether its operations make sense. Chapter 5 can
therefore introduce a second table—and the ambiguity that one-table binding
has so far avoided.
