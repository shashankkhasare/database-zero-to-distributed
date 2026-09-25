# Appendix B: The SQL Grammar We Support

This appendix collects the complete planned grammar for the SQL language built
throughout the course. Individual chapters repeat only the rules they add.
This is a readable map of our educational, SQL-89-inspired dialect, not a claim
of SQL-89 conformance.

A rule appearing here is not automatically implemented. Section B.4 assigns
every grammar family to a chapter or subsystem owner. A rule remains planned
until a tagged checkpoint implements and tests it; the implementation, tests,
and latest lesson tag remain the authority for what the database accepts
today.

## B.1 Notation

Quoted words and symbols are written in SQL. A name such as `expression`
refers to another rule. Parentheses group subexpressions, `|` means “or,” `?`
means optional, `*` means zero or more repetitions, and `+` means one or more.
Each suffix applies to the token or parenthesized group immediately before it.
For example, `"OUTER"?` accepts zero or one `OUTER`, while
`("," identifier)*` accepts any number of additional identifiers. These
notation marks are not typed into a query.

Keywords are case-insensitive. Identifiers retain their original spelling.

## B.2 Complete syntactic grammar

### Statements

Planned across the query, storage, transaction, and authorization seasons:

```text
statement          = query_statement
                   | create_table_statement
                   | insert_statement
                   | update_statement
                   | delete_statement
                   | start_statement
                   | commit_statement
                   | rollback_statement
                   | grant_statement
                   | revoke_statement ;

query_statement    = query ";" ;
```

### Queries

Chapters 3 through 8 establish the query-language foundation. Later
query-completion checkpoints add the advanced forms needed by the benchmark
chapters:

```text
query              = with_clause? query_expression order_by_clause?
                     limit_clause? ;
query_expression   = select_query (("UNION" | "INTERSECT" | "EXCEPT")
                     "ALL"? select_query)* ;
with_clause        = "WITH" "RECURSIVE"? named_query ("," named_query)* ;
named_query        = identifier "AS" "(" query ")" ;
select_query       = "SELECT" set_quantifier? select_list
                     "FROM" table_reference ("," table_reference)*
                     where_clause? group_by_clause? having_clause? ;

set_quantifier     = "DISTINCT" | "ALL" ;
select_list        = select_item ("," select_item)* ;
select_item        = "*" | qualified_star | expression alias? ;
qualified_star     = identifier "." "*" ;
alias              = "AS"? identifier ;
table_reference    = table_primary join_clause* ;
table_primary      = identifier alias? | "(" query ")" alias
                   | "(" table_reference ")" ;
join_clause        = ("INNER" | "LEFT" "OUTER"? | "RIGHT" "OUTER"?
                   | "FULL" "OUTER"?)?
                     "JOIN" table_primary "ON" expression ;
where_clause       = "WHERE" expression ;
group_by_clause    = "GROUP" "BY" grouping_element
                     ("," grouping_element)* ;
grouping_element   = expression
                   | "ROLLUP" "(" expression ("," expression)* ")"
                   | "CUBE" "(" expression ("," expression)* ")" ;
having_clause      = "HAVING" expression ;
order_by_clause    = "ORDER" "BY" ordering ("," ordering)* ;
ordering           = expression ("ASC" | "DESC")?
                     ("NULLS" ("FIRST" | "LAST"))? ;
limit_clause       = "LIMIT" integer ("OFFSET" integer)? ;
```

`LIMIT` is a documented modern extension, not SQL-89 syntax.

### Expressions and predicates

Chapter 4 begins this expression hierarchy. Later chapters extend it as joins,
aggregation, subqueries, data types, and benchmark queries require more forms:

```text
expression          = or_expression ;
or_expression       = and_expression ("OR" and_expression)* ;
and_expression      = not_expression ("AND" not_expression)* ;
not_expression      = "NOT" not_expression | predicate ;
predicate           = value_expression comparison_operator value_expression
                    | value_expression "NOT"? "BETWEEN" value_expression
                      "AND" value_expression
                    | value_expression "NOT"? "LIKE" value_expression
                    | value_expression "IS" "NOT"? "NULL"
                    | value_expression "NOT"? "IN" "(" in_value ")"
                    | "EXISTS" "(" query ")"
                    | "(" expression ")" ;
comparison_operator = "=" | "<>" | "<" | "<=" | ">" | ">=" ;
in_value            = query | expression ("," expression)* ;
value_expression    = concatenation ;
concatenation       = additive ("||" additive)* ;
additive            = term (("+" | "-") term)* ;
term                = factor (("*" | "/") factor)* ;
factor              = ("+" | "-") factor | primary ;
primary             = column_reference | literal | function_call
                    | case_expression | extract_expression | cast_expression
                    | substring_expression
                    | "(" query ")" | "(" value_expression ")" ;
column_reference    = (identifier ".")? identifier ;
literal             = integer | decimal | string | date_literal
                    | timestamp_literal | interval_literal
                    | "TRUE" | "FALSE" | "NULL" ;
date_literal        = "DATE" string ;
timestamp_literal   = "TIMESTAMP" string ;
interval_literal    = "INTERVAL" string interval_unit ;
interval_unit       = "YEAR" | "MONTH" | "DAY" | "HOUR" | "MINUTE"
                    | "SECOND" ;
function_call       = identifier "(" ("*" | set_quantifier? expression
                      ("," expression)*)? ")" over_clause? ;
extract_expression  = "EXTRACT" "(" identifier "FROM" expression ")" ;
cast_expression     = "CAST" "(" expression "AS" data_type ")" ;
substring_expression = "SUBSTRING" "(" expression "FROM" expression
                       ("FOR" expression)? ")" ;
case_expression     = "CASE" expression?
                      ("WHEN" expression "THEN" expression)+
                      ("ELSE" expression)? "END" ;
over_clause         = "OVER" "(" partition_by_clause? order_by_clause?
                      window_frame? ")" ;
partition_by_clause = "PARTITION" "BY" expression ("," expression)* ;
window_frame        = ("ROWS" | "RANGE") frame_extent ;
frame_extent        = frame_bound
                    | "BETWEEN" frame_bound "AND" frame_bound ;
frame_bound         = "UNBOUNDED" ("PRECEDING" | "FOLLOWING")
                    | "CURRENT" "ROW"
                    | integer ("PRECEDING" | "FOLLOWING") ;
```

The first implementation supports only integer comparison with `>`. The wider
expression grammar is a benchmark-driven destination and will be implemented
incrementally with explicit precedence and `NULL` semantics.

### Schema definition

Introduced when writable storage needs table definitions:

```text
create_table_statement = "CREATE" "TABLE" identifier
                         "(" table_element
                         ("," table_element)* ")" ";" ;
table_element      = column_definition | table_constraint ;
column_definition  = identifier data_type column_constraint* ;
data_type          = "INTEGER"
                   | "BIGINT"
                   | "DECIMAL" "(" integer "," integer ")"
                   | "CHAR" "(" integer ")"
                   | "VARCHAR" "(" integer ")"
                   | "DATE"
                   | "TIMESTAMP" ;
column_constraint  = "NOT" "NULL" | "UNIQUE" | "PRIMARY" "KEY"
                   | "DEFAULT" expression
                   | "REFERENCES" identifier "(" identifier ")"
                   | "CHECK" "(" expression ")" ;
table_constraint   = ("CONSTRAINT" identifier)?
                     ("PRIMARY" "KEY" column_list
                     | "UNIQUE" column_list
                     | "FOREIGN" "KEY" column_list "REFERENCES"
                       identifier column_list
                     | "CHECK" "(" expression ")") ;
column_list        = "(" identifier ("," identifier)* ")" ;
```

### Data mutation

`INSERT` arrives with writable storage. `UPDATE` and `DELETE` arrive when the
transaction chapters can make their effects and failure behavior visible:

```text
insert_statement   = "INSERT" "INTO" identifier
                     ("(" identifier ("," identifier)* ")")?
                     insert_source ";" ;
insert_source      = "VALUES" row_value ("," row_value)* | query ;
row_value          = "(" expression ("," expression)* ")" ;
update_statement   = "UPDATE" identifier "SET" assignment
                     ("," assignment)* where_clause? ";" ;
assignment         = identifier "=" expression ;
delete_statement   = "DELETE" "FROM" identifier where_clause? ";" ;
```

### Transaction control

Introduced with transactions:

```text
start_statement    = "BEGIN" ("TRANSACTION" | "WORK")? ";"
                   | "START" "TRANSACTION" ";" ;
commit_statement   = "COMMIT" ";" ;
rollback_statement = "ROLLBACK" ";" ;
```

### Authorization

Introduced only after the database has identities and an authorization boundary:

```text
grant_statement    = "GRANT" privilege_list "ON" identifier
                     "TO" identifier ";" ;
revoke_statement   = "REVOKE" privilege_list "ON" identifier
                     "FROM" identifier ";" ;
privilege_list     = privilege ("," privilege)* ;
privilege          = "SELECT" | "INSERT" | "UPDATE" | "DELETE" ;
```

## B.3 Lexical grammar

```text
identifier         = (letter | "_") (letter | digit | "_")* ;
integer            = digit+ ;
decimal            = digit+ "." digit+ ;
string             = "'" string_character* "'" ;
string_character   = non_quote | "''" ;

letter             = ? ASCII letter A-Z or a-z ? ;
digit              = ? ASCII digit 0-9 ? ;
non_quote          = ? any character except "'" ? ;
whitespace         = ? Unicode whitespace character ? ;
```

Text between `?` delimiters describes a character class recognized by the
lexer rather than a literal sequence. Whitespace is a skipped lexical
category: it may separate tokens, but the lexer does not emit it, so it does
not appear in the query productions. A doubled quote inside a string
represents one quote character. Quoted identifiers, comments, Unicode
identifier rules, and numeric forms beyond integers and fixed-point decimals
are not currently planned.

## B.4 Grammar implemented at each checkpoint

Every family in Sections B.2 and B.3 has an owner below. Advanced query and
authorization work now has concrete chapters; storage and transaction syntax
belongs to the named subsystem chapters and receives an exact checkpoint when
those seasons become active. A planned rule may be removed only by recording
why the course no longer intends to support it; it must not disappear merely
because no early chapter needs it.

| Grammar family | Course owner | Delivery condition |
| --- | --- | --- |
| No SQL text | `lesson-001` and `lesson-002` | Plans are constructed directly in Rust. |
| One-column `SELECT`/`FROM`/`WHERE`, `>`, integer, semicolon, basic identifiers | `lesson-003` | Implemented and tested. |
| Qualified names, aliases, core literals, arithmetic, comparison, Boolean and `NULL` predicates | Chapter 4 foundation and Chapter 64 completion | Binding, precedence, types, and three-valued logic are executable and tested. |
| Multiple table references and `INNER`, `LEFT`, `RIGHT`, and `FULL JOIN ... ON` | Chapter 5 | Each join form has defined logical and execution semantics. |
| Aggregate calls, `GROUP BY`, and `HAVING` | Chapter 6 | Aggregate and grouping behavior is executable and tested. |
| `DISTINCT`, `ALL`, ordering, null ordering, `LIMIT`, and `OFFSET` | Chapter 7 | Ordering and duplicate behavior is explicit. |
| Scalar, `IN`, and `EXISTS` subqueries, derived tables, and non-recursive common table expressions | Chapter 8 | Name scope and subquery execution are visible. |
| Recursive common table expressions | Chapter 63 | Recursive evaluation and termination behavior are taught before support is claimed. |
| `UNION`, `INTERSECT`, and `EXCEPT` | Chapter 62 | Duplicate semantics for default and `ALL` forms are tested. |
| Advanced scalar functions, `CASE`, `CAST`, `EXTRACT`, `SUBSTRING`, and date/time/interval expressions | Chapter 64 | Added with the execution and type semantics required by the analytical workload. |
| `ROLLUP` and `CUBE` | Chapter 65 | Subtotal rows and their `NULL` behavior are explicit. |
| Window functions and frames | Chapter 66 | Partitioning, ordering, and frame boundaries are executable and tested. |
| `CREATE TABLE`, data types, defaults, and column/table constraints | Writable-storage chapters | Definitions affect real stored tables and validated writes. |
| `INSERT`, `UPDATE`, and `DELETE` | Writable-storage and transaction chapters | Mutation, failure, and rollback behavior is observable. |
| `BEGIN`, `START TRANSACTION`, `COMMIT`, and `ROLLBACK` | Transaction chapters | Statements control the transaction implementation built there. |
| `GRANT` and `REVOKE` | Chapter 68 | The database has identities and an enforceable authorization boundary. |
| Strings, decimals, and later punctuation and keywords | The chapter owning the associated syntax | The lexical grammar and lexer tests grow together. |

Update this table only after parser and behavior tests establish a checkpoint's
actual coverage. Chapter 67 audits the complete table before the final
benchmark and integration chapters can claim SQL compatibility.

## B.5 Benchmark coverage target

TPC-style workloads are a long-term test of the whole database, not merely its
parser. TPC-H requires joins, subqueries, aggregation, arithmetic, dates,
`CASE`, ordering, and exact decimal values. TPC-DS additionally motivates
common table expressions, set operations, outer joins, and eventually OLAP
features such as window functions. TPC-C requires exact monetary arithmetic,
fixed and variable text, date/time values, mutations, rollback, constraints,
concurrency, and durability.

The target is complete TPC-H query coverage, progressively broader TPC-DS
coverage, and a TPC-C-inspired transaction workload. Appendix B must gain a
construct before a benchmark query depends on it, and the checkpoint list must
identify when that construct becomes executable. Scaled or adapted workloads
must be labelled as such; they are not official benchmark results.
