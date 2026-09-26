# 5. Binding Gives Names Meaning

<!--
Chapter contract

Continue from Chapter 4's unresolved expression AST. Add a minimal catalog,
binding, type checking, bound expressions, SQL three-valued evaluation, and
plan conversion without expanding the SQL grammar again.

Visible outcome

A qualified expression query returns Ada and Grace. Unknown tables, columns,
qualifiers, and invalid operand types fail before execution.
-->

> A parser can recognize a name. A database must decide what it names.

<figure class="book-illustration">
  <img src="images/005-parsing-is-not-binding.png" alt="The missing_table query passes a structural parser check, then fails when a binder compares its table name with a catalog containing only employees.">
  <figcaption>Valid structure does not guarantee that the names in a query exist.</figcaption>
</figure>

Chapter 4 can now parse this richer request:

```sql
SELECT e.name
FROM employees AS e
WHERE e.salary + 5000 > 70000 AND e.name IS NOT NULL;
```

Its AST preserves the alias, qualified columns, arithmetic, comparison,
Boolean operator, and null test. Yet every name in that tree is still text.
The parser cannot know whether `employees` exists, whether `e` names that
table, or whether adding `5000` to `e.salary` makes sense.

This chapter adds **binding**, the stage that answers those questions:

```text
AST → binding → bound plan → rows
         ↑
       catalog
```

The catalog describes the tables and columns available to the query. The
binder resolves names against that catalog and checks operator types before
execution. The resulting bound expressions no longer contain unchecked table
qualifiers.

Ada and Grace satisfy the representative query. Linus does not. Just as
importantly, the same path will reject missing tables, unknown columns,
invalid qualifiers, and incompatible operand types before scanning rows.

Before changing the program, begin from the completed Chapter 4 checkpoint:

```bash
git switch --create chapter-005 lesson-004
```

## 5.1 Names are still unresolved

Run the Chapter 4 AST prompt and enter:

```sql
SELECT name FROM missing_table WHERE salary > 50000;
```

The parser produces a `Query` because the tokens follow the grammar. Its
`table` field contains `missing_table`, but nothing has compared that text
with the database's available tables. The same is true of `name` and
`salary`.

Lexing answered which tokens were present. Parsing answered how those tokens
fit together. Binding must now connect the names in that structure to real
database objects. It needs a place to look them up.

## 5.2 Introduce the catalog

The AST checkpoint leaves names such as `employees`, `e`, and `salary`
unresolved. Binding needs a description of the objects those names may refer
to. A database calls that description a **catalog**. Our first catalog is only
an in-memory list of tables.

The catalog structures themselves live in `catalog.rs`. `DataType`, however,
is also expression vocabulary because the binder uses it to describe the type
produced by an expression. We therefore add it to `expression.rs` beside the
operator and expression types.

The catalog must record what kind of values each column may contain. A
`DataType` describes a category such as integers or text, while `Value`
stores one actual piece of row data such as `Value::Integer(70000)` or
`Value::Text("Ada")`.

`src/expression.rs`: add before `UnaryOp`

```rust
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum DataType {
    Integer,
    Text,
    Boolean,
    Null,
}
```

A column describes every value allowed in that position. Using `Value` in
the catalog would require a meaningless placeholder such as
`Value::Integer(0)` merely to say that a column contains integers. We instead
pair the column name with its `DataType`.

`src/catalog.rs`: create this file

```rust
use crate::expression::DataType;
use crate::row::Row;

#[derive(Clone)]
pub struct Column {
    pub name: String,
    pub data_type: DataType,
}
```

A table combines those columns with the rows they describe. The catalog then
holds the tables available to this database.

`src/catalog.rs`: add after `Column`

```rust
#[derive(Clone)]
pub struct Table {
    pub name: String,
    pub columns: Vec<Column>,
    pub rows: Vec<Row>,
}

pub struct Catalog {
    tables: Vec<Table>,
}

impl Catalog {
    pub fn new(tables: Vec<Table>) -> Self {
        Self { tables }
    }
}
```

This catalog describes tables, columns, and rows in memory. Persisting catalog
information to storage comes later. We now know where binding can look up a
name; next we define what it produces after a lookup succeeds.

## 5.3 Define what binding produces

The AST checkpoint showed an unresolved tree: `e.name` still contains two
strings whose meaning has not been checked. Binding needs to produce a second
tree that records the result of those checks.

A bound column no longer needs its qualifier because the binder has already
identified its table and verified the column. Keeping a separate type makes
that guarantee visible: code that receives `BoundExpr` cannot accidentally
accept an unresolved SQL name.

`src/expression.rs`: add after `Expr`

```rust
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum BoundExpr {
    Column(String),
    Literal(Value),
    Unary {
        op: UnaryOp,
        expression: Box<BoundExpr>,
    },
    Binary {
        left: Box<BoundExpr>,
        op: BinaryOp,
        right: Box<BoundExpr>,
    },
    IsNull {
        expression: Box<BoundExpr>,
        negated: bool,
    },
}
```

The two trees have similar shapes but different promises:

```text
Expr::Column { qualifier: Some("e"), name: "salary" }
                         ↓ binding
BoundExpr::Column("salary")
```

The original `Expr` remains an honest record of what the user wrote.
`BoundExpr` is the simpler form that later planning and execution stages may
trust. We can now write the binder without referring to a type defined later.

## 5.4 Bind names and check types

### 5.4.1 Establish the scope

A column name can be resolved only among the names visible to its query. For
our one-table query, those names are the table name, its optional alias, and
its columns. We will keep that information together in a `Scope` and pass it
through every recursive binding call.

Binding belongs in `catalog.rs`, whose imports need the expression types the
binder will use:

`src/catalog.rs`: replace the imports

```rust
use crate::expression::{BinaryOp, BoundExpr, DataType, Expr, UnaryOp};
use crate::row::Row;
```

The scope collects the names visible while binding one query. Passing one
shared scope by reference lets every recursive call inherit the same table,
alias, and columns without copying them or threading three separate arguments
through the expression tree.

`src/catalog.rs`: add after `impl Catalog`

```rust
struct Scope<'a> {
    table_name: &'a str,
    alias: Option<&'a str>,
    columns: &'a [Column],
}
```

If an alias exists, it is the qualifier accepted by this scope. Otherwise the
table name itself may qualify a column.

### 5.4.2 Bind and type-check the expression

Binding walks the AST and returns two results: an expression safe for execution
and the type of its result. In one recursive walk, it resolves columns against
the scope, assigns types to literals, checks unary operands, groups binary
operators by their required types, and accepts null tests for any operand.

A bare `NULL` receives the temporary type `DataType::Null`. The type helper
accepts it where another operand type is expected because evaluation normally
propagates the unknown value as `Value::Null` rather than treating it as a type
error.

`src/catalog.rs`: add after `Scope`

```rust
fn bind_expression(expression: Expr, scope: &Scope<'_>)
    -> Result<(BoundExpr, DataType), String>
{
    match expression {
        Expr::Column { qualifier, name } => {
            if let Some(qualifier) = qualifier {
                let expected = scope.alias.unwrap_or(scope.table_name);
                if qualifier != expected {
                    return Err(format!(
                        "unknown table or alias: {qualifier}"));
                }
            }

            let column = scope.columns.iter()
                .find(|column| column.name == name)
                .ok_or_else(|| format!("unknown column: {name}"))?;
            Ok((BoundExpr::Column(name), column.data_type.clone()))
        }
        Expr::Literal(value) => {
            let data_type = match &value {
                crate::row::Value::Integer(_) => DataType::Integer,
                crate::row::Value::Text(_) => DataType::Text,
                crate::row::Value::Boolean(_) => DataType::Boolean,
                crate::row::Value::Null => DataType::Null,
            };
            Ok((BoundExpr::Literal(value), data_type))
        }
        Expr::Unary { op, expression } => {
            let (expression, data_type) =
                bind_expression(*expression, scope)?;
            let expected = match op {
                UnaryOp::Not => DataType::Boolean,
                _ => DataType::Integer,
            };
            require_type(&data_type, &expected,
                "invalid unary operand")?;
            Ok((BoundExpr::Unary {
                op,
                expression: Box::new(expression),
            }, expected))
        }
        Expr::Binary { left, op, right } => {
            let (left, left_type) = bind_expression(*left, scope)?;
            let (right, right_type) = bind_expression(*right, scope)?;
            let result_type = match op {
                BinaryOp::Add | BinaryOp::Subtract
                | BinaryOp::Multiply | BinaryOp::Divide => {
                    require_type(&left_type, &DataType::Integer,
                        "arithmetic requires integers")?;
                    require_type(&right_type, &DataType::Integer,
                        "arithmetic requires integers")?;
                    DataType::Integer
                }
                BinaryOp::And | BinaryOp::Or => {
                    require_type(&left_type, &DataType::Boolean,
                        "AND and OR require Boolean expressions")?;
                    require_type(&right_type, &DataType::Boolean,
                        "AND and OR require Boolean expressions")?;
                    DataType::Boolean
                }
                BinaryOp::Equal | BinaryOp::NotEqual => {
                    require_matching_types(&left_type, &right_type)?;
                    DataType::Boolean
                }
                BinaryOp::Less | BinaryOp::LessOrEqual
                | BinaryOp::Greater | BinaryOp::GreaterOrEqual => {
                    require_matching_types(&left_type, &right_type)?;
                    require_ordered_type(&left_type)?;
                    require_ordered_type(&right_type)?;
                    DataType::Boolean
                }
            };
            Ok((BoundExpr::Binary {
                left: Box::new(left),
                op,
                right: Box::new(right),
            }, result_type))
        }
        Expr::IsNull { expression, negated } => {
            let (expression, _) = bind_expression(*expression, scope)?;
            Ok((BoundExpr::IsNull {
                expression: Box::new(expression),
                negated,
            }, DataType::Boolean))
        }
    }
}
```

Unary arithmetic requires an integer, while `NOT` requires a Boolean.
Arithmetic operators require integers, and `AND` and `OR` require Booleans.
Equality accepts matching integer, text, or Boolean operands. Ordered
comparisons accept matching integers or text. A null test accepts any operand
and always produces a Boolean result.

`src/catalog.rs`: add the type helper after `bind_expression()`

```rust
fn require_type(actual: &DataType, expected: &DataType,
    message: &str) -> Result<(), String>
{
    if actual == expected || actual == &DataType::Null {
        Ok(())
    } else {
        Err(format!("{message}: found {actual:?}"))
    }
}
```

Comparisons share two more checks. Their operand types must match unless one
side is the temporarily untyped `NULL`. Ordered comparisons then reject types,
such as Boolean, that have no ordering in this chapter's SQL dialect.

`src/catalog.rs`: add after `require_type()`

```rust
fn require_matching_types(left: &DataType, right: &DataType)
    -> Result<(), String>
{
    if left == &DataType::Null || right == &DataType::Null
        || left == right
    {
        Ok(())
    } else {
        Err(format!("cannot compare {left:?} with {right:?}"))
    }
}

fn require_ordered_type(data_type: &DataType) -> Result<(), String> {
    match data_type {
        DataType::Integer | DataType::Text | DataType::Null => Ok(()),
        _ => Err(format!(
            "ordered comparison requires integers or text: found {data_type:?}"
        )),
    }
}
```

`name + 1` now fails during binding because `name` is text. Execution will not
discover that mistake halfway through a scan.

<figure class="book-illustration book-diagram">
  <img src="images/005-column-binding.png" alt="The unresolved AST column e.salary is checked against an employees catalog entry where alias e maps salary to INTEGER, producing a bound salary column with integer type.">
  <figcaption>Binding checks the qualifier and column, recovers the type, and produces a simpler expression for execution.</figcaption>
</figure>

## 5.5 Evaluate bound expressions

Binding has removed unresolved names and rejected invalid operand types. That
lets evaluation focus on one question: what value does this checked expression
produce for the current row? We will import `Row` alongside `Value` and give
the bound tree an evaluation method.

`src/expression.rs`: replace the first import

```rust
use crate::row::{Row, Value};
```

`src/expression.rs`: add after `BoundExpr`

```rust
impl BoundExpr {
    pub fn evaluate(&self, row: &Row) -> Result<Value, String> {
        match self {
            BoundExpr::Column(name) => row.get(name).cloned()
                .ok_or_else(|| format!(
                    "bound column is missing at execution: {name}")),
            BoundExpr::Literal(value) => Ok(value.clone()),
            BoundExpr::Unary { op, expression } => {
                evaluate_unary(op, expression.evaluate(row)?)
            }
            BoundExpr::Binary { left, op, right } => {
                evaluate_binary(left.evaluate(row)?, op,
                    right.evaluate(row)?)
            }
            BoundExpr::IsNull { expression, negated } => {
                let is_null = expression.evaluate(row)? == Value::Null;
                Ok(Value::Boolean(if *negated {
                    !is_null
                } else {
                    is_null
                }))
            }
        }
    }
}
```

Unary evaluation is small because binding has already checked the operand
type.

`src/expression.rs`: add after `impl BoundExpr`

```rust
fn evaluate_unary(op: &UnaryOp, value: Value) -> Result<Value, String> {
    match (op, value) {
        (_, Value::Null) => Ok(Value::Null),
        (UnaryOp::Plus, Value::Integer(value)) =>
            Ok(Value::Integer(value)),
        (UnaryOp::Minus, Value::Integer(value)) =>
            Ok(Value::Integer(-value)),
        (UnaryOp::Not, Value::Boolean(value)) =>
            Ok(Value::Boolean(!value)),
        _ => Err("bound unary expression received an invalid value".into()),
    }
}
```

Binary evaluation must account for SQL's unknown value. `NULL` propagates
through arithmetic and comparisons: for example, both `1 + NULL` and
`1 = NULL` produce `NULL`. `AND` and `OR` are different because one known
operand can sometimes decide the result. They follow these truth tables:

| `AND` | `TRUE` | `FALSE` | `NULL` |
| --- | --- | --- | --- |
| `TRUE` | `TRUE` | `FALSE` | `NULL` |
| `FALSE` | `FALSE` | `FALSE` | `FALSE` |
| `NULL` | `NULL` | `FALSE` | `NULL` |

| `OR` | `TRUE` | `FALSE` | `NULL` |
| --- | --- | --- | --- |
| `TRUE` | `TRUE` | `TRUE` | `TRUE` |
| `FALSE` | `TRUE` | `FALSE` | `NULL` |
| `NULL` | `TRUE` | `NULL` | `NULL` |

A false value decides `AND` even when the other side is unknown. A true value
similarly decides `OR`. With those rules established, binary evaluation can
handle nulls before dispatching ordinary arithmetic, comparison, and Boolean
operations. Division by zero remains an execution error.

`src/expression.rs`: add after `evaluate_unary()`

```rust
fn evaluate_binary(left: Value, op: &BinaryOp, right: Value)
    -> Result<Value, String>
{
    if left == Value::Null || right == Value::Null {
        return match op {
            BinaryOp::And => and(left, right),
            BinaryOp::Or => or(left, right),
            _ => Ok(Value::Null),
        };
    }

    match (left, op, right) {
        (Value::Integer(left), BinaryOp::Add,
            Value::Integer(right)) => Ok(Value::Integer(left + right)),
        (Value::Integer(left), BinaryOp::Subtract,
            Value::Integer(right)) => Ok(Value::Integer(left - right)),
        (Value::Integer(left), BinaryOp::Multiply,
            Value::Integer(right)) => Ok(Value::Integer(left * right)),
        (Value::Integer(_), BinaryOp::Divide,
            Value::Integer(0)) => Err("division by zero".to_string()),
        (Value::Integer(left), BinaryOp::Divide,
            Value::Integer(right)) => Ok(Value::Integer(left / right)),
        (Value::Integer(left), op, Value::Integer(right)) =>
            compare(left, op, right),
        (Value::Text(left), op, Value::Text(right)) =>
            compare(left, op, right),
        (Value::Boolean(left), BinaryOp::Equal,
            Value::Boolean(right)) => Ok(Value::Boolean(left == right)),
        (Value::Boolean(left), BinaryOp::NotEqual,
            Value::Boolean(right)) => Ok(Value::Boolean(left != right)),
        (Value::Boolean(left), BinaryOp::And,
            Value::Boolean(right)) => Ok(Value::Boolean(left && right)),
        (Value::Boolean(left), BinaryOp::Or,
            Value::Boolean(right)) => Ok(Value::Boolean(left || right)),
        _ => Err("bound binary expression received invalid values".into()),
    }
}
```

`src/expression.rs`: add the comparison helper

```rust
fn compare<T: PartialEq + PartialOrd>(left: T,
    op: &BinaryOp, right: T) -> Result<Value, String>
{
    let result = match op {
        BinaryOp::Equal => left == right,
        BinaryOp::NotEqual => left != right,
        BinaryOp::Less => left < right,
        BinaryOp::LessOrEqual => left <= right,
        BinaryOp::Greater => left > right,
        BinaryOp::GreaterOrEqual => left >= right,
        _ => return Err(
            "bound comparison received an invalid operator".into()),
    };
    Ok(Value::Boolean(result))
}
```

Binding guarantees that `compare()` receives a comparison operator. Its error
arm remains because the Rust type `BinaryOp` also contains non-comparison
variants and cannot express that narrower guarantee by itself.

The Boolean helpers encode the truth tables directly.

`src/expression.rs`: add the three-valued Boolean helpers

```rust
fn and(left: Value, right: Value) -> Result<Value, String> {
    match (left, right) {
        (Value::Boolean(false), _) | (_, Value::Boolean(false)) =>
            Ok(Value::Boolean(false)),
        (Value::Boolean(true), Value::Boolean(true)) =>
            Ok(Value::Boolean(true)),
        (Value::Boolean(true), Value::Null)
        | (Value::Null, Value::Boolean(true))
        | (Value::Null, Value::Null) => Ok(Value::Null),
        _ => Err("AND received a non-Boolean value".into()),
    }
}

fn or(left: Value, right: Value) -> Result<Value, String> {
    match (left, right) {
        (Value::Boolean(true), _) | (_, Value::Boolean(true)) =>
            Ok(Value::Boolean(true)),
        (Value::Boolean(false), Value::Boolean(false)) =>
            Ok(Value::Boolean(false)),
        (Value::Boolean(false), Value::Null)
        | (Value::Null, Value::Boolean(false))
        | (Value::Null, Value::Null) => Ok(Value::Null),
        _ => Err("OR received a non-Boolean value".into()),
    }
}
```

A bound expression can now evaluate one row. The plan must next store these
expressions instead of the fixed column and integer fields from Chapter 3.

## 5.6 Update plan execution

The Chapter 3 plan stored one filter column, one integer boundary, and a list
of projected column names. That representation could execute only the query
shape it described. Bound expression trees can replace those fixed fields, so
the same filter and project nodes can execute every expression this chapter
accepts.

Projection will produce a `Vec<(String, Value)>` whose column names are already
owned. `Row::new()` accepts borrowed names and converts each one into a new
`String`; this second constructor can instead move the completed vector into
the row directly.

`src/row.rs`: add to the first `impl Row`

```rust
pub fn from_owned(values: Vec<(String, Value)>) -> Self {
    Self { values }
}
```

`src/plan.rs`: replace the file

```rust
use crate::expression::BoundExpr;
use crate::row::{Row, Value};

#[derive(Debug)]
pub struct ProjectExpression {
    pub name: String,
    pub expression: BoundExpr,
}

#[derive(Debug)]
pub enum Plan {
    Scan { rows: Vec<Row> },
    Filter { predicate: BoundExpr, input: Box<Plan> },
    Project {
        expressions: Vec<ProjectExpression>,
        input: Box<Plan>,
    },
}
```

A filter retains only `TRUE`. `FALSE` and `NULL` both remove the row, which is
how SQL treats an unknown `WHERE` condition. Execution does not search the
catalog or reinterpret SQL because binding has already settled those
questions.

`src/plan.rs`: add `Plan::execute()`

```rust
impl Plan {
    pub fn execute(&self) -> Result<Vec<Row>, String> {
        match self {
            Plan::Scan { rows } => Ok(rows.clone()),
            Plan::Filter { predicate, input } => {
                let mut output = Vec::new();
                for row in input.execute()? {
                    match predicate.evaluate(&row)? {
                        Value::Boolean(true) => output.push(row),
                        Value::Boolean(false) | Value::Null => {}
                        _ => return Err(
                            "WHERE expression did not produce a Boolean".into()),
                    }
                }
                Ok(output)
            }
            Plan::Project { expressions, input } => {
                let mut output = Vec::new();
                for row in input.execute()? {
                    let mut values = Vec::new();
                    for expression in expressions {
                        values.push((expression.name.clone(),
                            expression.expression.evaluate(&row)?));
                    }
                    output.push(Row::from_owned(values));
                }
                Ok(output)
            }
        }
    }
}
```

The executor now understands bound expressions, but no code yet assembles the
new plan. The catalog can finally do that without referring to future types.

## 5.7 Connect the application

We can bind an individual expression and execute a plan that contains one, but
no function yet turns an entire parsed `Query` into that plan.
`Catalog::bind()` will resolve the input table, bind the projection and filter
in the same scope, require a valid `WHERE` type, and assemble the familiar
`Scan → Filter → Project` tree. Once that path exists, both the fixed
demonstration and the prompt can use it.

`src/catalog.rs`: add with the imports

```rust
use crate::parser::Query;
use crate::plan::{Plan, ProjectExpression};
```

`src/catalog.rs`: add to `impl Catalog`

```rust
pub fn bind(&self, query: Query) -> Result<Plan, String> {
    let table = self.tables.iter()
        .find(|table| table.name == query.table)
        .ok_or_else(|| format!("unknown table: {}", query.table))?;

    let scope = Scope {
        table_name: &table.name,
        alias: query.table_alias.as_deref(),
        columns: &table.columns,
    };

    let (projection, _) = bind_expression(query.projection, &scope)?;
    let projection_name = match &projection {
        BoundExpr::Column(name) => name.clone(),
        _ => "expression".to_string(),
    };
    let (predicate, predicate_type) =
        bind_expression(query.filter, &scope)?;
    if predicate_type != DataType::Boolean
        && predicate_type != DataType::Null
    {
        return Err("WHERE expression must be Boolean".to_string());
    }

    Ok(Plan::Project {
        expressions: vec![ProjectExpression {
            name: projection_name,
            expression: projection,
        }],
        input: Box::new(Plan::Filter {
            predicate,
            input: Box::new(Plan::Scan { rows: table.rows.clone() }),
        }),
    })
}
```

This method gives the complete query its database meaning. It resolves the
table, binds the projection and filter in the same scope, requires a Boolean
`WHERE` result, and builds the familiar scan-filter-project plan. Only now do
we connect that complete path to the application.

### 5.7.1 Restore the fixed demonstration

The AST-only shell has served its checkpoint. We can now restore the complete
set of database modules and import the catalog.

`src/main.rs`: replace the module declarations and imports

```rust
mod catalog;
mod expression;
mod lexer;
mod parser;
mod plan;
mod row;

use std::io::{self, Write};
use catalog::{Catalog, Column, Table};
use expression::DataType;
use parser::parse;
use row::{Row, Value};
```

The application also needs its employee rows again, now registered as a typed
table in the catalog.

`src/main.rs`: add after the imports

```rust
fn employee(id: i64, name: &str, salary: i64) -> Row {
    Row::new(vec![
        ("id", Value::Integer(id)),
        ("name", Value::Text(name.to_string())),
        ("salary", Value::Integer(salary)),
    ])
}

fn employee_catalog() -> Catalog {
    Catalog::new(vec![Table {
        name: "employees".to_string(),
        columns: vec![
            Column { name: "id".to_string(),
                data_type: DataType::Integer },
            Column { name: "name".to_string(),
                data_type: DataType::Text },
            Column { name: "salary".to_string(),
                data_type: DataType::Integer },
        ],
        rows: vec![
            employee(1, "Ada", 70_000),
            employee(2, "Linus", 50_000),
            employee(3, "Grace", 72_000),
        ],
    }])
}
```

The column list is the schema for the rows below it. Nothing in this small
catalog forces that schema and `employee()` to agree, so adding or changing a
column requires updating both. A later storage representation will remove
this manually maintained duplication.

The shared SQL entry point now parses, binds, and executes.

`src/main.rs`: add after `employee_catalog()`

```rust
fn execute_sql(sql: &str, catalog: &Catalog)
    -> Result<Vec<Row>, String>
{
    let query = parse(sql).map_err(|error| error.to_string())?;
    catalog.bind(query)?.execute()
}
```

We will reconnect the fixed demonstration before bringing back the prompt.

`src/main.rs`: replace the temporary `main()` and remove `inspect_sql()`

```rust
fn main() {
    let catalog = employee_catalog();
    run_demo(&catalog);
}

fn run_demo(catalog: &Catalog) {
    let sql = "SELECT e.name FROM employees AS e \
        WHERE e.salary + 5000 > 70000 AND e.name IS NOT NULL;";
    let rows = execute_sql(sql, catalog)
        .expect("the lesson query should execute");

    println!("Employees matching the bound expression:");
    for row in rows {
        println!("{row}");
    }
}
```

### 5.7.2 Connect the prompt

With the fixed demonstration working, `main()` can choose between it and the
prompt.

`src/main.rs`: replace `main()`

```rust
fn main() {
    let catalog = employee_catalog();
    if std::env::args().nth(1).as_deref() == Some("--prompt") {
        run_prompt(&catalog)
            .expect("failed to read SQL from the terminal");
    } else {
        run_demo(&catalog);
    }
}
```

The final prompt has the same loop as before, but it carries the catalog and
prints binding errors as ordinary query errors.

`src/main.rs`: replace the temporary `run_prompt()`

```rust
fn run_prompt(catalog: &Catalog) -> io::Result<()> {
    loop {
        print!("sql> ");
        io::stdout().flush()?;
        let mut sql = String::new();
        if io::stdin().read_line(&mut sql)? == 0 {
            println!();
            return Ok(());
        }
        if !sql.trim().is_empty() {
            print_query_result(&sql, catalog);
        }
    }
}

fn print_query_result(sql: &str, catalog: &Catalog) {
    match execute_sql(sql, catalog) {
        Ok(rows) => for row in rows { println!("{row}"); },
        Err(error) => eprintln!("error: {error}"),
    }
}
```

`Row::project()` is now unused because projection lives in the plan and
evaluates expressions instead of copying a fixed list of columns. Remove the
old method from `row.rs`.

This second phase changes expressions, binding, plans, and the application as
one connected representation. Compile after all four pieces are present.

### 5.7.3 Verify that the code compiles

The application now connects the parser, catalog and binder, plan, and
executor. Compile it before running queries so missing modules, stale imports,
or mismatched plan fields fail at this checkpoint.

```bash
cargo fmt
cargo check
```

## 5.8 Run the fixed demonstration

Run the completed path:

```bash
cargo run --quiet
```

```text
Employees matching the bound expression:
{name: "Ada"}
{name: "Grace"}
```

The source text now becomes an unresolved AST, then a checked bound plan, and
only then rows. The executor itself never sees an alias or table name.

## 5.9 Run the prompt and its errors

Start the interactive path:

```bash
cargo run --quiet -- --prompt
```

The old false success now stops during binding:

```text
sql> SELECT name FROM missing_table WHERE salary > 50000;
error: unknown table: missing_table
```

An invalid qualifier and invalid operand type fail just as clearly:

```text
sql> SELECT x.name FROM employees AS e WHERE e.salary > 50000;
error: unknown table or alias: x
sql> SELECT name FROM employees WHERE name + 1 > 0;
error: arithmetic requires integers: found Text
```

The prompt remains ready after each failure. A bad query no longer becomes a
process panic or silently reads an unrelated table.

## 5.10 Verify the tests

Run the complete suite:

```bash
cargo test
```

The lesson source tests tokenization, precedence, aliases, missing names, type
errors, three-valued logic, filtering unknown predicates, the representative
query, and reuse of the catalog after an error.

Finish with the repository checks:

```bash
cargo fmt --check
cargo clippy -- -D warnings
```

## 5.11 What we deliberately did not build

The new frontend remains intentionally bounded:

- A query has one input table and one selected expression.
- The catalog exists only in memory and is assembled by the application.
- Names use exact spelling; quoted identifiers are absent.
- Arithmetic uses integers only.
- Division by zero is an execution error.
- There are no functions, `BETWEEN`, `LIKE`, `IN`, `CASE`, `CAST`, dates, or
  intervals.
- There is no optimizer or separate physical plan.
- Bound columns use names rather than stable catalog identifiers.

These limits keep the chapter focused on the boundary between syntax and
meaning. Appendix B records where the remaining expression forms belong.

## 5.12 Try it

Run the prompt, predict the stage that will accept or reject each query, and
then test it.

1. Replace `employees` with `missing_table`.
2. Replace `e.name` with `x.name`.
3. Replace `e.salary` with `e.missing`.
4. Try `name + 1 > 0`.
5. Compare `salary + 2 * 3` with `(salary + 2) * 3`.
6. Try `NULL = NULL`, then `NULL IS NULL` in the filter.
7. Remove the alias and use unqualified column names.

<details>
<summary>Check your reasoning</summary>

1. Parsing succeeds, but binding reports `unknown table: missing_table`.
2. Binding reports `unknown table or alias: x`.
3. Binding reports `unknown column: missing`.
4. Binding rejects arithmetic on the text column `name`.
5. Multiplication happens first in the first expression. Parentheses make
   addition happen first in the second.
6. `NULL = NULL` is unknown, so the filter removes every row. `NULL IS NULL`
   is true, so it retains every row.
7. Unqualified names bind because there is only one input table.

</details>

## 5.13 One scope is no longer enough

The frontend can now preserve expression structure, and the binder can reject
unknown names and incompatible types before execution. One simplifying fact
made that possible: every query had exactly one input table. An unqualified
column such as `name` could belong to only that table, and a bound column could
be stored by name alone.

Consider what changes when the database has two tables:

```text
employees(id, name, department_id)
departments(id, name)
```

A useful query needs values from both:

```sql
SELECT name
FROM employees AS e, departments AS d
WHERE e.department_id = d.id;
```

This query creates two related problems. The binder must track both table
aliases and decide which input owns each column. The selected `name` is
ambiguous because both tables contain one. After binding resolves qualified
references, the executor must also combine an employee row with the matching
department row.

That row-combining operation is a **join**. In the next chapter we will first
make the simplest join work, then ask what its straightforward execution
strategy costs.

