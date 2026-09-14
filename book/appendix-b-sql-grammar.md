# Appendix B: The SQL Grammar We Support

This appendix collects the complete planned grammar for the SQL language built
throughout the course. Individual chapters repeat only the rules they add.
This is a readable map of our educational, SQL-89-inspired dialect, not a claim
of SQL-89 conformance.

A rule appearing here is not automatically implemented. Each group names the
lesson or subsystem that owns it. The implementation, tests, and latest lesson
tag remain the authority for what the database accepts today.

## B.1 Notation

Quoted words and symbols are written in SQL. A name such as `expression`
refers to another rule. Parentheses group alternatives, `|` means “or,” `?`
means optional, `*` means zero or more repetitions, and `+` means one or more.
These notation marks are not typed into a query.

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
                   | commit_statement
                   | rollback_statement
                   | grant_statement
                   | revoke_statement ;

query_statement    = query ";" ;
```

### Queries

Lessons 003 through 008 introduce these rules incrementally:

```text
query              = with_clause? query_expression order_by_clause?
                     limit_clause? ;
query_expression   = select_query (("UNION" | "INTERSECT" | "EXCEPT")
                     "ALL"? select_query)* ;
with_clause        = "WITH" named_query ("," named_query)* ;
named_query        = identifier "AS" "(" query ")" ;
select_query       = "SELECT" set_quantifier? select_list
                     "FROM" table_reference ("," table_reference)*
                     where_clause? group_by_clause? having_clause? ;

set_quantifier     = "DISTINCT" | "ALL" ;
select_list        = "*" | select_item ("," select_item)* ;
select_item        = expression alias? ;
alias              = "AS"? identifier ;
table_reference    = table_primary join_clause* ;
table_primary      = identifier alias? | "(" query ")" alias ;
join_clause        = ("INNER" | "LEFT" "OUTER"? | "RIGHT" "OUTER"?)?
                     "JOIN" table_primary "ON" expression ;
where_clause       = "WHERE" expression ;
group_by_clause    = "GROUP" "BY" expression ("," expression)* ;
having_clause      = "HAVING" expression ;
order_by_clause    = "ORDER" "BY" ordering ("," ordering)* ;
ordering           = expression ("ASC" | "DESC")? ;
limit_clause       = "LIMIT" integer ;
```

`LIMIT` is a documented modern extension, not SQL-89 syntax.

### Expressions and predicates

Lessons 004 through 008 build these precedence levels from lowest to highest:

```text
expression          = or_expression ;
or_expression       = and_expression ("OR" and_expression)* ;
and_expression      = not_expression ("AND" not_expression)* ;
not_expression      = "NOT" not_expression | predicate ;
predicate           = value_expression comparison_operator value_expression
                    | value_expression "BETWEEN" value_expression
                      "AND" value_expression
                    | value_expression "LIKE" value_expression
                    | value_expression "IS" "NOT"? "NULL"
                    | value_expression ("NOT"? "IN") "(" query ")"
                    | "EXISTS" "(" query ")"
                    | "(" expression ")" ;
comparison_operator = "=" | "<>" | "<" | "<=" | ">" | ">=" ;
value_expression    = term (("+" | "-") term)* ;
term                = factor (("*" | "/") factor)* ;
factor              = ("+" | "-") factor | primary ;
primary             = column_reference | literal | function_call
                    | case_expression
                    | "(" query ")" | "(" value_expression ")" ;
column_reference    = (identifier ".")? identifier ;
literal             = integer | decimal | string | date_literal | "NULL" ;
date_literal        = "DATE" string ;
function_call       = identifier "(" ("*" | set_quantifier? expression
                      ("," expression)*)? ")" ;
case_expression     = "CASE" ("WHEN" expression "THEN" expression)+
                      ("ELSE" expression)? "END" ;
```

The first implementation supports only integer comparison with `>`. The wider
expression grammar is a benchmark-driven destination and will be implemented
incrementally with explicit precedence and `NULL` semantics.

### Schema definition

Introduced when writable storage needs table definitions:

```text
create_table_statement = "CREATE" "TABLE" identifier
                         "(" column_definition
                         ("," column_definition)* ")" ";" ;
column_definition  = identifier data_type column_constraint* ;
data_type          = "INTEGER"
                   | "BIGINT"
                   | "DECIMAL" "(" integer "," integer ")"
                   | "CHAR" "(" integer ")"
                   | "VARCHAR" "(" integer ")"
                   | "DATE"
                   | "TIMESTAMP" ;
column_constraint  = "NOT" "NULL" | "UNIQUE" | "PRIMARY" "KEY"
                   | "REFERENCES" identifier "(" identifier ")"
                   | "CHECK" "(" expression ")" ;
```

### Data mutation

`INSERT` arrives with writable storage. `UPDATE` and `DELETE` arrive when the
transaction chapters can make their effects and failure behavior visible:

```text
insert_statement   = "INSERT" "INTO" identifier
                     ("(" identifier ("," identifier)* ")")?
                     "VALUES" row_value ("," row_value)* ";" ;
row_value          = "(" literal ("," literal)* ")" ;
update_statement   = "UPDATE" identifier "SET" assignment
                     ("," assignment)* where_clause? ";" ;
assignment         = identifier "=" expression ;
delete_statement   = "DELETE" "FROM" identifier where_clause? ";" ;
```

### Transaction control

Introduced with transactions:

```text
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
identifier         = letter (letter | digit | "_")* ;
integer            = digit+ ;
decimal            = digit+ "." digit+ ;
string             = "'" string_character* "'" ;
string_character   = non_quote | "''" ;
letter             = "A" ... "Z" | "a" ... "z" ;
digit              = "0" ... "9" ;
whitespace         = " " | tab | carriage_return | newline ;
```

A doubled quote inside a string represents one quote character. Quoted
identifiers, comments, Unicode identifier rules, and numeric forms beyond
non-negative integers are not currently planned.

## B.4 Grammar implemented at each checkpoint

- `lesson-001` and `lesson-002`: no SQL text; plans are constructed in Rust.
- `lesson-003`: the single query production repeated in Chapter 3.
- Later tags: update this list only after their parser behavior is tested.

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
