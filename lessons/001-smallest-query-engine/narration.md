# Lesson 001 Narration

## Question and result

Suppose I give you this tiny table of employees and ask a simple question.

Which employees earn more than fifty thousand?

Ada earns seventy thousand.
Linus earns exactly fifty thousand.
Grace earns seventy-two thousand.

Before thinking about SQL or databases, decide what the answer should be.

Ada should appear.

Grace should appear.

Linus should not.

The important word is *more*. Exactly fifty thousand does not qualify.

In SQL, the question is compact:

Select the name from the employees table where salary is greater than fifty thousand.

A real database takes that query and returns the two names we predicted.

But there is quite a lot hiding between the query we write and the rows that come back.

So instead of building a database, let us ask a smaller question.

What is the least machinery we need to reproduce this result?

Forget SQL for a moment and watch what happens to the table.

We begin with three complete rows.

One row disappears because it does not satisfy the salary condition.

Then the unnecessary columns disappear because the query asks only for names.

What remains is the result.

That transformation is what our first query engine needs to reproduce.

## Core idea

Without using database terminology, we can describe the work with three small operations.

One operation gives us rows.

Another decides which rows survive.

And another decides which columns remain.

Imagine them as three boxes connected together.

Rows flow from one box to the next.

And notice something useful.

No box needs to understand the entire query.

The first does not care which rows will later be rejected.

The second does not care which columns will eventually be displayed.

The third does not care why a row disappeared earlier.

Each operation knows one small part of the job.

The meaning comes from how those operations are connected.

So our first picture of a query engine is a collection of small transformations arranged in the right order.

What moves between those transformations?

Rows.

So before we build the operators, we need to decide what a row actually is.

## Rows and values

Look at Ada's row.

Her I.D. is a number.

Her name is text.

Her salary is another number.

Each cell holds a value, but not every value is the same kind of thing.

The engine needs to know the difference.

For this first implementation, a value only needs two possibilities:

an integer,

or a piece of text.

That is enough for this table.

We can add more types when a future query actually needs them.

One value represents one cell.

A row brings several values together.

But there is another problem.

If the engine sees the number seventy thousand, how does it know that this is a salary rather than an I.D.?

For now, we keep the column name beside each value.

So a row can say:

I.D. is one.

Name is Ada.

Salary is seventy thousand.

This repeats column names in every row, which a real engine might avoid, but it keeps the representation easy to inspect.

With that structure, a row needs only a few basic operations.

We should be able to construct one.

We should be able to look up a value by column name.

And we should be able to produce a smaller row containing only selected columns.

That last operation will become important when the query asks for a name but not an I.D. or salary.

Now we know what moves through the engine.

The next question is how to represent the operations those rows move through.

## Plan structure

Return to our three operations.

Database systems give them names.

The operation that produces rows is a **scan**.

The operation that keeps matching rows is a **filter**.

And the operation that keeps selected columns is called **projection**. Our Rust plan names the node that performs it `Project`.

When we connect operators like these to describe how a query should run, we get a **query plan**.

At first, it is natural to picture that plan as three boxes in a line.

But another picture is more useful.

A tree.

The scan sits at the bottom.

The filter depends on the scan.

The `Project` node depends on the filter.

So the `Project` node becomes the root, and the scan becomes a leaf.

This can feel backwards at first because the operation that happens last appears at the top.

But the structure is describing dependencies.

The `Project` node needs the filter.

The filter needs the scan.

That means each node only needs to point to the operation that provides its input.

Each node also stores the information needed for its own job.

The scan stores the employee rows.

The filter stores its input, the salary column, and the value fifty thousand.

The `Project` node stores its input and the name column.

Rust lets us represent these node types together inside one `Plan` type.

At this point, nothing has executed.

The tree is only a description of the work.

So how does that description produce rows?

## Execute the plan

Suppose we ask the root of the tree for the final result.

The root is the `Project` node.

So every plan node gets an operation called `execute`.

What happens when we execute the `Project` node?

It cannot remove columns yet because it does not have any rows.

So it asks its child to execute.

Its child is the filter.

The filter has the same problem.

It knows how to test a salary, but it has no rows yet.

So it asks its own child to execute.

That child is the scan.

And here the chain stops.

The scan has no child.

It already contains the employee rows, so it can return them immediately.

Now execution begins moving back up the tree.

The filter receives those rows.

For each one, it looks up the salary and asks a yes-or-no question:

Is this salary greater than fifty thousand?

That kind of yes-or-no test is called a **predicate**.

Rows for which the predicate is true survive.

Rows for which it is false disappear.

The surviving rows then move to the `Project` node.

The `Project` node does something different.

It does not decide whether a row survives.

It changes what each surviving row contains.

From each row, it keeps only the requested name column.

That gives us an important distinction.

Filtering changes **which rows remain**.

Projection changes **what those rows contain**.

Now notice the shape of the execution.

The `Project` node calls `execute` on the filter.

Filter calls `execute` on scan.

The same operation is applied to smaller and smaller pieces of the tree.

That is recursion.

And the tree gives the recursion a natural stopping point.

Eventually we reach a leaf.

The scan has no child, so it returns data.

The implementation follows the structure of the plan itself.

We began with a visual transformation.

Then we represented that transformation as operators.

Then we connected the operators into a tree.

And now that tree can execute.

The only thing left is to check whether the program agrees with our original prediction.

## Run the query

Run:

`cargo run`

The engine prints:

Ada

Grace

Linus is gone, and each result contains only the requested name.

So our prediction and implementation agree.

Small as it is, this is already a query engine.

Data flows through a plan of operators and produces a result.

But there is something about the way it executes that will matter once the table becomes larger.

Imagine replacing three employees with one million.

What happens to all those rows while the plan runs?

## Materialized execution

Watch the data.

The scan produces a complete collection of rows.

Only after that collection exists does the filter produce another complete collection.

Then the `Project` node produces the final one.

Each operator finishes its entire result before the next stage completes.

This execution model is called **materialized execution**.

Each intermediate result is materialized in memory.

For three rows, that is irrelevant.

For millions of rows, it can become expensive.

Later, we will look at execution models where rows can move forward as soon as they are ready.

For now, materialized execution has one useful property.

It makes every intermediate result easy to see.

And with our first plan working, there is one final idea to name.

## Relational algebra

Scanning, filtering, and projection are examples of operations from a language for transforming relations.

That language is called **relational algebra**.

SQL is what we write.

A relational plan describes the operations underneath it.

And we now have enough machinery to work with those plans.

We can represent values and rows.

We can describe computation as a tree of operators.

And we can execute that tree to produce a result.

Those pieces are the material for the next chapter.

Because once a query exists as a plan, a new question becomes possible.

Can two different plans represent the same computation?

And if they can, what transformations can we make without changing the answer?

That is the question we will explore next.
