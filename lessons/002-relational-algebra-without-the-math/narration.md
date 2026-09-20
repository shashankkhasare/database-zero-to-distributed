# Lesson 002 Narration

## The equivalence question

In the previous lesson, we built a small query engine.

It started with three employee rows, kept the employees earning more than fifty thousand, and then kept only their names.

That gave us Ada and Grace.

Now suppose I change the plan.

Maybe I move one operation earlier.

Maybe I remove another.

Maybe the tree looks different but, for this particular table, still prints the same names.

Does that mean the new plan represents the same query?

Or did we just get lucky?

That is the question we need to answer before we can talk seriously about optimization.

Because an optimizer is allowed to change a plan.

But it is not allowed to change what the query means.

So how can we tell whether two different plans mean the same thing?

## Relations through the plan

Start again with the employee table.

It contains rows and columns.

In the previous lesson, we called this kind of table-shaped object a relation.

Now watch what happens as the data moves through the plan.

The scan gives us the employee relation.

After filtering, some rows disappear, but what remains is still rows and columns, which makes it another relation.

Then projection removes some columns.

And again, what remains is rows and columns, which is another relation.

So each operation takes a relation as input and produces another relation as output.

That is why these operations compose so naturally.

The output of one can become the input of the next.

And now that we can see the structure, we can give these two transformations their mathematical names.

## Selection and projection

Our Rust engine calls one operation Filter.

It checks a condition for each row and keeps the rows where that condition is true.

Relational algebra calls this selection.

It is written using the Greek letter sigma.

So sigma with the condition salary greater than fifty thousand means:

keep the rows whose salary is greater than fifty thousand.

There is one naming trap worth noticing.

In relational algebra, selection chooses rows.

That is different from SQL's SELECT, which appears near the columns being returned.

Our other operation is Project.

It keeps certain columns and removes the rest.

Relational algebra calls this projection.

It is written using the Greek letter pi.

So pi name means:

keep only the name column.

Selection changes which rows remain.

Projection changes what those rows contain.

If we nest those two operations around the employees relation, we get a compact description of the same work performed by our Rust plan.

We start with employees, select salaries greater than fifty thousand, and then project the name column.

This expression tells us what transformation the query means.

It does not yet tell us whether the data comes from a file, an index, or some other storage structure.

For this lesson, that logical meaning is what matters.

Because now we can finally return to our original question.

## Is matching output enough?

Suppose I give you two different plans.

You run both on our employee table.

Both print Ada and Grace.

Are the plans equivalent?

It is tempting to say yes.

They produced the same answer.

But think about what we actually tested.

We tested three rows.

That only tells us that the two plans agree on these three rows.

What if they disagree on a row we never happened to include?

Consider two plans.

The first applies two filters:

salary greater than fifty thousand,

and then salary greater than sixty thousand.

The second accidentally drops the stricter condition and keeps only:

salary greater than fifty thousand.

Now test both plans on our original data.

Ada earns seventy thousand.

Linus earns fifty thousand.

Grace earns seventy-two thousand.

The first plan returns Ada and Grace.

The second plan also returns Ada and Grace.

So far, they look identical.

But look more carefully at the salaries we chose.

None of them lies between fifty thousand and sixty thousand.

Our test data never gave the two plans a chance to disagree.

So add one more employee.

Edsger earns fifty-five thousand.

What happens now?

The first plan rejects him because fifty-five thousand is not greater than sixty thousand.

The second plan keeps him because it is greater than fifty thousand.

Now the outputs differ.

So those two plans were never equivalent.

Our original table simply hid the difference.

Edsger's row is a counterexample.

One valid input is enough to prove that two plans are not equivalent.

And this gives us the stronger definition we were looking for.

A plan can run only when its input contains the columns and value types its operations require.

An input is valid for two plans when both plans can run on it.

The plans are equivalent only when they produce the same result for every such input.

Not just one table or ten examples, but every valid input.

That word every is doing a lot of work.

## Three laws we can use

The definition tells us what equivalence requires.

But it does not yet tell us which changes are safe.

Database researchers have studied that question formally for decades.

A foundational paper by Aho, Sagiv, and Ullman examined equivalence for expressions built from selection, projection, and join.

We do not need its full machinery yet.

Our engine supports enough structure to understand three useful laws.

First, two filters can exchange places.

Suppose one checks salary and another checks I.D.

A row reaches the top only when both conditions are true.

Changing which filter asks first cannot change which rows satisfy both conditions.

Second, nested projections can collapse.

Suppose one projection keeps name and salary, and the next keeps only name.

The inner projection removed nothing needed by the outer one.

Keeping name directly produces the same final rows.

Third, we may add an early projection below a filter, but only if it keeps everything still needed.

That means the columns required by the final answer, together with the columns read by the predicate.

This third law is easy to misuse.

So let us apply it carefully to our employee plan.

## Moving projection

Now let us try a different kind of rewrite.

Our working plan filters by salary first and projects the name column afterward.

What if we add a projection earlier?

At first, that sounds reasonable.

If the final query only needs the name column, why carry all the other columns through the plan?

Keep the final name projection where it is, and add another projection immediately after the scan.

Suppose that earlier projection keeps only the name.

The scan produces complete employee rows.

The projection keeps only the name.

Then those smaller rows reach the filter.

And the filter asks:

What is this employee's salary?

But salary is gone.

The earlier projection removed information that a later operation still needs.

So this rewrite does not preserve the query.

In fact, our engine cannot even execute it.

The important point is not that projection is dangerous.

The problem is which columns it removes.

So let us try again.

The final answer needs name.

The predicate needs salary.

Their union is name and salary.

So instead of projecting only the name, suppose the early projection keeps both name and salary.

It removes only I.D.

Now the filter still has salary, so it can evaluate its condition.

And the final projection still has name, so it can produce the requested result.

Does removing I.D. change anything?

No later operation reads it.

So it cannot influence whether a row survives or what final value is returned.

This means the rewritten plan can safely remove I.D. earlier.

The trees are different.

But their meaning is the same.

That is the kind of rewrite an optimizer wants.

## Laws and counterexamples

Notice what happened in these two examples.

In the first, we found a value that made two plans disagree.

That disproved equivalence.

In the second, we asked whether removing a column could affect anything later in the plan.

Because no later operation depended on I.D., removing it early was safe.

These examples give us two different forms of reasoning.

A law proves a transformation safe when its conditions hold.

A counterexample proves a proposed equivalence false.

For an early projection, the condition is precise.

Keep the columns required by the final result and every column required by the predicate.

For a claimed equivalence, the challenge is equally precise.

Can any valid input make the plans disagree?

This is much stronger than simply running the plans on whatever data happens to be available.

## Why equivalence matters

Why care so much about rearranging a tiny tree?

Because real query optimizers do this constantly.

They move operations and remove unnecessary work.

They change how joins are arranged.

They choose different ways to access data.

Some of those choices can make a query dramatically faster.

But speed comes second.

The first requirement is correctness.

A plan that runs twice as fast but returns different rows is not an optimization.

It is a different query.

Equivalence gives the optimizer its safety boundary.

Inside that boundary, it can search for cheaper ways to compute the same result.

Outside it, the meaning has changed.

Our engine is still simple.

Its rows live in a vector, and it preserves both order and duplicates.

Textbook relational algebra usually treats relations as sets, so projection removes duplicate rows. Our Project operation keeps them. In this course, we will reason about the behavior our engine actually implements and point out where it differs from the textbook model.

So for now, equivalence means preserving the behavior that this engine actually exposes.

Its predicates are also simple integer comparisons.

In a richer language, expressions may fail, depend on the current time, or change some state while they run.

Those behaviors can make the order of evaluation observable, so familiar laws need additional conditions.

That is enough for us to reason carefully about the plans we can build today.

## SQL handoff

We now have a more precise way to look at a query plan.

It is not just a tree that happens to run.

It represents a transformation with a particular meaning.

And if we want to rearrange that tree, we need to preserve that meaning for every valid input.

That gives us the logical foundation an optimizer will eventually need.

But there is still something artificial about our engine.

Every plan is being assembled by hand in Rust.

A user should not need to construct nested Plan values just to ask for employee names.

They should be able to write something like:

Select name from employees where salary is greater than fifty thousand.

And let the database figure out the tree.

So the next question is no longer about rearranging a plan.

It is about where the plan comes from.

How do the words SELECT, FROM, and WHERE become the logical structure our engine already knows how to execute?

That is the material for the next chapter.
