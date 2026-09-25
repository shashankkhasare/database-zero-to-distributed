# Editorial Terminology Ledger

This file records when the book first gives a technical term a real definition.
It is an editorial aid for writers and agents, not a replacement for explaining
ideas in the chapters where readers encounter them.

Before drafting a chapter, check this ledger and the cited source. Later
chapters should use an established term normally or introduce a short callback
that adds new meaning. They should not bold and redefine it as new vocabulary.

| Term | First introduced | Established meaning |
|------|------------------|---------------------|
| scan | Chapter 1 introduction | A plan operation that reads its source rows |
| filter | Chapter 1 introduction | A plan operation that removes rows that do not satisfy a condition |
| project | Chapter 1 introduction | A plan operation that retains only requested columns or expressions |
| parser | Chapter 1, §1.1 | A frontend component that recognizes the structure of a query; Chapter 3 implements the first one |
| relation | Chapter 1, §1.2 | A table-like collection of rows |
| value | Chapter 1, §1.2 | One piece of data stored in a row |
| schema | Chapter 1, §1.2 production note | A separate description of column names and types |
| query plan | Chapter 1, §1.3 | A tree describing the operations used to answer a query |
| leaf | Chapter 1, §1.3 | A plan node with no child |
| predicate | Chapter 1, §1.4.2 | A condition that answers yes or no for a row |
| recursion | Chapter 1, §1.4 | A plan executing its smaller input plan through the same method |
| projection | Chapter 1, §1.4.3 | The operation that retains selected columns; Chapter 2 gives its relational-algebra meaning |
| materialized result | Chapter 1, §1.6 | A complete intermediate result collected before the next operation begins |
| materialized execution | Chapter 1, §1.6 | Execution in which each operation collects its complete result |
| relational algebra | Chapter 1, §1.8 | A language of operations that transform relations |
| selection | Chapter 2, §2.3 | The relational-algebra operation that retains rows satisfying a predicate |
| logical plan | Chapter 2, §2.3 | A description of what result a query requires |
| physical plan | Chapter 2, §2.3 | A description of how the database will perform the work |
| equivalent plans | Chapter 2, §2.4 | Plans that produce the same result for every valid input |
| counterexample | Chapter 2, §2.6.3 | One valid input that disproves an equivalence claim |
| read-evaluate-print loop (REPL) | Chapter 3, §3.1 | A prompt that repeatedly reads input, evaluates it, and prints the result |
| token | Chapter 3, §3.3 | One meaningful unit recognized in SQL source text |
| lexer | Chapter 3, §3.3 | The frontend component that groups source characters into tokens |
| grammar | Chapter 3, §3.4 | Rules describing which token structures form valid input |
| syntax-directed translation | Chapter 3, §3.4 | Translation in which recognized grammatical structure determines which meaning rule to apply |
| recursive-descent parser | Chapter 3, §3.4 | A parser organized as methods that follow grammar productions and call one another |
| abstract syntax tree (AST) | Chapter 3, §3.5 | Data that preserves the meaningful structure parsed from source text |
| binding | Chapter 3, §3.11 | Connecting names in an AST to actual database objects and checking their use |
| catalog | Chapter 4, §4.7 | A description of database objects available for name resolution; initially an in-memory list of tables |
| data type | Chapter 4, §4.7 | A category of values allowed in a column or produced by an expression |
| scope | Chapter 4, §4.9 | The table name, alias, and columns visible while binding one query |
| type checking | Chapter 4, §4.9 | Verifying that expression operators receive compatible operand types before execution |
| bound expression | Chapter 4, §4.8 | An expression whose names and operand types have already been checked |
| three-valued logic | Chapter 4, §4.10 | SQL Boolean logic whose possible results are true, false, and unknown (`NULL`) |
| join | Chapter 4, §4.18 | An operation that combines related rows from two input relations |

## Maintenance rule

Add an entry only after the term is defined in an accepted chapter. If a later
chapter refines the meaning, update the explanation in that chapter and add a
short note here without moving the original introduction. Prefer the vocabulary
already present in this ledger unless a new term expresses a genuinely new
database idea.
