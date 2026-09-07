# Editorial Terminology Ledger

This file records when the book first gives a technical term a real definition.
It is an editorial aid for writers and agents, not a replacement for explaining
ideas in the chapters where readers encounter them.

Before drafting a chapter, check this ledger and the cited source. Later
chapters should use an established term normally or introduce a short callback
that adds new meaning. They should not bold and redefine it as new vocabulary.

| Term | First introduced | Established meaning |
|------|------------------|---------------------|
| relation | Chapter 1, §1.2 | A table-like collection of rows |
| schema | Chapter 1, §1.2 production note | A separate description of column names and types |
| leaf | Chapter 1, §1.3 | A plan node with no child |
| predicate | Chapter 1, §1.4.2 | A condition that answers yes or no for a row |
| recursion | Chapter 1, §1.4 | A plan executing its smaller input plan through the same method |
| materialized result | Chapter 1, §1.6 | A complete intermediate result collected before the next operation begins |
| materialized execution | Chapter 1, §1.6 | Execution in which each operation collects its complete result |
| relational algebra | Chapter 1, §1.8 | A language of operations that transform relations |
| selection | Chapter 2, §2.3 | The relational-algebra operation that retains rows satisfying a predicate |
| projection | Chapter 2, §2.3 | The relational-algebra operation that retains selected columns |
| logical plan | Chapter 2, §2.3 | A description of what result a query requires |
| physical plan | Chapter 2, §2.3 | A description of how the database will perform the work |
| equivalent plans | Chapter 2, §2.4 | Plans that produce the same result for every valid input |
| counterexample | Chapter 2, §2.5.3 | One valid input that disproves an equivalence claim |

## Maintenance rule

Add an entry only after the term is defined in an accepted chapter. If a later
chapter refines the meaning, update the explanation in that chapter and add a
short note here without moving the original introduction. Prefer the vocabulary
already present in this ledger unless a new term expresses a genuinely new
database idea.
