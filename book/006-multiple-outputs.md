# 6. Multiple Outputs

<!--
Chapter contract

Continue from Chapter 5's one selected expression. Add multiline prompt input,
a list of selected expressions, and explicit output aliases while retaining one
input table and the existing one-table binding scope.

Visible outcome

A query projects an employee name and a computed salary into two deliberately
named output columns. Longer SQL can be entered across several prompt lines.
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

The longer query also exposes a practical problem. The prompt currently sends
each line to the parser immediately, so pressing Enter after the `SELECT` line
produces an incomplete query. We will first let the prompt collect lines through
the terminating semicolon, then extend the projection grammar and carry every
selected expression into the existing `Project` node.

Before changing the program, begin from the completed Chapter 5 checkpoint:

```bash
git switch --create chapter-006 lesson-005
```

## 6.1 Let the prompt collect a complete statement

SQL uses `;` to terminate the statement accepted by our grammar. The prompt can
therefore keep reading after a newline and display `...> ` until the latest line
ends with that terminator.

The prompt still accepts one statement at a time. This is a small usability
change for increasingly long examples, not a general SQL script parser.

## 6.2 Turn projection into a list

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

The repeated group has the same shape used by the expression precedence rules:
parse one item, then consume another item while a comma is present. `Query`
will consequently store `Vec<SelectExpression>` instead of one `Expr`.

Each selected item keeps two pieces of information:

```rust
pub struct SelectExpression {
    pub expression: Expr,
    pub alias: Option<String>,
}
```

The expression says what value to compute. The optional alias says what the
result column should be called.

## 6.3 Recognize commas and output aliases

Add `Comma` to `Token` and recognize `,` in the punctuation match. The parser
can then build the projection list with two production methods:

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

The existing expression parser stops before `AS` or `,` because neither token
is an expression operator. `parse_alias()` can then consume an explicit `AS`
alias or the direct alias form.

## 6.4 Bind every selected expression

The table lookup and `Scope` do not change. Once that one-table scope exists,
the binder walks every selected expression through the same
`bind_expression()` function used in Chapter 5.

For each checked expression, the binder also chooses its output name:

- an explicit alias wins;
- a bare column retains its column name;
- a computed expression without an alias temporarily uses `expression`.

The representative query names both results explicitly, so the output schema
is unambiguous. Duplicate output names are rejected because the current `Row`
representation stores a name beside each value and later consumers should not
have to guess which duplicate name was intended.

The resulting plan keeps its existing shape but its `Project` node now contains
two `ProjectExpression` values:

```text
Project [employee_name, raised_salary]
  Filter salary > 50000
    Scan employees
```

<figure class="book-illustration book-diagram">
  <img src="images/006-selected-expressions-become-output-fields.png" alt="Two selected SQL expressions with aliases become two checked ProjectExpression entries, which Project evaluates to construct the employee_name and raised_salary fields of each output row.">
  <figcaption>Each selected expression carries its output name and checked computation into one field of the projected row.</figcaption>
</figure>

## 6.5 Run the wider projection

Run the fixed demonstration:

```bash
cargo run --quiet
```

```text
Employees with projected raises:
{employee_name: "Ada", raised_salary: 71000}
{employee_name: "Grace", raised_salary: 73000}
```

The `Filter` still decides which input rows continue. `Project` evaluates both
bound expressions for each surviving row and constructs one wider output row.

The prompt now accepts the same query in its readable multiline form:

```text
sql> SELECT e.name AS employee_name,
...>        e.salary + 1000 AS raised_salary
...> FROM employees AS e
...> WHERE e.salary > 50000;
```

## 6.6 What we deliberately did not build

- A query still has exactly one input table.
- Every query still requires `WHERE`.
- A computed expression without an alias still receives the temporary name
  `expression`.
- Duplicate output names are rejected instead of introducing a richer result
  schema representation.
- The prompt accepts one semicolon-terminated statement at a time.

These limits keep the chapter focused on widening projection. The next chapter
changes the other side of the query by allowing more than one input table.

## 6.7 One output list, one input scope

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

Chapter 7 expands the binding scope from one table to several, adds the first
logical `Join` node, and makes its straightforward nested-loop execution
visible.
