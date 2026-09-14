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

We will support only the query shown above and other queries with the same
shape. That narrow boundary lets us see every stage without hiding parsing
inside a library. Appendix B records the complete accepted grammar as it
grows. Later chapters will expand it when aliases, expressions, joins,
aggregation, sorting, and subqueries give us a reason.

## 3.1 SQL begins as characters

Start with the exact input the frontend receives and identify why the query
engine cannot execute the string directly.

## 3.2 Turn characters into tokens

Introduce lexical analysis through the visible words, identifier names,
integer literal, comparison symbol, and semicolon in the employee query.

## 3.3 Give the tokens a shape

The complete course grammar lives in Appendix B, but our first parser needs
only these productions:

```text
query          = select_clause from_clause where_clause ";" ;
select_clause  = "SELECT" identifier ;
from_clause    = "FROM" identifier ;
where_clause   = "WHERE" identifier ">" integer ;
```

This local grammar is small enough to keep beside the code that implements it.
The parser checks that the tokens follow this shape and rejects a query as soon
as the next token cannot satisfy the expected rule.

## 3.4 Keep the parsed query as data

Introduce the abstract syntax tree as a small Rust value that records what the
SQL says without executing it.

## 3.5 Build the logical plan

Translate the parsed query into the existing scan, filter, and project tree.
Keep the conversion explicit so every SQL clause has a visible destination.

## 3.6 Run a query written as SQL

Pass the employee query through the complete frontend and confirm that the
existing executor still returns Ada and Grace.

## 3.7 What we deliberately did not parse

Collect the lesson's language limitations in one place. Distinguish our
SQL-89-inspired direction from a claim of standards compliance.

## 3.8 Try it

Give the reader small tokenization, syntax-error, and query-editing exercises
whose results can be checked with the program and tests.

## 3.9 Parsing is not understanding

End with a query whose syntax is valid but whose names or types cannot yet be
validated. Use that gap to motivate binding and expressions in Chapter 4.
