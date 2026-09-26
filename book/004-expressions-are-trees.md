# 4. Expressions Are Trees

<!--
Chapter contract

Continue from Chapter 3's deliberately fixed query shape. Replace its flat
query fields with expression trees and extend the lexer and parser just far
enough to preserve arithmetic, comparisons, Boolean logic, null tests,
qualified columns, and precedence.

Visible outcome

A richer SQL query becomes a visible AST whose shape preserves operator
precedence. The reader can explain why parsing structure is necessary before
names and types can be checked.
-->

> Expressions turn a flat token sequence into a tree of operations.

<figure class="book-illustration">
  <img src="images/004-flat-fields-become-expression-tree.png" alt="Expression pieces overflow a rigid four-compartment record, then fit naturally into a branching expression tree.">
  <figcaption>A fixed set of fields cannot represent every way expressions can nest.</figcaption>
</figure>

Chapter 3 could parse only one deliberately fixed query shape:

```sql
SELECT name FROM employees WHERE salary > 50000;
```

Its `Query` stored one selected column, one table name, one filter column, and
one integer boundary. Those four fields cannot represent `salary + 5000`,
`condition_a AND condition_b`, or parentheses that change evaluation order.
Before the database can reason about such expressions, the frontend must
preserve their structure.

This chapter extends the frontend path:

```text
SQL → tokens → expression AST
```

We will use this query to exercise the richer grammar:

```sql
SELECT e.name
FROM employees AS e
WHERE e.salary + 5000 > 70000 AND e.name IS NOT NULL;
```

Compared with Chapter 3, accepting this query requires table aliases,
qualified columns, arithmetic, Boolean operators, and null tests. The frontend
must preserve that structure before a later stage can resolve names and check
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

The grammar describes structure, not database meaning. Sections 4.2 through
4.5 add the runtime values, tokens, expression AST, and precedence parser
needed to preserve that structure. Section 4.6 makes the resulting tree
visible. The next chapter will resolve its names and check its types.

Before changing the program, begin from the completed Chapter 3 checkpoint:

```bash
git switch --create chapter-004 lesson-003
```

## 4.1 See why flat fields stop working

Try to place the representative query into Chapter 3's `Query`:

```rust
pub struct Query {
    pub selected_column: String,
    pub table: String,
    pub filter_column: String,
    pub greater_than: i64,
}
```

There is nowhere to store the addition inside `e.salary + 5000`, the two
conditions joined by `AND`, or the `IS NOT NULL` test. Adding one field for
each new spelling would only work until the expressions were nested in a new
way.

An expression tree solves that representation problem. Leaves store columns
and literal values. Parent nodes store operations whose children are other
expressions. The parser can build the same small set of node kinds into many
different shapes. We will begin by extending the values those nodes may
produce.

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
Boolean operators, and null tests. The next chapter will make that larger
change after it has checked the expressions.

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
the same groups when it checks operand types in the next chapter. Arithmetic
works on integers. Comparison operators compare compatible operands and
produce a Boolean; the binder will define the accepted types. `And` and `Or`
combine Boolean operands.

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
#[allow(dead_code)] // Row execution reconnects in Chapter 5.
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

## 4.7 What we deliberately did not build

This expression frontend remains intentionally bounded:

- A query still has one input table and one selected expression.
- A `WHERE` clause is still required.
- Arithmetic uses integer literals; decimal values are not yet supported.
- There are no functions, `BETWEEN`, `LIKE`, `IN`, `CASE`, `CAST`, dates, or
  intervals.
- Parsing preserves qualifiers such as `e`, but does not prove they exist.
- Parsing does not decide whether an operator receives sensible operand types.

These limits keep the chapter focused on one transition: a flat query record
becomes a nested expression tree.

## 4.8 Try it

Run the AST prompt, predict the tree shape for each change, and then inspect
the result.

1. Compare `salary + 2 * 3` with `(salary + 2) * 3`.
2. Replace `e.salary + 5000 > 70000` with `NOT e.salary > 70000`.
3. Use the string literal `'It''s ready'` as the selected expression.
4. Replace `e.name` with `x.name`.
5. Try `name + 1 > 0`.

<details>
<summary>Check your reasoning</summary>

1. Multiplication is nested beneath addition in the first tree. Parentheses
   make addition the deeper operation in the second.
2. The `NOT` node contains the comparison because predicates bind more tightly
   than Boolean negation.
3. The doubled quote becomes one quote inside a text literal.
4. Parsing succeeds and preserves `x` as the qualifier; it cannot know whether
   that alias exists.
5. Parsing succeeds because the tokens have a valid shape; it cannot know that
   adding an integer to a text column is invalid.

</details>

## 4.9 Structure is not meaning

The AST now answers structural questions. It knows that multiplication belongs
inside addition, that `e.name` is a qualified column, and that `IS NOT NULL`
is one predicate. It still stores `employees`, `e`, `salary`, and `name` as
unchecked text.

That distinction becomes visible if `e` is replaced by `x` or `employees` by
`missing_table`: both queries still produce an AST. The next chapter adds
binding, which connects those names to a catalog, checks operand types, and
turns the unresolved expression tree into work the executor may safely run.

