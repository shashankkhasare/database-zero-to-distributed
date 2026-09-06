# Asset Provenance

This file records the origin and licensing of durable media used by the book
and videos. Generated build outputs are not listed unless an external source
affects their usage rights.

## Book illustrations

Book illustration art direction and per-image prompts are versioned under
`book/art/`. Generated raster outputs are stored under `book/images/` and are
reviewed before inclusion in a chapter. Unless an entry says otherwise, they
are generated specifically for this project from original prompts without
external image inputs.

## Lesson 001 musical theme

- Source: `video/music/001-theme.mjs`
- Origin: original procedural synthesis created for this repository
- External samples or compositions: none
- License: MIT, together with the repository code
- Generated outputs: `build/video/001/music/ident.wav` and `outro.wav`

The generator combines sine-wave harmonics using explicit notes and envelopes.
The WAV files are reproducible build artifacts and are not committed.
