# Appendix A: Enough Rust to Build a Database

You do not need to master Rust before building a database. This appendix
explains the language features used by the chapters, using code from the
database itself. Read the section you need, then return to the database concept
that brought you here.

This is a growing reference, not a Rust course. It deliberately leaves out
features that our database does not use yet. When a later chapter needs
something new, the corresponding explanation can be added here.

## A.1 Build and run the project

Rust projects are commonly built with Cargo. `Cargo.toml` names the package and
records its dependencies. `src/main.rs` is the entry point for our executable,
while files such as `src/row.rs` and `src/plan.rs` hold related code.

```bash
cargo run --quiet
cargo test
cargo fmt --check
cargo clippy
```

`cargo run` builds and starts the program. `--quiet` hides Cargo's routine
messages. `cargo test` runs the test suite. The final two commands check
formatting and warn about suspicious or unnecessarily complicated code.

## A.2 Values, variables, and text

A variable gives a name to a value. Chapter 1 constructs Ada's row with this
expression:

```rust
Row::new(vec![
    ("id", Value::Integer(1)),
    ("name", Value::Text("Ada".to_string())),
    ("salary", Value::Integer(70_000)),
])
```

The program assigns expressions like this to names using `let`. For example,
`let employees = ...` binds `employees` to the relation on the right. Variables
cannot be reassigned by default. Adding `mut`, as in `let mut output_rows`,
permits the code to change that variable's value.

`vec![...]` creates a growable list. This list contains column-and-value pairs.
The complete `employees` variable uses another list around its three rows.
Underscores improve the readability of number literals, so `70_000` has the
same value as `70000`.

`String` owns its text. A value such as `"Ada"` is a string slice, written
`&str`, which provides a read-only view of text stored elsewhere. Calling
`.to_string()` creates an owned `String`.

## A.3 Group data with enums and structs

An enum represents a value that can take one of several forms:

```rust
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Value {
    Integer(i64),
    Text(String),
}
```

`Integer` and `Text` are variants of `Value`. The data in parentheses belongs
to that variant. `i64` is a signed 64-bit integer. Handling the variants
separately prevents the engine from treating a name as a salary.

A struct groups fields that always belong together:

```rust
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Row {
    values: Vec<(String, Value)>,
}
```

`Row` has one field named `values`. Its type is a list of tuples. Each tuple
contains exactly two items: a column name and its value. The angle brackets
describe the kind of item stored in the list.

The `pub` keyword makes an item available outside its module. The
`#[derive(...)]` attribute asks Rust to generate common behavior. `Clone`
allows explicit cloning, `Debug` provides diagnostic formatting, and
`PartialEq` with `Eq` permits equality comparisons. `Clone` does not copy
values automatically.

## A.4 Define and call methods

An `impl` block defines behavior associated with a type. This excerpt shows the
first two `Row` methods; `project()` follows them in `src/row.rs`:

```rust
impl Row {
    pub fn new(values: Vec<(&str, Value)>) -> Self {
        let mut owned_values = Vec::new();

        for (column, value) in values {
            owned_values.push((column.to_string(), value));
        }

        Self {
            values: owned_values,
        }
    }

    pub fn get(&self, column: &str) -> Option<&Value> {
        for (name, value) in &self.values {
            if name == column {
                return Some(value);
            }
        }

        None
    }
}
```

`Row::new(...)` calls a function associated with the `Row` type. It does not
operate on an existing row. Inside this block, `Self` means `Row`. By contrast,
`row.get("salary")` calls a method on a particular row, and `&self` gives the
method read-only access to it.

`Row::new()`, `Row::get()`, and `Row::project()` belong to our database. They
are not built into Rust. The arrow in `-> Self` states what a function returns.
Other examples include `-> Vec<Row>` and `-> Option<&Value>`.

Rust's `Display` trait defines how a value appears in user-facing text. The
implementation for `Value` handles its two variants separately:

```rust
impl fmt::Display for Value {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Value::Integer(value) => write!(formatter, "{value}"),
            Value::Text(value) => write!(formatter, "\"{value}\""),
        }
    }
}
```

The standard `fmt` module supplies `Display`, `Formatter`, and `fmt::Result`.
A `Result` represents either success or failure, and `fmt::Result` is the form
used while formatting text. `write!` sends text to the formatter. The `?`
returns a formatting failure to the caller instead of continuing. Once `Row`
implements `Display`, `println!("{row}")` uses it automatically.

The row formatter calls `.iter().enumerate()` to visit stored values while
also receiving their positions. It writes `", "` before every entry except the
first, avoiding an extra comma at either end of the row.

## A.5 Make decisions and repeat work

A `for` loop processes a collection one item at a time. `Row::get()` uses one
to search its column-and-value pairs:

```rust
for (name, value) in &self.values {
    if name == column {
        return Some(value);
    }
}

None
```

The loop borrows the stored list and names the two parts of each pair. `if`
runs its block only when the column names are equal. `return` immediately
finishes the method.

`Option` represents a value that may be absent. `Some(value)` means the search
succeeded, while `None` means no requested column was found. This makes absence
explicit instead of inventing a special value for it.

A `match` chooses behavior based on the form of a value:

```rust
let value = match row.get(column) {
    Some(Value::Integer(value)) => value,
    Some(Value::Text(_)) => panic!("column is not an integer: {column}"),
    None => panic!("unknown column: {column}"),
};
```

The first arm extracts an integer. The second recognizes text, and `_` means
its contents are not needed. The final arm handles a missing column. Here,
`panic!` stops the program with the supplied message. Later chapters will
introduce ordinary query errors when they are needed.

## A.6 Own, borrow, clone, and box data

Rust tracks who owns each value. When an owner goes away, Rust releases that
value. Passing an owned value can move it to a new owner. A reference beginning
with `&` temporarily borrows a value, allowing code to inspect it without
taking it from its owner.

Our executor sometimes needs a separate owned result. The scan uses
`rows.clone()` to make a complete copy, and projection clones selected names
and values into new rows. These copies are deliberately simple, but chapter 1
identifies their cost.

Plans introduce one more ownership tool:

```rust
Filter {
    column: String,
    greater_than: i64,
    input: Box<Plan>,
}
```

A plan can contain another plan, which makes the type recursive. Rust must know
the size of every directly stored value, but an endlessly nested `Plan` has no
fixed direct size. `Box<Plan>` stores the child separately and keeps a
fixed-size pointer in the parent. `Box::new(child)` creates that box.

## A.7 Modules and tests

Each Rust file is a module in this small project. The beginning of `main.rs`
declares two modules and brings selected names into scope:

```rust
mod plan;
mod row;

use plan::Plan;
use row::{Row, Value};
```

Tests live beside the code they verify. `#[test]` marks a function as a test,
and `assert_eq!` compares an actual value with the expected value:

```rust
#[test]
fn scan_returns_source_rows() {
    let rows = employees();
    let plan = Plan::Scan { rows: rows.clone() };

    assert_eq!(plan.execute(), rows);
}
```

If the values differ, the assertion fails and prints diagnostic output. The
derived `Debug`, `PartialEq`, and `Eq` behavior on `Row` and `Value` makes this
comparison possible.

## A.8 Read compiler errors

Compiler messages often look larger than the mistake that caused them. Start
with the first error, note its file and line, and read the primary message
before its suggestions. Later messages may be consequences of the first one.

For example, calling `row.project(columns)` before defining `project()` causes
Rust to report that no such method exists for `Row`. Check whether the name is
misspelled, whether its `impl` block exists, and whether the item is accessible.
Fix that first error, then compile again.

Treat compiler suggestions as clues rather than commands. A suggestion may
make the program compile while adding a copy we did not intend. Ask what the
value represents in the database and who should own it, then choose the
smallest change that preserves that meaning.
