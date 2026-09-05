# Video Production

This document defines how book lessons become reproducible video episodes.
`TODO.md` records what has actually been implemented and verified. Do not treat
the commands or directories described here as complete until their checklist
items are checked.

# Design principles

- The repository implementation is the source of truth for code and output.
- A video teaches the same concept as its chapter but uses a separate spoken
  script suited to timing, motion, and listening.
- Lesson directories contain episode-specific sources and configuration.
- Shared scripts and templates belong to the video pipeline, not to individual
  lessons.
- Generated audio, frames, captions, previews, models, and final videos are
  reproducible artifacts and are not committed to Git.
- Commands should be non-interactive and deterministic where practical.

# Narration approach

Begin each episode with a concrete question, visible transformation, or
surprising limitation. Give the viewer a simple visual model of the whole idea
before introducing formal terms, code, or implementation details.

Use one guiding question to carry the episode. Let visuals perform part of the
explanation instead of narrating every item shown on screen. Move from concrete
behavior to intuition, then to terminology, representation, and code. Return to
the opening picture after implementation so the viewer can see what became more
precise.

Transitions should arise from unanswered questions. A scene should establish
why the next scene is needed before moving there. Avoid reading source code
aloud, listing definitions without motivation, or copying book prose verbatim.

# Directory contract

Create only the directories required by the first working prototype:

```text
lessons/
└── 001-smallest-query-engine/
    ├── lesson.yaml
    ├── narration.md
    ├── expected-output.txt
    └── visuals/

video/
├── components/
│   ├── employee-table.mjs
│   ├── plan-node.mjs
│   └── code-panel.mjs
├── scenes/
│   ├── employee-filter.mjs
│   ├── plan-structure.mjs
│   └── materialized-execution.mjs
├── scripts/
│   ├── generate-audio.mjs
│   ├── generate-captions.mjs
│   ├── render-scenes.mjs
│   ├── compose-video.mjs
│   └── verify-video.mjs
├── templates/
└── pronunciation.json

build/
└── video/
    └── 001/
        ├── audio/
        ├── captions/
        ├── frames/
        └── preview.mp4

dist/
└── videos/
    └── 001-smallest-query-engine.mp4
```

The exact shared script set may shrink or change while building the prototype.
Do not create empty scripts merely to match this drawing.

# Animation strategy

Episode 001 will first use browser-native visuals rather than Manim. HTML and
CSS are sufficient for layout, typography, tables, and code panels. SVG is the
preferred format for plan edges, arrows, paths, and other graphics that must
remain sharp at video resolution. Canvas may be introduced only when a scene
cannot be expressed clearly with HTML and SVG.

Animation behavior belongs in JavaScript committed under `video/scenes/`.
Reusable visual objects belong under `video/components/`. A scene program
creates its objects, places them, and computes their state at a requested point
in time. YAML selects the scene and provides data; it does not contain drawing
commands, keyframes, easing functions, or layout logic.

A headless browser will load the scene and capture deterministic frames. The
renderer should request an exact timestamp for every frame instead of relying
on wall-clock playback. This makes the same inputs produce the same frame
sequence and lets measured narration durations control the timeline.

Conceptually, a scene module will expose behavior like this:

```js
export function renderEmployeeFilter({ time, duration, data }) {
  // Compute the table state for this exact point on the timeline.
}
```

This is the browser equivalent of Manim's programmatic scene model. We do not
need Manim or Python for the first prototype. Reconsider them only if a real
scene exposes a requirement that browser-native rendering cannot meet cleanly.

# Source and artifact ownership

Commit these durable sources:

- `lesson.yaml`
- `narration.md`
- visual source files
- shared rendering scripts and templates
- pronunciation rules
- small deterministic fixtures and expected metadata

Do not commit these generated or downloaded files:

- narration audio
- captions produced from timing data
- rendered frames
- preview and final video files
- FFmpeg temporary files
- Kokoro model files and caches

Intermediate artifacts belong under `build/video/<lesson-id>/`. Finished files
belong under `dist/videos/`. Both locations must be ignored by Git. Large
Kokoro model files should use a documented cache outside the repository so
they are not copied by Git or OneDrive. The proof of concept must determine and
document the supported cache configuration before the model is pinned.

# Lesson-specific sources

`lesson.yaml` should begin with only the fields required by episode 001:

```yaml
id: "001"
title: The Smallest Query Engine
chapter: book/001-smallest-query-engine.md
demo: cargo run --quiet
expected_output: lessons/001-smallest-query-engine/expected-output.txt
scenes: []
```

Add fields only when the working pipeline needs them. A scene should reference
narration and visual sources rather than embedding large generated payloads.

`narration.md` is a spoken script, not a copy of the chapter. It should use the
approved concepts and terminology while removing material that works only on a
page. Pronunciation exceptions shared by multiple lessons belong in
`video/pronunciation.json`.

# Execution plan

## 1. Define the episode

Create the minimum lesson metadata, expected demo output, scene sequence, and
narration draft. For episode 001, the initial scene sequence is:

```text
Question and expected result
          ↓
Core visual idea
          ↓
Rows and values
          ↓
Query-plan structure
          ↓
Execute Scan, Filter, Project
          ↓
Run the complete query
          ↓
Expose materialization
          ↓
Lead into relational algebra
```

## 2. Prove narration generation

Use `kokoro-js` to generate one short clip before processing the full script.
Choose and record the model revision, voice, speed, sample rate, and audio
format. Review technical pronunciation and update the shared pronunciation
rules before generating all scene clips.

Generated clips go to:

```text
build/video/001/audio/
```

## 3. Prototype one complete scene

Choose a representative scene containing narration, captions, code, and a plan
visual. Implement the animation in JavaScript using HTML, CSS, and SVG, then
render it through a headless browser at the intended resolution and frame rate.

The first prototype must prove that the renderer can seek to an exact time,
capture deterministic frames, load local fonts and assets, and use measured
audio duration. Select the smallest browser automation or rendering dependency
that passes this test. Do not add a general video framework before it becomes
necessary.

## 4. Render the episode

Generate scene audio, timing data, captions, visuals, and frames. Compose them
with FFmpeg into a preview at:

```text
build/video/001/preview.mp4
```

Review the preview before producing the final file:

```text
dist/videos/001-smallest-query-engine.mp4
```

## 5. Verify the result

Use FFprobe to verify the final container, codecs, resolution, frame rate,
duration, and audio stream. Review narration, pronunciation, captions, code,
diagrams, transitions, and synchronization. Re-run the lesson demo and confirm
that the video shows the same stable output.

# Intended command interface

The shared pipeline should eventually expose these non-interactive commands:

```bash
npm run video:audio -- 001
npm run video:preview -- 001
npm run video:render -- 001
npm run video:verify -- 001
```

These commands are a target interface, not proof that scripts already exist.
Add each package script only when its underlying operation works and can be
verified.
