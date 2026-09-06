# Book Manuscript

This directory contains the source manuscript for **Database: Zero to
Distributed**.

The book is written beside the implementation. Chapters should explain code
that exists and has been verified, not architecture that the repository may
eventually contain.

## Conventions

- `contents.md` is the manuscript table of contents.
- Numbered Markdown files contain chapters.
- Repository code, tests, and demos are the source of truth.
- Commands and expected output must be reproducible.
- Educational simplifications must be stated explicitly.
- A chapter should expose the limitation that motivates the next chapter.

The complete writing and web-book contract lives in [`../BOOK.md`](../BOOK.md).
Current progress lives in [`../TODO.md`](../TODO.md).

## Render locally

Install mdBook 0.5.4, then run:

```bash
mdbook build
```

The generated site is written to `build/book/`. Use `mdbook serve` while
editing to rebuild the site and preview it in a browser.
