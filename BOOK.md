# The Book

# Database: Zero to Distributed

This repository will produce a complete, executable book about building a
distributed SQL database from first principles.

The reader should learn the system by reading an explanation and then studying,
running, changing, and breaking the real implementation beside it.

The book is not a transcript of the videos. It is a durable technical narrative
that should remain useful without video, narration, or external context.

---

# What the reader should experience

Every chapter begins with a concrete limitation in the current database.

The reader should be able to follow this loop:

```text
Observe the current system
          ↓
Create a problem it cannot solve well
          ↓
Derive one database concept
          ↓
Implement the smallest useful version
          ↓
Run it and inspect the result
          ↓
Understand the new limitation
```

The implementation is part of the argument. Important claims should be backed
by code, tests, measurements, plans, byte layouts, traces, or failure
experiments from this repository.

---

# Relationship between lessons, chapters, and videos

One roadmap lesson normally becomes:

- one reproducible repository state
- one book chapter
- one runnable demonstration
- one set of concept-focused tests
- one generated video episode

The chapter and video teach the same concept but are not required to use the
same wording. The chapter favors careful explanation and reference material.
The video favors pacing, motion, and visual intuition. Both use the repository
implementation as their source of truth.

`Roadmap.md` defines the order of concepts. `TODO.md` tracks implementation and
publication progress. This file defines the standard expected from the book,
while `VIDEO.md` defines the shared video-production workflow.

---

# Chapter shape

A chapter should generally contain the following sections when they help the
lesson. Do not add empty sections merely to satisfy a template.

## The problem

Start with observable behavior, a failing example, or a limitation in the
previous chapter. Give the reader a reason to need the next concept.

## The mental model

Explain the database idea in plain language before introducing implementation
details. Use a small diagram when relationships or data movement are otherwise
hard to see.

## The representation

Show the important Rust types, plan nodes, byte layouts, or protocol messages.
Prefer representations that make the database architecture visible.

## Build it

Develop the implementation in small, motivated steps. Explain decisions and
intentional simplifications. Avoid presenting large unexplained listings.

## Run it

Provide a deterministic command and expected output. The command must execute
real repository code.

## Test the concept

Include readable tests that demonstrate the behavior taught by the chapter.
Explain what each important test proves.

## Break it

Where useful, change an input, inject a failure, or increase scale until the
new design reveals its next limitation.

## What production systems do differently

Clearly distinguish the educational implementation from production database
behavior. Introduce only the differences needed to prevent a misleading mental
model.

## What comes next

End with the unresolved problem that motivates the following chapter.

---

# Writing principles

1. Teach one database concept at a time.
2. Begin with a problem, not a vocabulary list.
3. Keep code and prose synchronized.
4. Prefer small complete examples over isolated fragments.
5. Explain why code changes, not only what changed.
6. Mark educational simplifications explicitly.
7. Avoid unexplained Rust cleverness.
8. Use stable, reproducible output in examples.
9. Introduce terminology after the reader has something concrete to name.
10. Let the repository architecture evolve in view of the reader.

---

# Cross-chapter continuity

The book is one continuous argument, not a collection of independent articles.
Before drafting a chapter, read the preceding chapter's opening, ending,
terminology, callouts, exercises, diagrams, and promises. The new chapter
should pick up the unresolved question near its beginning instead of silently
starting a different conversation.

Use [`book/TERMS.md`](book/TERMS.md) as the editorial terminology ledger. When
a previous chapter has already introduced a term, refer back to the familiar
idea and use the term normally. Do not bold and define it again as if the
reader missed the earlier explanation. Add a term to the ledger when its first
real definition is accepted.

Later chapters should spend the vocabulary that earlier chapters earned. If a
chapter introduced `predicate`, use `predicate` instead of returning to a
longer unnamed description of the same idea. A brief callback is useful when
context has changed, but it should extend the reader's model rather than repeat
the original definition.

Honor promises made by earlier chapters. If an earlier chapter establishes a
diagram convention, a simplification to revisit, or a question for the next
lesson, either fulfill it or revise the original promise. Prefer references
such as “the next lesson,” “later in Season 2,” or a link to `Roadmap.md` over
hard chapter numbers that can become stale as the curriculum changes.

Keep recurring chapter furniture recognizable without forcing every lesson
into an identical template. Callouts should use the established meanings,
reader experiments should contain something the reader can actually do, and
answers should not be revealed before the attempt. Compare new diagrams with
earlier ones and remove any that merely redraw an already familiar idea.

Before declaring a chapter ready for review, perform a seam audit:

1. Read the previous chapter's final section and the new chapter's opening
   together.
2. Check new bold terms against `book/TERMS.md` and earlier chapters.
3. Search for promises, terminology, and diagrams carried across the boundary.
4. Verify every source-labelled code block in its stated repository context.
5. Compare heading depth, callout names, exercises, and closing momentum with
   nearby chapters.

---

# Narration style

The book should read like an experienced programmer building the system beside
the reader. It should be conversational and energetic without becoming casual
about correctness. The prose must have its own voice; use the principles below
rather than imitating another author sentence by sentence.

## Preserve continuity across chapters

Treat the book as one continuing investigation, not a collection of independent
articles. Before drafting a chapter, read the preceding chapter's opening,
closing section, vocabulary, exercises, and deliberate limitations. The new
chapter should catch the unresolved question left by the previous one within
its opening paragraphs.

Define and bold a technical term only at its first meaningful introduction.
Later chapters should call it back in ordinary prose and spend the vocabulary
the reader has already learned. Maintain consistency for recurring structural
devices such as production notes, try-it sections, limitation summaries, code
placement labels, heading depth, and chapter endings.

When a later chapter qualifies an earlier simplification, name the earlier
behavior directly. Forward references should point to a roadmap season or a
stable topic unless the destination chapter already exists. Before review,
compare the new chapter beside its predecessor for narrative rhythm, code
integrity, diagram economy, and reader activity.

## Assume curiosity, not a computer-science education

Assume the reader has written or modified a small program and understands basic
ideas such as variables, functions, conditions, and lists. Do not assume a
computer-science degree, database coursework, or systems-programming
experience. Readers who are new to Rust can use Appendix A as a reference.

Keep the main narrative focused on database ideas. Use straightforward Rust,
but do not interrupt a chapter to teach syntax such as `Vec`, `match`, `Box`,
borrowing, method calls, or test macros. Explain a Rust choice only when it
changes the reader's understanding of the database representation or behavior.

Use familiar examples before formal models. A relation begins as a table; a
predicate begins as a yes-or-no question about one row; recursion begins as one
plan asking its smaller input plan to run. Introduce the formal term only after
the ordinary explanation is secure.

The book is not a complete Rust tutorial. Link to the relevant appendix section
when language background would otherwise interrupt the database story.

## Use the Rust appendix as a reference

Appendix A, **Enough Rust to Build a Database**, is optional reference material.
It should collect the small set of Rust concepts used throughout the project
without becoming a course that readers must finish before chapter 1. Organize
it around code from this database rather than unrelated language exercises.

Main chapters should identify project-specific operations when confusion with a
standard Rust feature is likely, but their purpose and database behavior matter
more than their syntax. Keep the appendix practical, incremental, and free of
advanced Rust that the current implementation does not use.

## Speak collaboratively

Use **we** for the shared investigation and implementation:

> We can execute the filter now, but first we need something it can filter.

Use **you** sparingly for actions the reader performs or observations they can
verify:

> Run the program again. You should see two rows this time.

Avoid distant textbook phrasing such as “the student will now implement.” The
reader should feel accompanied through the work.

## Shape paragraphs for human reading

Each paragraph should carry one clear idea. Aim for roughly 55–60 words in the
main explanatory prose when the idea naturally supports that length. Treat it
as a reading rhythm, not a quota.

Use a shorter paragraph for a question, transition, conclusion, moment of
emphasis, or introduction to code. A short sentence can give the reader room to
pause before the next concept.

When a prose paragraph grows beyond roughly 70 words, look for a natural split.
Do not split code, lists, quotations, or asides merely to satisfy a word count.
Never add filler to lengthen a paragraph or compress an explanation until it
becomes harder to understand.

Vary paragraph length deliberately. A page made entirely of equal-sized blocks
feels mechanical; a page with only one-line fragments feels breathless. The
goal is a calm rhythm that makes technical reasoning easy to follow.

## Lead with something concrete

Open a section with behavior, data, output, a question, or a small failure. Do
not begin with a formal definition when the reader has nothing concrete to
attach it to.

Use this order:

```text
concrete example
      ↓
plain-language explanation
      ↓
technical term
      ↓
representation in code
```

For example, first describe keeping rows whose salary is high enough. Then name
that operation a filter and its true-or-false condition a predicate.

## Build in small visible steps

A chapter should alternate between explanation and small code changes. For each
change:

1. state the immediate goal
2. name the real repository file and whether it is created or changed
3. show the smallest meaningful code fragment
4. explain what the fragment does and why it has this shape
5. run or test it as soon as it produces observable behavior
6. connect the result to the next small problem

Use editorial labels such as:

```text
src/row.rs: create this file
src/plan.rs: add to Plan::execute()
src/main.rs: replace the demo plan
```

These labels describe intent rather than brittle line numbers. The complete
repository state remains authoritative.

## Explain code after showing it

Do not drop a large listing and expect the reader to decode it. Immediately
unpack new fields, enum variants, control flow, and important Rust syntax.

Explain only the Rust needed for the database idea at hand. A short explanation
of why `Box<Plan>` gives a recursive enum a known size is useful. A general
survey of smart pointers is not.

When code uses a familiar-looking operation in a subtle way, walk through one
real input by hand.

## Keep a runnable rhythm

The reader should never travel far without a checkpoint. Use short transitions
such as:

> That is enough machinery to try it. Run the program.

Every checkpoint should include the exact command and stable expected output.
After the output, explain what it proves and what it does not prove.

## Introduce vocabulary gently

Assume general programming experience but no database expertise and no advanced
Rust knowledge.

At first use:

- explain the idea in ordinary language
- give the technical term
- use that term consistently afterward

Do not stack several undefined terms in one sentence. If a term is not needed
again, prefer plain language instead of adding vocabulary merely for
completeness.

## Use personality with restraint

Light humor, analogy, and opinion can make dense material easier to remember.
They should arise naturally from the work and remain short. Never let a joke
interrupt a crucial explanation, belittle the reader, or make an important
guarantee sound optional.

Prefer concrete observations over exaggerated claims. It is fine to admit when
an implementation is repetitive, naive, or temporarily awkward, as long as the
chapter explains why that choice helps us learn.

Do not use em dashes in manuscript prose, headings, labels, notes, or contents.
Use a period, comma, colon, or parentheses according to the relationship
between the ideas.

## Separate the main path from side paths

Keep the central build moving forward. Historical context, alternative designs,
production differences, and Rust details that are useful but nonessential
belong in the established design, production, or Rust notes.

The reader should be able to skip an aside without losing the steps required to
run the chapter.

## Finish with play and momentum

After the main implementation works, offer a few focused experiments or
challenges. They should reinforce the current concept rather than silently
introduce the next lesson.

End by revealing a limitation or unanswered question. The transition should
make the next chapter feel necessary, not merely next in a list.

---

# Code-listing policy

The repository is the canonical source for code. Chapters may quote the parts
needed for an explanation, but should not maintain a separate fake
implementation.

Code listings should:

- name the source file they come from
- include enough unchanged surrounding code to show where an edit belongs
- use a nearby type, function, match arm, or closing brace as a placement anchor
- stay short enough to discuss meaningfully
- omit unrelated details explicitly when shortened
- compile in their complete repository context
- avoid line numbers that become stale unless generated automatically

Do not present a bare method signature or isolated closing brace when the reader
could reasonably wonder where it belongs. Mark omitted existing code clearly,
and explain temporary placeholders when an incremental snippet is not yet the
final implementation.

When a chapter requires the reader to make several edits, its latest verified
`lesson-NNN` tag remains the final reference implementation for that stage.
During active series development, an accepted correction may move that tag
after the complete lesson is verified again. Never point an older lesson tag at
a main-branch state that already includes later lessons.

---

# Diagrams and output

Diagrams should be source-controlled and reproducible where practical. Query
plans, stage DAGs, page layouts, task states, and protocol flows should use
stable labels that agree with the implementation.

Generated output used by the book must be deterministic unless nondeterminism
is itself the lesson. Concurrent results should be sorted for presentation when
their order has no meaning.

Query-plan diagrams place the final operation, called the root, at the top and
data sources at the bottom. Rows flow upward from the sources toward the result.
Early chapters should draw upward arrows explicitly while the reader learns the
convention. Later chapters may use plain connecting lines after reminding the
reader that the same bottom-to-top data flow is implied.

When a diagram shows control calls instead of row movement, label that direction
separately. Do not use one unlabeled arrow to mean both “ask the child to run”
and “return rows to the parent.”

---

# Web-book visual direction

The web edition should feel like a carefully typeset technical book rather
than documentation software or a generic blog.

We should borrow its design principles, not copy its identity, illustrations,
ornaments, or exact color palette.

## Reading experience

- Use a centered, narrow reading column of roughly 680–760 pixels on desktop.
- Keep line length near 65–75 characters for sustained technical reading.
- Surround the page with generous space and a quiet, warm background.
- Present the chapter as a subtle paper-like surface rather than a dashboard.
- Let prose dominate; controls should recede until the reader needs them.
- Preserve comfortable paragraph spacing and a strong vertical rhythm.

## Typography

- Use a readable serif face for long-form prose.
- Use a restrained sans-serif face for navigation, labels, and metadata.
- Use a dedicated monospace face for Rust, SQL, shell commands, plans, and
  output.
- Give chapter numbers and titles a distinct editorial treatment.
- Make headings clearly hierarchical without making every section oversized.
- Bundle or pin web fonts so builds do not change when an external font service
  changes.

The final typefaces should have permissive licenses and render well on Windows,
macOS, Linux, Android, and iOS.

## Contents and navigation

- Organize the contents page into the roadmap's seasons and numbered chapters.
- Show optional essays, design notes, and appendices as visually subordinate
  entries.
- Provide previous chapter, contents, and next chapter navigation on every
  chapter page.
- Keep chapter progress visible without a permanently dominant application
  sidebar.
- Make heading anchors linkable and easy to copy.
- Support keyboard navigation without interfering with browser shortcuts.

## Code and database material

- Give code blocks excellent contrast, readable line height, and horizontal
  scrolling on small screens.
- Label source-backed snippets with their real repository path.
- Visually distinguish added, removed, highlighted, and contextual lines when a
  chapter develops code incrementally.
- Give terminal output, SQL, query plans, byte layouts, and protocol traces
  related but distinct treatments.
- Allow wide diagrams and tables to escape the prose column when necessary.
- Never rely on color alone to communicate a code change or execution state.

## Notes and exercises

Use a small family of recognizable editorial asides:

- **Design note** for alternatives and tradeoffs
- **Production note** for how real systems go further
- **Rust note** for language details needed by the implementation
- **Try it** for a small reader experiment
- **Failure lab** for deterministic breakage and recovery exercises

Asides should feel integrated with the page, not like intrusive alert boxes.

## Responsive and accessible behavior

- Collapse navigation gracefully on narrow screens.
- Keep body text readable without zooming.
- Preserve code scrolling without forcing the entire page to scroll sideways.
- Meet WCAG AA contrast targets for prose, controls, code, and diagrams.
- Provide visible keyboard focus, semantic landmarks, and a skip link.
- Respect reduced-motion and dark-mode preferences.
- Provide useful alternative text or adjacent explanations for diagrams.
- Keep the complete book readable with JavaScript disabled; JavaScript may
  enhance navigation but should not be required for prose or code.

## Distinct identity

Our visual language should come from database concepts: rows, pages, plan
trees, partitions, logs, and data movement. A restrained ink, paper, and
database-accent palette can give the book its own identity while retaining the
calm editorial quality of the reference.

The first visual prototype should include a contents page and one real chapter,
at desktop and mobile widths. Styling is accepted only after testing an actual
lesson with prose, Rust, SQL, output, a diagram, an aside, and chapter
navigation.

---

# Book build strategy

Do not choose a publishing framework before the first real chapter exposes its
requirements. Begin with Markdown because it is readable in the repository and
portable to later HTML, EPUB, and PDF tooling.

Before selecting a book renderer, produce the first chapter in Markdown and
evaluate:

- syntax highlighting
- diagrams and captions
- cross-references
- callouts and footnotes
- print layout
- HTML navigation
- EPUB compatibility
- deterministic builds

Only then add the smallest publishing toolchain that meets the demonstrated
needs.

---

# Definition of a finished chapter

A chapter is complete when:

- [ ] its motivating problem is reproducible
- [ ] its database concept is explained independently of the code
- [ ] its implementation exists in the repository
- [ ] meaningful tests demonstrate the concept
- [ ] a deterministic demo runs successfully
- [ ] important simplifications and tradeoffs are documented
- [ ] code references match the tagged repository state
- [ ] diagrams and expected output are reproducible
- [ ] its opening continues the previous chapter's unresolved problem
- [ ] established terms are reused consistently with `book/TERMS.md`
- [ ] earlier promises and diagram conventions are honored or deliberately revised
- [ ] source-labelled code blocks compile in their stated repository context
- [ ] the chapter has been technically reviewed
- [ ] spelling, links, formatting, and rendering have been checked
