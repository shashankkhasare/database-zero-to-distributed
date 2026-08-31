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
publication progress. This file defines the standard expected from the book.

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

# Code-listing policy

The repository is the canonical source for code. Chapters may quote the parts
needed for an explanation, but should not maintain a separate fake
implementation.

Code listings should:

- name the source file they come from
- stay short enough to discuss meaningfully
- omit unrelated details explicitly when shortened
- compile in their complete repository context
- avoid line numbers that become stale unless generated automatically

When a chapter requires the reader to make several edits, the tagged lesson
state remains the final reference implementation.

---

# Diagrams and output

Diagrams should be source-controlled and reproducible where practical. Query
plans, stage DAGs, page layouts, task states, and protocol flows should use
stable labels that agree with the implementation.

Generated output used by the book must be deterministic unless nondeterminism
is itself the lesson. Concurrent results should be sorted for presentation when
their order has no meaning.

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
- [ ] the chapter has been technically reviewed
- [ ] spelling, links, formatting, and rendering have been checked
