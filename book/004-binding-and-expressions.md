# 4. Binding Gives Names Meaning

<!--
Chapter contract

Continue from Chapter 3's unresolved table name. Add a minimal catalog,
expression trees, binding, type checking, and SQL three-valued logic.

Visible outcome

A qualified expression query returns Ada and Grace. Unknown tables, columns,
qualifiers, and invalid operand types fail before execution.
-->

> A parser can recognize a name. A database must decide what it names.

<figure class="book-illustration">
  <img src="images/004-parsing-is-not-binding.png" alt="The missing_table query passes a structural parser check, then fails when a binder compares its table name with a catalog containing only employees.">
  <figcaption>Valid structure does not guarantee that the names in a query exist.</figcaption>
</figure>

Chapter 3 deliberately accepted this query:

```sql
SELECT name FROM missing_table WHERE salary > 50000;
```

It even ran the employee rows supplied by the caller. The text followed our
grammar, so parsing succeeded. But Chapter 3 had no binding step to check
whether `missing_table` referred to a table in the database.

This chapter adds **binding**, the step that connects names in the AST to
database objects and checks whether their use makes sense:

```text
SQL → tokens → AST → binding → bound plan → rows
                       ↑
                     catalog
```

We will use this query to exercise the complete path:

```sql
SELECT e.name
FROM employees AS e
WHERE e.salary + 5000 > 70000 AND e.name IS NOT NULL;
```

Ada and Grace satisfy the condition. Linus does not.

Compared with Chapter 3, accepting this query requires table aliases,
qualified columns, arithmetic, Boolean operators, and null tests. The frontend
must preserve that structure so binding can resolve the names and check their
types. Here is the expanded grammar:

```text
query               = "SELECT" expression
                      "FROM" identifier alias?
                      "WHERE" expression ";" ;

alias               = "AS"? identifier ;

expression          = or_expression ;
or_expression       = and_expression ("OR" and_expression)* ;
and_expression      = not_expression ("AND" not_expression)* ;
not_expression      = "NOT" not_expression | predicate ;

predicate           = additive comparison_operator additive
                    | additive "IS" "NOT"? "NULL"
                    | additive ;

additive            = term (("+" | "-") term)* ;
term                = factor (("*" | "/") factor)* ;
factor              = ("+" | "-") factor | primary ;

primary             = column_reference | integer | string
                    | "TRUE" | "FALSE" | "NULL"
                    | "(" expression ")" ;

column_reference    = (identifier ".")? identifier ;
comparison_operator = "=" | "<>" | "<" | "<=" | ">" | ">=" ;
```

This block describes how tokens form a query. Identifiers and integers retain
the lexical rules implemented in Chapter 3. This chapter adds single-quoted
strings; [Appendix B](appendix-b-sql-grammar.md) records the complete lexical
grammar.

The grammar describes valid structure. Binding will provide the missing
meaning by resolving its table, alias, and column names and checking the types
used by its operators.

We will extend the frontend first. Sections 4.2 through 4.5 add the runtime
values, tokens, expression AST, and parser needed to support this grammar.
Section 4.6 then lets us inspect the recovered structure before adding
binding. The rest of the chapter gives that structure meaning: we introduce
the catalog, bind and type-check the expressions, evaluate the bound tree,
update the plan, and reconnect the application.

Before changing the program, begin from the completed Chapter 3 checkpoint:

```bash
git switch --create chapter-004 lesson-003
```

## 4.1 Reproduce the false success

Run the Chapter 3 prompt:

```bash
cargo run --quiet -- --prompt
```

Enter the `missing_table` query. It returns Ada and Grace because
`Query::into_plan()` ignores the parsed table name and accepts rows directly
from its caller.

The lexer can decide whether characters form tokens. The parser can decide
whether those tokens have a valid shape. Neither can decide whether a name
refers to something in this database. We need a new stage for that question.
Before building it, we will extend the Chapter 3 frontend so it can produce
the richer AST that binding must inspect.

## 4.2 Extend `Value`

The expanded grammar requires rows to carry Boolean and null results, so
`Value` needs two new variants. Adding those variants also makes every existing
match on `Value` incomplete until it handles them. We will update `row.rs`
first, then make a temporary compatibility change to Chapter 3's integer-only
filter.

### 4.2.1 Add Boolean and null values

The expanded grammar adds Boolean expressions, `TRUE`, `FALSE`, and `NULL`.
Their results must fit into rows and pass between expression operators, so the
runtime `Value` representation needs two more variants. `Boolean` stores
`true` or `false`, while `Null` represents SQL's unknown value rather than an
empty string or zero.

`src/row.rs`: add two variants to `Value`

```rust
pub enum Value {
    Integer(i64),
    Text(String),
    Boolean(bool),
    Null,
}
```

`Value::Null` represents SQL `NULL` while a query is running. It is a distinct
value rather than an empty string, zero, or `false`.

`Row::new()` accepts borrowed column names, then builds a new vector and turns
each name into an owned `String`. Projection already produces a
`Vec<(String, Value)>`. A second constructor can move that vector directly into
the row without rebuilding it or converting its names again. The row still
owns the vector and all its contents; it does not store references to them.

`src/row.rs`: add to the first `impl Row`

```rust
pub fn from_owned(values: Vec<(String, Value)>) -> Self {
    Self { values }
}
```

The two new values also need printable forms.

`src/row.rs`: add arms to `impl fmt::Display for Value`

```rust
Value::Boolean(value) => write!(formatter, "{value}"),
Value::Null => write!(formatter, "NULL"),
```

### 4.2.2 Keep the old filter compiling

The Chapter 3 `Plan::Filter` stores a `column` and a `greater_than` integer, so
it can evaluate only one fixed predicate: `column > greater_than`. Chapter 4
needs a general expression predicate that can include arithmetic, comparisons,
Boolean operators, and null tests. Section 4.11 will make that larger change.

Until then, the old filter must continue compiling. It calls
`row.get(column)`, which returns `Some(value)` when the column exists and
`None` when it does not. Previously, `Text` was the only non-integer `Value`,
so the match handled an integer, text, or a missing column.

Adding `Boolean` and `Null` creates two more possible values. Rust now requires
the match to handle them, even though this temporary filter cannot use them.
Group every non-integer value under `Some(_)`:

`src/plan.rs`: replace the value match in `Plan::Filter`

```rust
let value = match row.get(column) {
    Some(Value::Integer(value)) => value,
    Some(_) => panic!("column is not an integer: {column}"),
    None => panic!("unknown column: {column}"),
};
```

The first arm extracts an integer. The second reports that an existing column
contains the wrong kind of value, and the third reports that the column does
not exist. This temporary edit preserves the old behavior while we build its
replacement. We now have the value kinds expressions can produce. Next we
teach the lexer to recognize the expanded grammar.

## 4.3 Extend the lexer

The expanded grammar introduces three kinds of input that Chapter 3's lexer
cannot yet recognize: new fixed words such as `AND` and `TRUE`, quoted string
literals, and additional punctuation operators such as `<=` and `<>`. We
will add a token representation for each kind, then teach the scanner how to
recognize it.

### 4.3.1 Add the new tokens

The expanded expression grammar needs more vocabulary than Chapter 3. The
representative query uses many of these tokens; the remaining ones make the
other grammar forms executable, such as `name = 'Ada'` or
`(salary + 5000) > 70000`.

| Tokens | Purpose |
| --- | --- |
| `As` | introduce a table alias |
| `And`, `Or`, `Not` | combine or negate conditions |
| `Is`, `Null` | form null tests and null literals |
| `True`, `False` | represent Boolean literals |
| `String` | preserve text inside single quotes |
| `Plus`, `Minus`, `Star`, `Slash` | form arithmetic expressions |
| comparison variants | compare two expressions |
| `Dot` | separate a qualifier from a column |
| parentheses | group an expression explicitly |

Every quoted keyword or symbol in the grammar needs a fixed token variant.
For example, grammar terminal `"AND"` becomes `Token::And`, `"+"` becomes
`Token::Plus`, and `"."` becomes `Token::Dot`. Grammar categories that carry
input data use variants with fields: `identifier` becomes
`Identifier(String)`, `integer` becomes `Integer(i64)`, and `string` becomes
`String(String)`.

`src/lexer.rs`: replace `Token`

```rust
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Token {
    Select, From, Where, As, And, Or, Not, Is, Null, True, False,
    Identifier(String), Integer(i64), String(String),
    Plus, Minus, Star, Slash, Equal, NotEqual,
    Less, LessOrEqual, Greater, GreaterOrEqual,
    Dot, LeftParen, RightParen, Semicolon,
}
```

These variants define how the lexer will represent the expanded vocabulary.
The scanning rules below still need to recognize the corresponding text.

### 4.3.2 Lex string literals

The lexical rule for `string` begins with a single quote, consumes characters
until its closing quote, and produces one `Token::String`. For example:

```text
'Ada'         → String("Ada")
'It''s ready' → String("It's ready")
```

SQL writes two adjacent quotes inside a string to represent one quote in its
value. The lexer therefore needs a string branch that consumes the entire
multi-character token. A lone quote must not fall through to the punctuation
helper and become an unexpected character.

`src/lexer.rs`: add after the integer branch in `tokenize()`

```rust
} else if character == '\'' {
    let start = current;
    current += 1;
    let mut value = String::new();

    loop {
        if current >= characters.len() {
            return Err(LexError {
                position: start + 1,
                message: "unterminated string".to_string(),
            });
        }
        if characters[current] == '\'' {
            if characters.get(current + 1) == Some(&'\'') {
                value.push('\'');
                current += 2;
            } else {
                current += 1;
                break;
            }
        } else {
            value.push(characters[current]);
            current += 1;
        }
    }
    tokens.push(Token::String(value));
```

The complete branch turns both examples into one string token. An unmatched
opening quote instead returns `unterminated string`.

### 4.3.3 Recognize operators and keywords

The expanded grammar also adds several punctuation tokens, including
two-character operators such as `<=` and `<>`. Moving punctuation recognition
into a helper keeps that growing match separate from the main character scan.

`src/lexer.rs`: replace the final `else` branch in `tokenize()`

```rust
} else {
    let (token, consumed) = punctuation(&characters, current)
        .ok_or_else(|| LexError {
            position: current + 1,
            message: format!("unexpected character '{character}'"),
        })?;

    tokens.push(token);
    current += consumed;
}
```

The helper recognizes two-character operators before their one-character
prefixes.

`src/lexer.rs`: add after `tokenize()`

```rust
fn punctuation(characters: &[char], current: usize) -> Option<(Token, usize)> {
    match (characters[current], characters.get(current + 1)) {
        ('<', Some('=')) => Some((Token::LessOrEqual, 2)),
        ('<', Some('>')) => Some((Token::NotEqual, 2)),
        ('>', Some('=')) => Some((Token::GreaterOrEqual, 2)),
        ('+', _) => Some((Token::Plus, 1)),
        ('-', _) => Some((Token::Minus, 1)),
        ('*', _) => Some((Token::Star, 1)),
        ('/', _) => Some((Token::Slash, 1)),
        ('=', _) => Some((Token::Equal, 1)),
        ('<', _) => Some((Token::Less, 1)),
        ('>', _) => Some((Token::Greater, 1)),
        ('.', _) => Some((Token::Dot, 1)),
        ('(', _) => Some((Token::LeftParen, 1)),
        (')', _) => Some((Token::RightParen, 1)),
        (';', _) => Some((Token::Semicolon, 1)),
        _ => None,
    }
}
```

The first three arms inspect the following character because `<` and `>` may
begin a two-character operator. For punctuation with no two-character form,
`_` ignores whatever follows and only the first character matters.

Classify the new fixed words alongside the original keywords.

`src/lexer.rs`: replace `word_token()`

```rust
fn word_token(word: String) -> Token {
    match word.to_ascii_uppercase().as_str() {
        "SELECT" => Token::Select,
        "FROM" => Token::From,
        "WHERE" => Token::Where,
        "AS" => Token::As,
        "AND" => Token::And,
        "OR" => Token::Or,
        "NOT" => Token::Not,
        "IS" => Token::Is,
        "NULL" => Token::Null,
        "TRUE" => Token::True,
        "FALSE" => Token::False,
        _ => Token::Identifier(word),
    }
}
```

The lexer recognizes vocabulary. It still does not know whether `e` is an
alias or whether `name + 1` is meaningful. Tokens tell the parser what units
it received. We now need an AST capable of storing the structure that the
parser recovers from those tokens.

## 4.4 Define expression operators and the AST

The expanded grammar introduced several ways to build an expression. The
`factor` rule added unary `+` and `-`, while `not_expression` added `NOT`.
The `term` and `additive` rules added arithmetic operators, `predicate` added
comparisons and null tests, and the two outer expression levels added `AND`
and `OR`. The AST needs a value for each operator and a tree shape that
preserves how those operations are nested.

Create `expression.rs` with two operator enums and one expression tree. The
operator enums represent the vocabulary added by those grammar rules; the tree
records how a particular query composes the operators.

`UnaryOp` contains the three operators that take one operand. `Plus` and
`Minus` represent leading signs such as `-salary`. `Not` represents Boolean
negation such as `NOT active`.

`BinaryOp` contains operators that take a left and a right operand. They fall
into three groups: arithmetic, comparison, and Boolean. The binder will use
the same groups when it checks operand types in Section 4.9. Arithmetic works
on integers. Comparison operators compare compatible operands and produce a
Boolean; Section 4.9 defines the accepted types. `And` and `Or` combine
Boolean operands.

`src/expression.rs`: create this file

```rust
use crate::row::Value;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum UnaryOp {
    Plus,
    Minus,
    Not,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum BinaryOp {
    Add,
    Subtract,
    Multiply,
    Divide,
    Equal,
    NotEqual,
    Less,
    LessOrEqual,
    Greater,
    GreaterOrEqual,
    And,
    Or,
}
```

`Expr` is the unresolved expression tree recovered by the parser. The tree is
recursive: `Unary` contains one child expression and `Binary` contains two.
Those children use `Box` so the recursive enum has a finite, known size.

`src/expression.rs`: add after `BinaryOp`

```rust
#[derive(Clone, Debug, PartialEq, Eq)]
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

`Column` preserves both parts of a possibly qualified name. An unqualified
column has no qualifier; a qualified one retains both pieces for the binder:

```text
name    → Column { qualifier: None, name: "name" }
e.name  → Column { qualifier: Some("e"), name: "name" }
```

The qualifier is still only text. The parser has not proved that `e` is a
valid alias.

`Literal` stores a value written directly in SQL: `5000`, `'Ada'`, `TRUE`,
`FALSE`, or `NULL`. The parser converts each corresponding token into a
`Value` variant.

`Unary` and `Binary` carry an operator and their child expressions. For
example, a unary-minus node with the `salary` column as its child will produce
the negated salary when evaluated.

`IsNull` remains separate because `IS NULL` and `IS NOT NULL` test for the
unknown value rather than comparing two operands. Its `negated` flag
distinguishes the two forms.

We now have the values the parser must produce. Next we will follow the grammar
from the outer query through each precedence level and build the corresponding
`Expr` nodes.

## 4.5 Parse columns, literals, and precedence

Chapter 3's `Query` stored a selected-column name, a filter-column name, and
an integer boundary. Those flat fields cannot represent a nested expression
such as `salary + 5000 > 70000`. The new `Query` will therefore store an
`Expr` for both its projection and filter.

Parsing begins with the outer `query` production. When `parse_query()` reaches
a projection or filter expression, it calls `parse_expression()`. That method
descends through the precedence rules from `OR`, the weakest operator, to a
primary expression, the tightest:

```text
parse_query()
    ↓
parse_expression()
    ↓
OR → AND → NOT → predicate → additive → term → factor → primary
```

As in Chapter 3, methods that implement grammar productions begin with
`parse_`. Small helpers such as `peek()`, `consume()`, and `expect()` only
inspect or move through the token list, so they do not use that prefix.

`src/parser.rs`: replace the imports and `Query`

```rust
use std::fmt;

use crate::expression::{BinaryOp, Expr, UnaryOp};
use crate::lexer::{Token, tokenize};
use crate::row::Value;

#[derive(Debug, PartialEq, Eq)]
pub struct Query {
    pub projection: Expr,
    pub table: String,
    pub table_alias: Option<String>,
    pub filter: Expr,
}
```

The existing `ParseError`, `parse()`, and `Parser` still fit. Only the body of
`parse()` must call the new outer method:

`src/parser.rs`: replace the body of `parse()`

```rust
let tokens = tokenize(sql).map_err(|error| ParseError(error.to_string()))?;
Parser { tokens, current: 0 }.parse_query()
```

### 4.5.1 Parse the query and its alias

The outer query rule divides a shortened version of the query into four
pieces:

```text
SELECT e.name FROM employees AS e WHERE e.salary + 5000 > 70000;
       └────┘      └───────┘    └┘      └──────────────────────┘
     projection      table     alias              filter
```

`parse_query()` follows that order. It delegates both expression-shaped
pieces to `parse_expression()`, reads the table identifier itself, and accepts an
alias either with `AS` or directly after the table name. We can replace the
old `impl Parser`, beginning with that outer structure.

`src/parser.rs`: begin the new `impl Parser`

```rust
impl Parser {
    fn parse_query(&mut self) -> Result<Query, ParseError> {
        self.expect(Token::Select, "expected SELECT at start of query")?;
        let projection = self.parse_expression()?;
        self.expect(Token::From, "expected FROM after selected expression")?;
        let table = self.identifier("expected a table name after FROM")?;

        let table_alias = if self.consume(&Token::As) {
            Some(self.identifier("expected an alias after AS")?)
        } else if matches!(self.peek(), Some(Token::Identifier(_))) {
            Some(self.identifier("expected a table alias")?)
        } else {
            None
        };
        self.expect(Token::Where, "expected WHERE after table name")?;
        let filter = self.parse_expression()?;
        self.expect(Token::Semicolon, "expected ; after query")?;

        if self.current != self.tokens.len() {
            return Err(ParseError("unexpected token after ;".to_string()));
        }

        Ok(Query { projection, table, table_alias, filter })
    }
```

`consume()` will return `true` and advance when the next token is `AS`.
Without `AS`, `matches!` checks whether the next token contains an identifier;
if it does, `identifier()` takes that name as the alias. Otherwise the query
has no alias.

### 4.5.2 Parse Boolean operators

Read the expression rules from top to bottom as precedence levels. `OR` is the
weakest, followed by `AND`, `NOT`, predicates, addition and subtraction, and
then multiplication and division. Primary expressions form the leaves. Each
method asks the next tighter level for an operand before looking for its own
operator. That is why `salary + 2 * 3` becomes `salary + (2 * 3)` without a
special case.

Precedence begins with `OR`. Because `parse_or_expression()` asks
`parse_and_expression()` for each operand, an entire `AND` expression is assembled
before `OR` can combine it.

`src/parser.rs`: continue `impl Parser`

```rust
    fn parse_expression(&mut self) -> Result<Expr, ParseError> {
        self.parse_or_expression()
    }

    fn parse_or_expression(&mut self) -> Result<Expr, ParseError> {
        let mut expression = self.parse_and_expression()?;
        while self.consume(&Token::Or) {
            expression = binary(expression, BinaryOp::Or,
                self.parse_and_expression()?);
        }
        Ok(expression)
    }

    fn parse_and_expression(&mut self) -> Result<Expr, ParseError> {
        let mut expression = self.parse_not_expression()?;
        while self.consume(&Token::And) {
            expression = binary(expression, BinaryOp::And,
                self.parse_not_expression()?);
        }
        Ok(expression)
    }
```

`NOT` binds more tightly than `AND`. It calls itself, allowing chains such as
`NOT NOT condition`, and stops recursing when the next token is not `NOT`.

`src/parser.rs`: continue `impl Parser`

```rust
    fn parse_not_expression(&mut self) -> Result<Expr, ParseError> {
        if self.consume(&Token::Not) {
            return Ok(Expr::Unary {
                op: UnaryOp::Not,
                expression: Box::new(self.parse_not_expression()?),
            });
        }
        self.parse_predicate()
    }
```

### 4.5.3 Parse comparisons and null tests

Comparisons and null tests bind more tightly than `NOT`. The predicate method
first reads the left arithmetic expression, then checks for a comparison. If
there is no comparison, it checks for `IS NULL` or `IS NOT NULL` before
returning the arithmetic expression unchanged.

`src/parser.rs`: continue `impl Parser`

```rust
    fn parse_predicate(&mut self) -> Result<Expr, ParseError> {
        let left = self.parse_additive()?;
        let op = if self.consume(&Token::Equal) { Some(BinaryOp::Equal) }
        else if self.consume(&Token::NotEqual) { Some(BinaryOp::NotEqual) }
        else if self.consume(&Token::Less) { Some(BinaryOp::Less) }
        else if self.consume(&Token::LessOrEqual) { Some(BinaryOp::LessOrEqual) }
        else if self.consume(&Token::Greater) { Some(BinaryOp::Greater) }
        else if self.consume(&Token::GreaterOrEqual) { Some(BinaryOp::GreaterOrEqual) }
        else { None };

        if let Some(op) = op {
            return Ok(binary(left, op, self.parse_additive()?));
        }

        if self.consume(&Token::Is) {
            let negated = self.consume(&Token::Not);
            self.expect(Token::Null, "expected NULL after IS")?;
            return Ok(Expr::IsNull {
                expression: Box::new(left), negated,
            });
        }

        Ok(left)
    }
```

If there is no comparison or null test, the arithmetic expression itself is
returned. Binding will later reject it in `WHERE` unless it produces a Boolean
or null result.

### 4.5.4 Parse arithmetic

`parse_additive()` asks `parse_term()` for each operand, which places
multiplication deeper in the tree. Both methods loop because their grammar
rules allow repeated operators. Updating the accumulated left expression on
each pass makes `a - b - c` associate as `(a - b) - c`.

`src/parser.rs`: continue `impl Parser`

```rust
    fn parse_additive(&mut self) -> Result<Expr, ParseError> {
        let mut expression = self.parse_term()?;
        loop {
            let op = if self.consume(&Token::Plus) { Some(BinaryOp::Add) }
            else if self.consume(&Token::Minus) { Some(BinaryOp::Subtract) }
            else { None };
            match op {
                Some(op) => expression = binary(expression, op, self.parse_term()?),
                None => break,
            }
        }
        Ok(expression)
    }

    fn parse_term(&mut self) -> Result<Expr, ParseError> {
        let mut expression = self.parse_factor()?;
        loop {
            let op = if self.consume(&Token::Star) { Some(BinaryOp::Multiply) }
            else if self.consume(&Token::Slash) { Some(BinaryOp::Divide) }
            else { None };
            match op {
                Some(op) => expression = binary(expression, op, self.parse_factor()?),
                None => break,
            }
        }
        Ok(expression)
    }
```

Unary signs call themselves so `--salary` nests correctly. The recursion
accepts any chain of leading signs and ends when the parser reaches a primary
expression.

`src/parser.rs`: continue `impl Parser`

```rust
    fn parse_factor(&mut self) -> Result<Expr, ParseError> {
        if self.consume(&Token::Plus) {
            return Ok(Expr::Unary {
                op: UnaryOp::Plus,
                expression: Box::new(self.parse_factor()?),
            });
        }
        if self.consume(&Token::Minus) {
            return Ok(Expr::Unary {
                op: UnaryOp::Minus,
                expression: Box::new(self.parse_factor()?),
            });
        }
        self.parse_primary()
    }
```

### 4.5.5 Parse primary expressions

A primary is a complete leaf or a parenthesized expression. Showing its entire
match together keeps every possible leaf visible in one place. An identifier
becomes a qualified or unqualified column. Integer, string, Boolean, and null
tokens become literals. A left parenthesis recursively parses another complete
expression.

`src/parser.rs`: add `parse_primary()`

```rust
    fn parse_primary(&mut self) -> Result<Expr, ParseError> {
        match self.peek().cloned() {
            Some(Token::Identifier(first)) => {
                self.current += 1;
                if self.consume(&Token::Dot) {
                    let name = self.identifier(
                        "expected a column name after .")?;
                    Ok(Expr::Column {
                        qualifier: Some(first), name,
                    })
                } else {
                    Ok(Expr::Column { qualifier: None, name: first })
                }
            }
            Some(Token::Integer(value)) => {
                self.current += 1;
                Ok(Expr::Literal(Value::Integer(value)))
            }
            Some(Token::String(value)) => {
                self.current += 1;
                Ok(Expr::Literal(Value::Text(value)))
            }
            Some(Token::Null) => {
                self.current += 1;
                Ok(Expr::Literal(Value::Null))
            }
            Some(Token::True) => {
                self.current += 1;
                Ok(Expr::Literal(Value::Boolean(true)))
            }
            Some(Token::False) => {
                self.current += 1;
                Ok(Expr::Literal(Value::Boolean(false)))
            }
            Some(Token::LeftParen) => {
                self.current += 1;
                let expression = self.parse_expression()?;
                self.expect(Token::RightParen,
                    "expected ) after expression")?;
                Ok(expression)
            }
            _ => Err(ParseError("expected an expression".to_string())),
        }
    }
```

`peek().cloned()` gives this method an owned token before it advances the
cursor. The resulting AST can therefore own identifier and string contents
instead of borrowing them from the parser's token list.

### 4.5.6 Move through the token list

Four cursor helpers move through the token list. `peek()` borrows the next
token without advancing. `consume()` advances only when that token matches.
`expect()` turns a failed match into a parse error, while `identifier()`
extracts the text stored inside an identifier token.

`src/parser.rs`: finish `impl Parser`

```rust
    fn peek(&self) -> Option<&Token> {
        self.tokens.get(self.current)
    }

    fn consume(&mut self, token: &Token) -> bool {
        if self.peek() == Some(token) {
            self.current += 1;
            true
        } else {
            false
        }
    }

    fn expect(&mut self, token: Token,
        message: &str) -> Result<(), ParseError> {
        if self.consume(&token) { Ok(()) }
        else { Err(ParseError(message.to_string())) }
    }

    fn identifier(&mut self, message: &str)
        -> Result<String, ParseError> {
        match self.peek().cloned() {
            Some(Token::Identifier(value)) => {
                self.current += 1;
                Ok(value)
            }
            _ => Err(ParseError(message.to_string())),
        }
    }
}
```

One constructor keeps binary-node creation out of every precedence method.

`src/parser.rs`: add after `impl Parser`

```rust
fn binary(left: Expr, op: BinaryOp, right: Expr) -> Expr {
    Expr::Binary {
        left: Box::new(left),
        op,
        right: Box::new(right),
    }
}
```

## 4.6 Run an AST checkpoint

Before binding names, make the recovered expression tree visible. Temporarily
use the Chapter 3 prompt as an AST inspector.

`src/main.rs`: temporarily replace the file

```rust
mod expression;
mod lexer;
mod parser;
mod row;

use std::io::{self, Write};
use parser::parse;

fn main() -> io::Result<()> {
    run_prompt()
}

fn inspect_sql(sql: &str) {
    match parse(sql) {
        Ok(query) => println!("{query:#?}"),
        Err(error) => eprintln!("error: {error}"),
    }
}
```

`src/main.rs`: add the prompt after `inspect_sql()`

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
        if !sql.trim().is_empty() {
            inspect_sql(&sql);
        }
    }
}
```

Run the prompt and enter the representative query:

```bash
cargo run --quiet
```

<figure class="book-illustration book-diagram">
  <img src="images/004-complete-query-ast.png" alt="The Chapter 4 query AST contains a projection column, employees table with alias e, and an AND filter whose children preserve arithmetic, comparison, and null-test precedence.">
  <figcaption>The complete AST records the query structure, including expression precedence, but its names are still unresolved.</figcaption>
</figure>

The printed tree places multiplication beneath addition and retains `e` as the
qualifier on both column references. This proves that parsing recovered the
intended structure. It does not prove that `employees`, `e`, or either column
exists.

## 4.7 Introduce the catalog

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

## 4.8 Define what binding produces

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

## 4.9 Bind names and check types

### 4.9.1 Establish the scope

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

### 4.9.2 Bind and type-check the expression

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
  <img src="images/004-column-binding.png" alt="The unresolved AST column e.salary is checked against an employees catalog entry where alias e maps salary to INTEGER, producing a bound salary column with integer type.">
  <figcaption>Binding checks the qualifier and column, recovers the type, and produces a simpler expression for execution.</figcaption>
</figure>

## 4.10 Evaluate bound expressions

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

## 4.11 Update plan execution

The Chapter 3 plan stored one filter column, one integer boundary, and a list
of projected column names. That representation could execute only the query
shape it described. Bound expression trees can replace those fixed fields, so
the same filter and project nodes can execute every expression this chapter
accepts.

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

## 4.12 Connect the application

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

### 4.12.1 Restore the fixed demonstration

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

### 4.12.2 Connect the prompt

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

### 4.12.3 Verify that the code compiles

The application now connects the parser, catalog and binder, plan, and
executor. Compile it before running queries so missing modules, stale imports,
or mismatched plan fields fail at this checkpoint.

```bash
cargo fmt
cargo check
```

## 4.13 Run the fixed demonstration

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

## 4.14 Run the prompt and its errors

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

## 4.15 Verify the tests

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

## 4.16 What we deliberately did not build

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

## 4.17 Try it

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

## 4.18 One scope is no longer enough

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
