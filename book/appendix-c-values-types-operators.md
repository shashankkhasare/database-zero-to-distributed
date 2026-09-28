# Appendix C: Values, Types, and Operators

This appendix records the value and operator rules implemented by the current
database. Chapters teach why each rule is needed; this page provides one place
to look up the resulting behavior.

A planned type or operation is not supported merely because it appears here.
The implementation, tests, and latest lesson tag remain the authority for what
the database can execute.

## C.1 Values and data types

Chapter 5 introduces four runtime values and four corresponding type
categories:

| SQL form | Runtime value | Data type |
| --- | --- | --- |
| `42` | `Value::Integer(42)` | `DataType::Integer` |
| `'Ada'` | `Value::Text("Ada")` | `DataType::Text` |
| `TRUE`, `FALSE` | `Value::Boolean` | `DataType::Boolean` |
| `NULL` | `Value::Null` | `DataType::Null` while binding a bare `NULL` |

`Value` is data produced or stored at runtime. `DataType` describes the
category a column or expression may produce. `DataType::Null` is a temporary
binding type for a bare `NULL`, not a declaration that a column accepts only
null values.

## C.2 Implemented operator rules

These rules are implemented at the Lesson 5 checkpoint:

| Operator | Accepted operands | Bound result type | Runtime result |
| --- | --- | --- | --- |
| unary `+`, unary `-` | integer | integer | integer |
| `NOT` | Boolean | Boolean | Boolean or `NULL` |
| `+`, `-`, `*`, `/` | integer and integer | integer | integer or `NULL` |
| `=`, `<>` | matching integer, text, or Boolean values | Boolean | Boolean or `NULL` |
| `<`, `<=`, `>`, `>=` | matching integer or text values | Boolean | Boolean or `NULL` |
| `AND`, `OR` | Boolean values | Boolean | Boolean or `NULL` |
| `IS NULL`, `IS NOT NULL` | any value | Boolean | Boolean |

A bare `NULL` may stand where one of these operators expects another type.
Most operations involving it produce `NULL`. `AND` and `OR` instead follow
SQL three-valued logic, where the known operand can sometimes determine the
result. Chapter 5 contains the complete truth tables.

There are no implicit conversions. An integer and text value do not become
comparable merely because their displayed contents look alike.

## C.3 Text comparison

Text equality and ordering use Rust's case-sensitive `String` comparison.
This gives the teaching engine a small deterministic rule, but it is not a SQL
collation system. Locale-aware ordering, case-insensitive comparison, Unicode
normalization, and configurable collations are not implemented.

Text arithmetic is also absent. In particular, `+` accepts integers only and
does not concatenate text.

## C.4 Planned extensions

The advanced SQL season will expand this reference when the database gains:

- exact decimals
- dates and timestamps
- intervals
- `CAST`
- string concatenation
- richer scalar expressions

Their conversion, comparison, arithmetic, and `NULL` rules remain unspecified
until the chapters that need them implement and test them. This appendix
should grow with the executable system rather than predicting those decisions
in advance.
