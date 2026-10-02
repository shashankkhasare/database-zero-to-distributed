# 6. Multiple Outputs

<!--
Chapter contract

Continue from Chapter 5's one selected expression. Add a list of selected
expressions and explicit output aliases while retaining one input table and the
existing one-table binding scope.

Visible outcome

A query projects an employee name and a computed salary into two deliberately
named output columns.
-->

> A result row can contain more than one answer.

<figure class="book-illustration">
  <img src="images/006-one-expression-becomes-an-output-list.png" alt="A narrow one-column result from one selected expression expands into a two-column result whose employee name and computed salary have explicit output names.">
  <figcaption>Projection becomes a named list of expressions, so one input row can produce a wider output row.</figcaption>
</figure>

Chapter 5 can evaluate a complete expression tree, but its `Query` still stores
only one projection expression. That prevents a query from returning a column
and a computed value together:

```sql
SELECT e.name AS employee_name,
       e.salary + 1000 AS raised_salary
FROM employees AS e
WHERE e.salary > 50000;
```

This chapter changes projection from one expression into a named list. It does
not change the input side of the query: binding still uses one table and the
logical plan remains `Project -> Filter -> Scan`.

The prompt has accepted multiline SQL since Chapter 3, so the query can already
be entered in this readable form. This chapter carries its select list through
the frontend:

```text
comma-separated SQL
        ↓ parse
Vec<SelectExpression>
        ↓ bind in one Scope
Vec<ProjectExpression>
        ↓ evaluate for each surviving row
one wider Row
```

The final step needs no new plan node. Chapter 5 already made `Project` hold a
vector of checked expressions; this chapter finally gives that vector more than
one entry.

Before changing the program, begin from the completed Chapter 5 checkpoint:

```bash
git switch --create chapter-006 lesson-005
```

## 6.1 Represent a select list

The query grammar currently accepts one expression after `SELECT`. Replace that
single position with a comma-separated list:

```text
query             = "SELECT" select_list
                    "FROM" identifier alias?
                    "WHERE" expression ";" ;

select_list       = select_expression ("," select_expression)* ;
select_expression = expression alias? ;
alias             = "AS"? identifier ;
```

`select_list` must contain at least one item. The parenthesized group may then
repeat zero or more times, so every additional item begins with a comma.
`SELECT FROM ...` remains invalid, while one selected expression remains valid.

Each item needs both the expression to compute and the optional name supplied
by the query. Introduce that pair beside `Query`, then replace its singular
projection with a vector.

`src/parser.rs`: replace `Query` and add `SelectExpression`

```rust
#[derive(Debug, PartialEq, Eq)]
pub struct Query {
    pub projections: Vec<SelectExpression>,
    pub table: String,
    pub table_alias: Option<String>,
    pub filter: Expr,
}

#[derive(Debug, PartialEq, Eq)]
pub struct SelectExpression {
    pub expression: Expr,
    pub alias: Option<String>,
}
```

For the representative query, the vector will contain two entries:

```text
SelectExpression {
    expression: Column(e.name),
    alias: Some("employee_name"),
}

SelectExpression {
    expression: Add(Column(e.salary), Integer(1000)),
    alias: Some("raised_salary"),
}
```

These are still unresolved AST expressions. The aliases name their eventual
outputs; they do not participate in resolving `e.name` or `e.salary`.

## 6.2 Recognize the comma

The new grammar contains only one token that the lexer does not already know:
the comma separating selected expressions. Add its representation beside the
other punctuation tokens.

`src/lexer.rs`: add `Comma` after `Dot` in `Token`

```rust
Dot,
Comma,
LeftParen,
```

Then recognize its one-character spelling in the punctuation helper.

`src/lexer.rs`: add the comma arm after the dot arm in `punctuation()`

```rust
('.', _) => Some((Token::Dot, 1)),
(',', _) => Some((Token::Comma, 1)),
('(', _) => Some((Token::LeftParen, 1)),
```

`AS` and identifiers already have tokens, so output aliases need no other
lexer change. The parser can now distinguish the boundary between one selected
expression and the next.

## 6.3 Parse every selected expression

We will implement the two new grammar productions directly:

```text
select_list       = select_expression ("," select_expression)* ;
select_expression = expression alias? ;
```

`parse_select_expression()` delegates the expression to the precedence parser
from Chapter 4. That parser naturally stops at `AS`, a direct alias, or a
comma because none of them is an expression operator. The existing
`parse_alias()` method can then consume the optional output alias.

`src/parser.rs`: add before `parse_alias()`

```rust
fn parse_select_list(&mut self) -> Result<Vec<SelectExpression>, ParseError> {
    let mut expressions = vec![self.parse_select_expression()?];
    while self.consume(&Token::Comma) {
        expressions.push(self.parse_select_expression()?);
    }
    Ok(expressions)
}

fn parse_select_expression(&mut self) -> Result<SelectExpression, ParseError> {
    Ok(SelectExpression {
        expression: self.parse_expression()?,
        alias: self.parse_alias()?,
    })
}
```

The first call before the loop implements the required first
`select_expression`. Each successful comma consumption implements one
repetition of `("," select_expression)*`. If there is no comma, the loop ends
without consuming `FROM`.

The outer query parser should now ask for the complete list rather than one
expression.

`src/parser.rs`: replace `parse_query()`

```rust
fn parse_query(&mut self) -> Result<Query, ParseError> {
    self.expect(Token::Select, "expected SELECT at start of query")?;
    let projections = self.parse_select_list()?;
    self.expect(Token::From, "expected FROM after select list")?;
    let table = self.identifier("expected a table name after FROM")?;
    let table_alias = self.parse_alias()?;
    self.expect(Token::Where, "expected WHERE after table name")?;
    let filter = self.parse_expression()?;
    self.expect(Token::Semicolon, "expected ; after query")?;
    if self.current != self.tokens.len() {
        return Err(ParseError("unexpected token after ;".into()));
    }
    Ok(Query {
        projections,
        table,
        table_alias,
        filter,
    })
}
```

The same `parse_alias()` now serves two positions. Immediately after a selected
expression it records an output alias; immediately after the table identifier
it records a table alias. The grammar determines which meaning the returned
text has.

Changing `Query` makes Chapter 5's binder temporarily stale because it still
reads `query.projection`. Before reconnecting it, inspect exactly what the
frontend now produces.

## 6.4 Inspect the expanded AST

Temporarily use the program as an AST inspector. This isolates the completed
lexer and parser from the binder that we have not updated yet.

`src/main.rs`: temporarily replace the file

```rust
mod expression;
mod lexer;
mod parser;
#[allow(dead_code)] // Row execution reconnects later in this chapter.
mod row;

use std::io::{self, Write};

use parser::parse;

fn main() -> io::Result<()> {
    print!("sql> ");
    io::stdout().flush()?;

    let mut sql = String::new();
    while !sql.trim_end().ends_with(';') {
        if !sql.is_empty() {
            print!("...> ");
            io::stdout().flush()?;
        }
        if io::stdin().read_line(&mut sql)? == 0 {
            break;
        }
    }

    match parse(&sql) {
        Ok(query) => println!("{query:#?}"),
        Err(error) => eprintln!("error: {error}"),
    }
    Ok(())
}
```

Run it and enter the representative query:

```bash
cargo run --quiet
```

The relevant portion of the output contains two selected expressions and both
aliases:

```text
projections: [
    SelectExpression {
        expression: Column { qualifier: Some("e"), name: "name" },
        alias: Some("employee_name"),
    },
    SelectExpression {
        expression: Binary { ... },
        alias: Some("raised_salary"),
    },
]
```

The parser has preserved the list and its names, but it has not checked either
expression. We now need to send both entries through the one-table scope built
in Chapter 5.

## 6.5 Bind and name every output

Table lookup and scope construction do not change. Both selected expressions
belong to the same query and therefore reuse the same `Scope`:

```text
employees catalog entry + alias e
                 ↓
              Scope
              ↙   ↘
        e.name     e.salary + 1000
```

Replace the single projection binding inside `Catalog::bind()` with a loop over
`query.projections`.

`src/catalog.rs`: replace the old projection-binding block

```rust
let mut expressions = Vec::new();
for selected in query.projections {
    let (expression, _) = bind_expression(selected.expression, &scope)?;
    let name = selected.alias.unwrap_or_else(|| match &expression {
        BoundExpr::Column(name) => name.clone(),
        _ => "expression".into(),
    });
    if expressions
        .iter()
        .any(|existing: &ProjectExpression| existing.name == name)
    {
        return Err(format!("duplicate output column: {name}"));
    }
    expressions.push(ProjectExpression { name, expression });
}
```

Each iteration does three things in order:

1. `bind_expression()` resolves and type-checks the selected expression.
2. The binder chooses its output name. An explicit alias wins, a bare column
   keeps its column name, and an unnamed computation still uses `expression`.
3. The new `ProjectExpression` pairs that name with the checked tree.

The duplicate-name check reflects the current `Row` representation. A row
stores each value beside a name, and later name-based lookup should not have to
choose between two fields with the same name. For example, `SELECT name, name`
now fails during binding with `duplicate output column: name`.

Finally, give the existing project node the vector we just assembled.

`src/catalog.rs`: replace the `Plan::Project` expression field

```rust
Ok(Plan::Project {
    expressions,
    input: Box::new(Plan::Filter {
        predicate,
        input: Box::new(Plan::Scan {
            rows: table.rows.clone(),
        }),
    }),
})
```

The resulting plan keeps its existing shape:

```text
Project [employee_name, raised_salary]
  Filter salary > 50000
    Scan employees
```

There is no change to `Plan` or `Plan::execute()`. Chapter 5 already defined
`Project` with `Vec<ProjectExpression>` and made it evaluate every entry for
each input row. Previously the binder always created a vector of length one;
now it can fill the same vector from the complete select list.

<figure class="book-illustration book-diagram">
  <img src="images/006-selected-expressions-become-output-fields.png" alt="Two selected SQL expressions with aliases become two checked ProjectExpression entries, which Project evaluates to construct the employee_name and raised_salary fields of each output row.">
  <figcaption>Each selected expression carries its output name and checked computation into one field of the projected row.</figcaption>
</figure>

## 6.6 Reconnect the application

The AST checkpoint has served its purpose. Restore the complete application,
including the inherited prompt, and update the fixed demonstration to use both
outputs. The catalog and shared parse-bind-execute path are unchanged from
Chapter 5.

`src/main.rs`: replace the file

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

fn main() {
    let catalog = employee_catalog();
    if std::env::args().nth(1).as_deref() == Some("--prompt") {
        run_prompt(&catalog).expect("failed to read SQL from the terminal");
    } else {
        run_demo(&catalog);
    }
}

fn employee(id: i64, name: &str, salary: i64) -> Row {
    Row::new(vec![
        ("id", Value::Integer(id)),
        ("name", Value::Text(name.into())),
        ("salary", Value::Integer(salary)),
    ])
}

fn employee_catalog() -> Catalog {
    Catalog::new(vec![Table {
        name: "employees".into(),
        columns: vec![
            Column {
                name: "id".into(),
                data_type: DataType::Integer,
            },
            Column {
                name: "name".into(),
                data_type: DataType::Text,
            },
            Column {
                name: "salary".into(),
                data_type: DataType::Integer,
            },
        ],
        rows: vec![
            employee(1, "Ada", 70_000),
            employee(2, "Linus", 50_000),
            employee(3, "Grace", 72_000),
        ],
    }])
}

fn execute_sql(sql: &str, catalog: &Catalog) -> Result<Vec<Row>, String> {
    let query = parse(sql).map_err(|error| error.to_string())?;
    catalog.bind(query)?.execute()
}

fn run_demo(catalog: &Catalog) {
    let sql = "SELECT e.name AS employee_name, \
        e.salary + 1000 AS raised_salary \
        FROM employees AS e \
        WHERE e.salary > 50000;";
    let rows = execute_sql(sql, catalog).expect("the lesson query should execute");
    println!("Employees with projected raises:");
    for row in rows {
        println!("{row}");
    }
}

fn run_prompt(catalog: &Catalog) -> io::Result<()> {
    loop {
        let mut sql = String::new();

        loop {
            if sql.is_empty() {
                print!("sql> ");
            } else {
                print!("...> ");
            }
            io::stdout().flush()?;

            let mut line = String::new();
            if io::stdin().read_line(&mut line)? == 0 {
                println!();
                if !sql.trim().is_empty() {
                    eprintln!("error: incomplete query at end of input");
                }
                return Ok(());
            }
            if sql.is_empty() && line.trim().is_empty() {
                break;
            }
            if append_sql_line(&mut sql, &line) {
                break;
            }
        }

        if !sql.trim().is_empty() {
            print_query_result(&sql, catalog);
        }
    }
}

fn append_sql_line(sql: &mut String, line: &str) -> bool {
    sql.push_str(line);
    line.trim_end().ends_with(';')
}

fn print_query_result(sql: &str, catalog: &Catalog) {
    match execute_sql(sql, catalog) {
        Ok(rows) => {
            for row in rows {
                println!("{row}");
            }
        }
        Err(error) => eprintln!("error: {error}"),
    }
}
```

Compile the reconnected application:

```bash
cargo check
```

## 6.7 Run the wider projection

Run the fixed demonstration:

```bash
cargo run --quiet
```

```text
Employees with projected raises:
{employee_name: "Ada", raised_salary: 71000}
{employee_name: "Grace", raised_salary: 73000}
```

The filter retains Ada and Grace exactly as before. For each surviving input
row, `Project` evaluates both checked expressions and passes their two names
and values to `Row::from_owned()`. One input row therefore produces one output
row with two fields.

Start the prompt and enter the same query in its readable form:

```bash
cargo run --quiet -- --prompt
```

```text
sql> SELECT e.name AS employee_name,
...>        e.salary + 1000 AS raised_salary
...> FROM employees AS e
...> WHERE e.salary > 50000;
{employee_name: "Ada", raised_salary: 71000}
{employee_name: "Grace", raised_salary: 73000}
```

After the inherited prompt receives the semicolon, parsing produces two
`SelectExpression` nodes, binding produces two checked `ProjectExpression`
nodes, and the existing executor constructs the wider rows.

Output-name errors also occur before any rows are scanned:

```text
sql> SELECT name, name FROM employees WHERE TRUE;
error: duplicate output column: name
```

An alias resolves the conflict:

```text
sql> SELECT name, name AS copied_name FROM employees WHERE id = 1;
{name: "Ada", copied_name: "Ada"}
```

## 6.8 What we deliberately did not build

- A query still has exactly one input table.
- Every query still requires `WHERE`.
- A computed expression without an alias still receives the temporary name
  `expression`.
- Duplicate output names are rejected instead of introducing a richer result
  schema representation.

These limits keep the chapter focused on widening projection. The next chapter
changes the other side of the query by allowing more than one input table.

## 6.9 Try it

Run the prompt, predict the output names or error, and then try each query.

1. Select `name, salary` without aliases.
2. Select `name, salary + 1000 AS raised_salary`.
3. Remove `AS` from both aliases in the representative query.
4. Select `salary + 1000, salary - 1000` without aliases.
5. Select `name AS result, salary AS result`.
6. Select `name AS employee_name, salary, salary + 1000 AS raised_salary`.

<details>
<summary>Check your reasoning</summary>

1. Both bare columns retain their names, producing `name` and `salary`.
2. The bare column is named `name`; the computation uses its explicit
   `raised_salary` alias.
3. Direct aliases are accepted, so the result is unchanged.
4. Both computations receive the fallback name `expression`, so binding
   rejects the duplicate output name.
5. Binding reports `duplicate output column: result`.
6. The result contains three fields in select-list order: `employee_name`,
   `salary`, and `raised_salary`.

</details>

## 6.10 One output list, one input scope

Projection can now compute and name several values, but every column still
comes from the same table. That makes an unqualified name such as `name`
unambiguous.

Consider what changes when the database has two tables:

```text
employees(id, name, department_id)
departments(id, name)
```

A useful query needs values from both:

```sql
SELECT e.name AS employee_name, d.name AS department_name
FROM employees AS e, departments AS d
WHERE e.department_id = d.id;
```

The projection list and its output aliases are no longer a problem. The
remaining difficulty is on the input side. The binder must track both table
aliases, decide which table owns each column, and reject an unqualified `name`
because both inputs define one.

After those names are resolved, execution must combine an employee row with a
department row before the existing filter can test their identifiers and the
project node can produce the two named outputs. That row-combining operation is
a **join**.

The next chapter expands the binding scope from one table to several, adds the first
logical `Join` node, and makes its straightforward nested-loop execution
visible.
