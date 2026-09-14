# 3. SQL Is Just a Frontend

<!--
Chapter contract

Continue directly from Chapter 2's closing need: a person should be able to
write SQL instead of constructing a logical plan by hand. Begin with the
familiar employee query, treat its text as ordinary characters, and derive the
smallest lexer, parser, AST, and plan conversion that can execute it.

Visible outcome

The reader can pass the supported SQL query to the program and receive Ada and
Grace. They can explain the separate jobs of tokens, syntax, an AST, and a
logical plan. They also understand that accepting one deliberately tiny SQL
shape is not a claim of SQL-89 compliance.
-->

> SQL lets us write a plan without drawing the tree ourselves.

<figure class="book-illustration">
  <img src="images/003-sql-becomes-a-plan.png" alt="A short SQL request enters a database and emerges as a Scan, Filter, and Project plan.">
<figcaption>SQL is the request; the plan is the structure our engine can execute.</figcaption>
</figure>

To build along with this chapter, begin with the previous checkpoint:

```bash
git switch --create chapter-003 lesson-002
```

The `lesson-003` tag contains the completed version for comparison or
recovery. The edits below take the code from `lesson-002` to that completed
state.

Chapter 2 ended with a plan that our engine could inspect and execute. There
was only one inconvenience: we had to construct that plan ourselves. A person
should be able to write a request like this instead:

```sql
SELECT name
FROM employees
WHERE salary > 50000;
```

To us, the request already looks meaningful. To the program, it begins as a
sequence of characters. Before the existing engine can run it, a new frontend
must recognize the words and punctuation, discover how they fit together, and
turn that structure into the logical plan we already understand.

This chapter follows that journey:

```text
SQL
 ↓
Tokens
 ↓
Syntax tree
 ↓
Logical plan
 ↓
Rows
```

The downward arrows follow source text as the frontend turns it into
successively more useful representations. This differs from the plan diagrams
in Chapters 1 and 2, where upward arrows show rows moving from a scan toward
the plan root.

We will support only the query shown above and other queries with the same
shape. That narrow boundary lets us see every stage without hiding parsing
inside a library. Appendix B records the complete planned grammar. Later
chapters will implement more of it when aliases, expressions, joins,
aggregation, sorting, and subqueries give us a reason.

## 3.1 Give the frontend a place to answer

Before recognizing a single SQL word, we need somewhere to enter a query and
observe what the frontend does with it. We will add a small interactive prompt
that accepts one query at a time and prints what the database produces:

```text
$ cargo run --quiet -- --prompt
sql> SELECT name FROM employees WHERE salary > 50000;
{name: "Ada"}
{name: "Grace"}
sql>
```

This is a **read-evaluate-print loop**, usually shortened to **REPL**. It reads
one line, evaluates that line, prints either rows or an error, and then loops
back for another query. An end-of-file signal, usually Control-D on Linux and
macOS or Control-Z followed by Enter on Windows, leaves the prompt.

The prompt will make the frontend's growth visible. Its first version will
print tokens. The next version will print the AST. Once plan conversion is
connected, the same entered line will produce rows. Each step gives us
something concrete to inspect before we add the next one.

```text
characters → tokens → Query AST → logical plan → rows
```

The loop is only a thin shell. It must not contain lexing, parsing, or query
execution rules itself. Keeping one function responsible for evaluating a SQL
line means both the fixed demonstration and the prompt exercise the same
frontend.

## 3.2 SQL begins as characters

Place the query in a Rust string and it loses the structure that we see:

```text
SELECT name FROM employees WHERE salary > 50000;
```

The computer receives an `S`, followed by an `E`, followed by an `L`, and
so on. It does not begin with a `SELECT` clause, a table name, or a predicate.
Those are interpretations that we bring to the text. The frontend must recover
them before it can construct a plan.

Trying to find each clause with string splitting would work for this one
example, but small changes would quickly expose the trick. Extra spaces,
newlines, and lowercase keywords should not change the query. Names also have
different roles depending on where they occur. We need a representation that
is more useful than individual characters but simpler than a complete query.

## 3.3 Turn characters into tokens

Read the query from left to right and collect characters that belong together.
`SELECT` is one meaningful unit. So are `name`, `>`, `50000`, and `;`.
Such a unit is called a **token**. The component that produces tokens is a
**lexer**, sometimes called a scanner.

Our query becomes this sequence:

```text
Select
Identifier("name")
From
Identifier("employees")
Where
Identifier("salary")
GreaterThan
Integer(50000)
Semicolon
```

<figure class="book-illustration book-diagram">
  <img src="images/003-query-becomes-tokens.png" alt="A continuous SQL query strip separates into distinct keyword, identifier, symbol, integer, and semicolon token cards.">
  <figcaption>The lexer turns one stream of characters into meaningful units.</figcaption>
</figure>

Whitespace has disappeared because it separates units but does not affect this
query's meaning. Keywords receive their own token variants. User-chosen names
share `Identifier`, which retains their spelling. The number becomes an
integer now, rather than remaining five unrelated digit characters.

We will build the lexer in short passes. Begin with the seven kinds of token
our query can contain.

`src/lexer.rs`: create this file

```rust
use std::fmt;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Token {
    Select,
    From,
    Where,
    Identifier(String),
    GreaterThan,
    Integer(i64),
    Semicolon,
}
```

An invalid character needs a position and a readable explanation. Add the
error value below `Token`.

`src/lexer.rs`: add after `Token`

```rust
#[derive(Debug, PartialEq, Eq)]
pub struct LexError {
    position: usize,
    message: String,
}

impl fmt::Display for LexError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "at character {}: {}",
            self.position, self.message
        )
    }
}
```

Now start the lexer itself. It stores the source as characters, creates an
empty token list, and advances one cursor through the input.

`src/lexer.rs`: add after `impl fmt::Display for LexError`

```rust
pub fn tokenize(sql: &str) -> Result<Vec<Token>, LexError> {
    let characters: Vec<char> = sql.chars().collect();
    let mut tokens = Vec::new();
    let mut current = 0;

    while current < characters.len() {
        let character = characters[current];
```

Whitespace separates tokens, so it advances the cursor without adding
anything. A letter or underscore begins a word. The inner loop consumes the
rest of that word before `word_token()` classifies it.

`src/lexer.rs`: continue inside the `while` loop

```rust

        if character.is_whitespace() {
            current += 1;
        } else if character.is_ascii_alphabetic() || character == '_' {
            let start = current;
            current += 1;
            while current < characters.len()
                && (characters[current].is_ascii_alphanumeric()
                    || characters[current] == '_')
            {
                current += 1;
            }

            let word: String = characters[start..current].iter().collect();
            tokens.push(word_token(word));
```

A digit starts an integer. This branch consumes all adjacent digits and
converts them together, so `50000` becomes one value instead of five tokens.

`src/lexer.rs`: continue the same `if` chain

```rust
        } else if character.is_ascii_digit() {
            let start = current;
            current += 1;
            while current < characters.len() && characters[current].is_ascii_digit() {
                current += 1;
            }

            let digits: String = characters[start..current].iter().collect();
            let value = digits.parse().map_err(|_| LexError {
                position: start + 1,
                message: format!("integer is too large: {digits}"),
            })?;
            tokens.push(Token::Integer(value));
```

Only `>` and `;` remain. Any other character becomes the `LexError` defined
above. This branch also closes the loop and returns the completed token list.

`src/lexer.rs`: finish the `if` chain and `tokenize()`

```rust
        } else {
            let token = match character {
                '>' => Token::GreaterThan,
                ';' => Token::Semicolon,
                _ => {
                    return Err(LexError {
                        position: current + 1,
                        message: format!("unexpected character '{character}'"),
                    });
                }
            };
            tokens.push(token);
            current += 1;
        }
    }

    Ok(tokens)
}
```

Finally, classify a completed word. SQL keywords ignore letter case; every
other word remains an identifier with its original spelling.

`src/lexer.rs`: add after `tokenize()`

```rust
fn word_token(word: String) -> Token {
    if word.eq_ignore_ascii_case("SELECT") {
        Token::Select
    } else if word.eq_ignore_ascii_case("FROM") {
        Token::From
    } else if word.eq_ignore_ascii_case("WHERE") {
        Token::Where
    } else {
        Token::Identifier(word)
    }
}
```

The cursor named `current` points at the next character to inspect. Whitespace
advances it without producing a token. A letter begins a word, and a digit
begins an integer. Everything else in this lesson must be either `>` or `;`.
An unfamiliar character produces an error at the position where it appeared.

Keywords ignore ASCII letter case, so `select` and `SELECT` produce the same
token. Identifiers keep their original spelling because the next chapter must
decide how names correspond to tables and columns. The lexer recognizes units;
it does not decide whether a name exists or whether the sequence makes sense.

### 3.3.1 First prompt checkpoint

We have enough code to make the prompt useful for the first time. Temporarily
replace `main.rs` with this small shell. It reads one line, gives it to the
lexer, and prints either the token list or the lexical error.

`src/main.rs`: replace the module declarations, imports, and `main()`

```rust
mod lexer;

use std::io::{self, Write};

use lexer::tokenize;

fn main() -> io::Result<()> {
    run_prompt()
}

fn inspect_sql(sql: &str) {
    match tokenize(sql) {
        Ok(tokens) => println!("{tokens:#?}"),
        Err(error) => eprintln!("error: {error}"),
    }
}
```

The loop handles terminal input and delegates each nonempty line to
`inspect_sql()`.

`src/main.rs`: add after `inspect_sql()`

```rust
fn run_prompt() -> io::Result<()> {
    loop {
        print!("sql> ");
        io::stdout().flush()?;

        let mut sql = String::new();
        if io::stdin().read_line(&mut sql)? == 0 {
            println!();
            return Ok(());
        }

        if sql.trim().is_empty() {
            continue;
        }

        inspect_sql(&sql);
    }
}
```

Run `cargo run --quiet`, enter the employee query, and the prompt prints the
nine tokens shown above. Enter `SELECT @;` next. The prompt reports the
unexpected character and then asks for another line. We can now observe the
lexer directly instead of trusting that an unfinished frontend works.

The tokens are correct, but they are still only a flat list. Nothing in that
list says that `name` belongs after `SELECT`, or that `50000` must follow
`>`. To recover those relationships, we need to describe which token
sequences form a query.

## 3.4 Give the tokens a shape

A **grammar** is a set of rules describing valid structure. The complete
planned course grammar lives in Appendix B, but our first parser needs only
four productions:

```text
query          = select_clause from_clause where_clause ";" ;
select_clause  = "SELECT" identifier ;
from_clause    = "FROM" identifier ;
where_clause   = "WHERE" identifier ">" integer ;
```

Read the first rule as a recipe. A query contains a select clause, followed by
a from clause, followed by a where clause and a semicolon. The other rules say
what each clause contains. The quoted words and symbols must appear literally;
`identifier` and `integer` refer to token categories.

This grammar deliberately rejects useful SQL. It cannot select two columns,
omit `WHERE`, compare text, or use another comparison operator. That is not a
parser defect. It is the language boundary for this lesson, and an unsupported
query should fail clearly instead of being interpreted approximately.

The component that checks tokens against these rules is a **parser**. A parser
plays the grammar from the outer `query` rule inward, consuming one expected
token at a time. When the next token cannot satisfy the current rule, parsing
stops with a syntax error.

## 3.5 Keep the parsed query as data

Successfully checking the grammar is not enough. Later stages need the names
and number found in the query. We store them in an **abstract syntax tree**,
usually shortened to **AST**. An AST preserves the meaningful structure while
discarding details, such as whitespace and keyword capitalization, that no
longer matter.

Our grammar has no nesting yet, so its first AST looks more like a record than
a branching tree:

`src/parser.rs`: create the parsed-query representation

```rust
#[derive(Debug, PartialEq, Eq)]
pub struct Query {
    pub selected_column: String,
    pub table: String,
    pub filter_column: String,
    pub greater_than: i64,
}
```

For the employee query, the four fields contain `name`, `employees`,
`salary`, and `50000`. This value describes what the text said. It has not
read a table, filtered a row, or chosen a column. An AST represents source
language structure; the logical plan represents relational work.

That distinction will become more obvious as SQL grows. Parentheses, aliases,
and different spellings may produce different source structures while still
leading to equivalent plans. Keeping the AST separate gives the frontend a
place to understand SQL before the execution engine needs to care about it.

## 3.6 Parse one complete query

The public parsing function first asks the lexer for tokens. If tokenization
succeeds, it creates a parser positioned at the first token and asks for one
complete query. Both lexical and syntax failures reach the caller through the
same small error type.

Here is the complete parser at this checkpoint. Replace the smaller `Query`
file from the previous section with this listing, so there are no missing
fields, helper methods, imports, or braces to infer.

Start by importing the lexer and defining the error returned to callers.

`src/parser.rs`: add at the top of the file

```rust
use std::fmt;

use crate::lexer::{Token, tokenize};

#[derive(Debug, PartialEq, Eq)]
pub struct ParseError(String);

impl fmt::Display for ParseError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.0)
    }
}
```

The public function turns SQL into tokens, places them in a `Parser`, and asks
that parser for one query.

`src/parser.rs`: add after `impl fmt::Display for ParseError`

```rust
pub fn parse(sql: &str) -> Result<Query, ParseError> {
    let tokens = tokenize(sql).map_err(|error| ParseError(error.to_string()))?;
    let mut parser = Parser { tokens, current: 0 };
    parser.query()
}

struct Parser {
    tokens: Vec<Token>,
    current: usize,
}
```

Each grammar clause gets a method. These first two consume a keyword followed
by an identifier.

`src/parser.rs`: begin `impl Parser`

```rust
impl Parser {
    fn parse_select_clause(&mut self) -> Result<String, ParseError> {
        self.expect(Token::Select, "expected SELECT")?;
        self.identifier("expected a column name after SELECT")
    }

    fn parse_from_clause(&mut self) -> Result<String, ParseError> {
        self.expect(Token::From, "expected FROM after selected column")?;
        self.identifier("expected a table name after FROM")
    }
```

The `WHERE` clause returns both pieces needed by our filter.

`src/parser.rs`: continue inside `impl Parser`

```rust
    fn parse_where_clause(&mut self) -> Result<(String, i64), ParseError> {
        self.expect(Token::Where, "expected WHERE after table name")?;
        let column = self.identifier("expected a column name after WHERE")?;
        self.expect(Token::GreaterThan, "expected > after filter column")?;
        let value = self.integer("expected an integer after >")?;
        Ok((column, value))
    }
```

The outer rule calls those clause methods in grammar order and then requires
the semicolon.

`src/parser.rs`: continue inside `impl Parser`

```rust
    fn query(&mut self) -> Result<Query, ParseError> {
        let selected_column = self.parse_select_clause()?;
        let table = self.parse_from_clause()?;
        let (filter_column, greater_than) = self.parse_where_clause()?;
        self.expect(Token::Semicolon, "expected ; after query")?;

        if self.current != self.tokens.len() {
            return Err(ParseError("unexpected token after ;".to_string()));
        }

        Ok(Query {
            selected_column,
            table,
            filter_column,
            greater_than,
        })
    }
```

Three small cursor helpers finish the parser. `expect()` handles fixed tokens;
the other methods recover values stored inside tokens.

`src/parser.rs`: continue inside `impl Parser`

```rust
    fn expect(&mut self, expected: Token, message: &str) -> Result<(), ParseError> {
        if self.tokens.get(self.current) == Some(&expected) {
            self.current += 1;
            Ok(())
        } else {
            Err(ParseError(message.to_string()))
        }
    }
```

`src/parser.rs`: add after `expect()`

```rust
    fn identifier(&mut self, message: &str) -> Result<String, ParseError> {
        match self.tokens.get(self.current) {
            Some(Token::Identifier(value)) => {
                self.current += 1;
                Ok(value.clone())
            }
            _ => Err(ParseError(message.to_string())),
        }
    }
```

`src/parser.rs`: finish `impl Parser`

```rust
    fn integer(&mut self, message: &str) -> Result<i64, ParseError> {
        match self.tokens.get(self.current) {
            Some(Token::Integer(value)) => {
                self.current += 1;
                Ok(*value)
            }
            _ => Err(ParseError(message.to_string())),
        }
    }
}
```

The parser stores the token list and the position of the next token. Its
`query()` method follows the grammar in order. `expect()` consumes a fixed
token. The other two helpers recover values stored inside identifier and
integer tokens. Each successful step advances the cursor, so the next call
sees exactly what remains.

### 3.6.1 Second prompt checkpoint

Now let the same prompt reveal the structure recovered by the parser.

`src/main.rs`: add after `mod lexer;`

```rust
mod parser;
```

`src/main.rs`: replace `use lexer::tokenize;`

```rust
use parser::parse;
```

`src/main.rs`: replace `inspect_sql()`

```rust
fn inspect_sql(sql: &str) {
    match parse(sql) {
        Ok(query) => println!("{query:#?}"),
        Err(error) => eprintln!("error: {error}"),
    }
}
```

Running the employee query now prints a `Query` containing `name`,
`employees`, `salary`, and `50000`. The characters have become tokens, and the
tokens have become structured data. A missing semicolon now reaches the
parser and produces `expected ; after query`, while the loop remains ready for
the next attempt.

The order of these calls mirrors the four grammar rules. After consuming the
semicolon, the parser also checks that no token remains. Without that final
check, it could accept one valid query followed by arbitrary text and silently
ignore the unwanted part.

Errors describe the expectation that failed:

```text
SELECT name FROM employees WHERE salary > 50000
expected ; after query
```

This error does not attempt recovery because our program accepts only one
statement. A later multi-statement interface may need to find the next safe
boundary after an error. Today, stopping at the first precise failure keeps
both the implementation and its behavior easy to inspect.

## 3.7 Build the logical plan

Parsing gives us a `Query`, but the executor from Chapter 1 accepts a `Plan`.
The conversion is direct: the table supplies a scan, the `WHERE` clause
supplies a filter, and the selected column supplies a project at the root.

```text
Query AST                         Logical plan

selected_column: name             Project(name)
table: employees                       |
filter_column: salary             Filter(salary > 50000)
greater_than: 50000                    |
                                  Scan(employee rows)
```

<figure class="book-illustration book-diagram">
  <img src="images/003-ast-becomes-plan.png" alt="Four parsed query fields on the left map into Project, Filter, and Scan plan nodes on the right.">
  <figcaption>The parsed fields supply the information stored by each plan node.</figcaption>
</figure>

`src/parser.rs`: add the two new imports near the top

```rust
use crate::plan::Plan;
use crate::row::Row;
```

`src/parser.rs`: add after `Query`

```rust
impl Query {
    pub fn into_plan(self, rows: Vec<Row>) -> Plan {
        // The parser records the table name, but cannot resolve it yet.
        // Lesson 004 introduces binding. For now the caller supplies the rows.

        Plan::Project {
            columns: vec![self.selected_column],
            input: Box::new(Plan::Filter {
                column: self.filter_column,
                greater_than: self.greater_than,
                input: Box::new(Plan::Scan { rows }),
            }),
        }
    }
}
```

One missing action deserves attention. The AST records `employees`, but
`into_plan()` does not use that field to find data. Our database has no
catalog of named tables. The caller supplies the employee rows directly, and
the table name remains unresolved. We keep that gap visible instead of
pretending that parsing has solved name lookup.

## 3.8 Run SQL repeatedly

The frontend can finally replace its hand-built plan with a query string. We
put the whole path in `execute_sql()`: parse the text, convert the AST into a
plan, and execute that plan. Both entry points call this function, so the
interactive prompt cannot quietly behave differently from the demonstration.

Here is the complete application shell. The employee rows move into their own
function so both the fixed demonstration and the interactive prompt can begin
with the same table.

Begin by restoring the database modules alongside the new frontend modules.
`main()` creates the employee table explicitly, then chooses the fixed example
or the prompt.

`src/main.rs`: replace the temporary module declarations, imports, and `main()`

```rust
mod lexer;
mod parser;
mod plan;
mod row;

use std::io::{self, Write};

use parser::parse;
use row::{Row, Value};

fn main() {
    let employees = employee_rows();
    if std::env::args().nth(1).as_deref() == Some("--prompt") {
        run_prompt(&employees).expect("failed to read SQL from the terminal");
    } else {
        run_demo(&employees);
    }
}
```

The program still needs the same employee rows from Chapter 1. Begin with a
small function that creates one employee row.

`src/main.rs`: add after `main()`

```rust
fn employee(id: i64, name: &str, salary: i64) -> Row {
    Row::new(vec![
        ("id", Value::Integer(id)),
        ("name", Value::Text(name.to_string())),
        ("salary", Value::Integer(salary)),
    ])
}
```

Now use it to construct the table.

`src/main.rs`: add after `employee()`

```rust
fn employee_rows() -> Vec<Row> {
    vec![
        employee(1, "Ada", 70_000),
        employee(2, "Linus", 50_000),
        employee(3, "Grace", 72_000),
    ]
}
```

One function now owns the complete SQL-to-rows path.

`src/main.rs`: add after `employee_rows()`

```rust
fn execute_sql(sql: &str, rows: &[Row]) -> Result<Vec<Row>, String> {
    let query = parse(sql).map_err(|error| error.to_string())?;
    Ok(query.into_plan(rows.to_vec()).execute())
}
```

The fixed demonstration calls it with the original query.

`src/main.rs`: add after `execute_sql()`

```rust
fn run_demo(employees: &[Row]) {
    let sql = "SELECT name FROM employees WHERE salary > 50000;";
    let result = execute_sql(sql, employees).expect("the lesson query should execute");

    println!("Employees earning more than 50,000:");
    for row in result {
        println!("{row}");
    }
}
```

The final prompt keeps the familiar input loop and sends each line to a small
printing function.

`src/main.rs`: add after `run_demo()`

```rust
fn run_prompt(employees: &[Row]) -> io::Result<()> {
    loop {
        print!("sql> ");
        io::stdout().flush()?;

        let mut sql = String::new();
        if io::stdin().read_line(&mut sql)? == 0 {
            println!();
            return Ok(());
        }
        if !sql.trim().is_empty() {
            print_query_result(&sql, employees);
        }
    }
}
```

`src/main.rs`: add after `run_prompt()`

```rust
fn print_query_result(sql: &str, employees: &[Row]) {
    match execute_sql(sql, employees) {
        Ok(rows) => {
            for row in rows {
                println!("{row}");
            }
        }
        Err(error) => eprintln!("error: {error}"),
    }
}
```

Read the prompt from the inside out. `read_line()` waits for one query.
`execute_sql()` evaluates it. The `match` prints either the returned rows or a
frontend error. The surrounding `loop` then prints `sql>` again. An empty line
does no work, while end-of-file returns from the prompt.

Run the complete program:

```bash
cargo run --quiet
```

It prints:

```text
Employees earning more than 50,000:
{name: "Ada"}
{name: "Grace"}
```

The executor has not changed. The same scan, filter, and project still produce
the rows. We added a frontend that turns one human-facing representation into
the logical representation the engine already knew. SQL is not the execution
engine; it is one way to describe work to it.

Before moving on, check that the program compiles and that the tests inherited
from Chapter 2 still pass:

```bash
cargo test
```

The completed `lesson-003` checkpoint also contains focused tests for the
lexer, parser, errors, and the complete path from SQL to Ada and Grace. They
remain outside the main narrative so we can follow the frontend itself without
interrupting it with test listings.

Now run the interactive path:

```bash
cargo run --quiet -- --prompt
```

Enter the original query, then change the boundary to `70000`. The first line
returns Ada and Grace. The second returns only Grace. A third malformed query
prints an error and leaves the prompt running, ready for another line.

## 3.9 What we deliberately did not parse

Our first frontend is intentionally narrow:

- It accepts exactly one selected column, one table, and one `WHERE`
  comparison.
- The comparison must use `>` with a non-negative integer.
- A semicolon is required, and no second statement may follow it.
- It has no aliases, qualified names, Boolean expressions, joins, functions,
  aggregation, ordering, or subqueries.
- It recognizes only ASCII letters, digits, and underscores in identifiers.
- It stops at the first lexical or syntax error.
- It records names but does not resolve them against tables or columns.

Appendix B shows where the language is heading, not what this version
already implements. Each later chapter will move a small group of rules into
the executable language. Accepting syntax before we can give it correct
database meaning would make the grammar look impressive while making the
system less trustworthy.

> **Production note: Real SQL parsers**
>
> Production systems accept much larger dialects, preserve source locations,
> report richer diagnostics, and often recover far enough to find several
> errors in one input. Our handwritten parser is useful because every token and
> rule is visible. We can replace or extend it when maintaining syntax begins
> to distract from the database concepts it serves.

## 3.10 Try it

Use the current lexer, parser, and employee rows for these experiments. Enter
each query at the prompt after predicting which stage will accept or reject it.

1. Change every keyword to lowercase. Does the result change?
2. Add several spaces and newlines between tokens. Which tokens record them?
3. Replace `>` with `@`. Does the lexer or parser report the error?
4. Remove `WHERE salary > 50000`. What token does the parser expect next?
5. Change `employees` to `missing_table`. Does parsing succeed? What happens
   if the caller still supplies the employee rows?

<details>
<summary>Check your reasoning</summary>

1. The result does not change because keywords are case-insensitive.
2. No token records whitespace. The lexer uses it only as a separator.
3. The lexer rejects `@` because it cannot form any token in this lesson.
4. After the table name, the parser reports that it expected `WHERE`.
5. Parsing succeeds, and the current conversion still executes the supplied
   employee rows. The parser knows that a table name belongs there, but it
   cannot decide what that name refers to.

</details>

The fifth result is the important one. Our frontend can recognize valid syntax
without understanding whether its names make sense. That is not merely another
missing token. It is a different kind of work.

## 3.11 Parsing is not understanding

Consider two queries:

```sql
SELECT name FROM employees WHERE salary > 50000;
SELECT name FROM missing_table WHERE salary > 50000;
```

Both follow the grammar, so both produce a `Query` AST. Yet only the first
table name should lead to our employee rows. The same problem appears with an
unknown column, and a subtler version appears when a query compares text with
an integer. Grammar alone cannot answer any of those questions.

The database needs a step that connects names in the AST to actual tables and
columns, then checks whether operations make sense for their types. That step
is called binding. The next chapter gives the unresolved names in our AST
something real to refer to.
