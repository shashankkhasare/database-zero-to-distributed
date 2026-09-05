# Lesson 001 Narration

## Question and result

Every database begins with a question. Suppose we have a small table of three
employees: Ada earns seventy thousand, Linus earns fifty thousand, and Grace
earns seventy-two thousand. We want the names of employees whose salary is
greater than fifty thousand.

In SQL, the question takes only three lines. Select the name, from the employees
table, where salary is greater than fifty thousand. Ada belongs in the result.
Grace does too. Linus does not, because his salary is exactly fifty thousand
and the query asks for something greater.

A real database accepts that SQL, plans the work, reads the data, and returns
the two names. We do not have a database yet, so let us build the smallest
engine capable of producing the same answer.

Before writing any code, picture what must happen to the table. All three rows
enter from one side. Linus's row disappears because it does not pass the salary
condition. Then the I.D. and salary columns disappear because the query asks
only for names. What remains is exactly the result we wanted.

That simple transformation is the idea behind this entire lesson. Before we
write code, we need a picture simple enough to reason about and precise enough
to become a program.

## Core idea

Forget the SQL syntax for a moment. Imagine three boxes connected in a row.
The first box reads the table. The second box decides which rows continue. The
third box removes columns that the result does not need.

The table changes a little as it passes through each box. First we have three
complete employee rows. Then we have two complete rows. Finally, we have two
rows containing only names. No single box understands the whole query. Each
one performs one small transformation and hands its result to the next.

This gives us a useful way to think about a query engine. It is not one large
piece of code that somehow understands every query. It is a collection of
small operations connected in a meaningful order.

Before naming or coding the boxes, we need something concrete for them to pass
between one another. They need rows.

## Rows and values

Return to the table. Where a row and column meet, we find a cell. Ada's I.D.
cell contains the number one. Her name cell contains text. Each cell holds a
value, and our engine must distinguish numbers from text before it can compare
or display them.

Our first Value type therefore supports two possibilities: an integer and a
piece of text. That is enough for every cell in this example. We can add more
possibilities later, when a query actually needs them.

One value represents one cell. A row brings together all the cells describing
one employee. Ada's row contains her I.D., name, and salary. For now, each row
stores a list of column names beside their values. This repeats names such as
I.D. and salary in every row, but it keeps the relationship between a column
and its value visible.

The row needs three small operations. It can be constructed from named values.
It can find a value by column name. And it can produce a smaller row containing
only selected columns. That last operation will let the query return a name
without also returning the employee's I.D. and salary.

We now have the objects that move through our three boxes. How can the program
represent the boxes themselves and preserve the order connecting them?

## Plan structure

Our three-box picture already describes what should happen to those rows: read
the employee rows, keep only rows whose salary is greater than fifty thousand,
and keep only the name column. Now we need to store that description in the
program.

Database systems call these operations scan, filter, and project. Together,
they form a query plan. The plan is a tree. Scan is the leaf at the bottom.
Filter uses the scan as its input. Project uses the filter as its input and
becomes the root at the top.

Each node must remember enough information to do its job. The scan contains
the employee rows. The filter contains the salary column, the boundary of fifty
thousand, and its input node. The project contains the name column and its
input node.

In this plan, each node above the scan points to its child. The project's child
is the filter, and the filter's child is the scan. Rust lets us keep all three
kinds of node in one Plan type, so the complete vocabulary of our first query
engine remains visible in one place.

The picture of three boxes has now become a concrete tree. It records both the
work and the order of that work. But how does a tree that describes a query
actually produce its result?

## Execute the plan

Begin by asking the root for the final answer. We give every plan node an
operation named execute. Executing the project does not begin by removing
columns, because the project has no rows yet. It first asks its child, the
filter, to execute.

The filter has the same problem. It cannot test a salary before receiving a
row, so it asks its child, the scan, to execute. The scan is different. It is
the leaf, already contains the employee rows, and can return them immediately.

Now the filter can work. It examines each employee row, finds the salary, and
asks whether that integer is greater than fifty thousand. This yes-or-no
condition is called a predicate. Ada and Grace satisfy it. Linus does not. The
filter returns only the two surviving rows.

The project receives those rows and keeps the requested name column from each
one. Filtering changed how many rows remained. Projection changes what each
remaining row contains. Two complete employee records become two smaller rows,
each containing only a name.

Notice the repeated request. Project calls execute on filter, and filter calls
execute on scan. The same operation invokes itself on a smaller input plan.
This is recursion, and the tree gives it a natural stopping point: the scan has
no child to execute.

The implementation follows this conversation directly. Scan returns its rows.
Filter executes its input and chooses which rows survive. Project executes its
input and reshapes every returned row. Each node performs one visible job.

We began with data passing through three boxes. We now have the more precise
picture: a tree of nodes asking their children for rows. If we connect that
tree to the employee data, will the answer we predicted actually fall out?

## Run the query

Let us assemble the exact plan and find out. The scan owns our three employee
rows. The filter wraps that scan and stores the salary condition. The project
wraps the filter and asks for the name column.

Run the program. The engine prints Ada, then Grace. Linus is absent because
equality is not enough for a strict greater-than comparison. Each result
contains only a name, confirming that filtering happened before projection.

Our scan read the source rows, our filter applied a predicate, and our project
removed the columns the query did not request. The answer is correct for three
rows. But what must the engine keep in memory if the table contains millions?

## Materialized execution

To answer that, watch when each operation begins. The scan first returns a
complete list of employees. The filter consumes that list and builds another
complete list. Only after the filter finishes does the project begin building
the final result.

A complete intermediate list like this is called a materialized result. Our
engine therefore uses materialized execution. It is easy to follow and works
well for three rows, but a large table could leave us holding many rows in
memory between every pair of operations.

Later, we will let an operation process rows as they become available instead
of waiting for a complete list. Before improving it, though, step back and ask:
what kind of language have we accidentally created by connecting these
operations?

## Relational algebra

Return to our opening picture. We began with three ordinary actions: read rows,
keep some rows, and keep some columns. By connecting them, we produced a tree
that transforms one collection of rows into another.

Scan, filter, and project are the beginnings of relational algebra, a small
language for describing transformations of relations. Giving the tree this
meaning will let us inspect it, explain it, and eventually rearrange it without
changing the answer.

We have built the smallest query engine. Next, we will look at the algebra
inside its plan and discover why that simple tree is more powerful than it
first appears.
