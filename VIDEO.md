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

# Required software

The supported pipeline uses Node.js 22.14 or newer, the exact npm packages in
`package-lock.json`, the Chromium revision installed by Playwright 1.63.0,
FFmpeg and FFprobe, and the Rust toolchain used by the lesson demo. Install the
JavaScript dependencies and browser with:

```bash
npm ci
npx playwright install chromium
```

FFmpeg and FFprobe must be available on `PATH`. The first audio build downloads
the pinned Kokoro model into the external cache documented below.

On Windows, the Rust MSVC toolchain also requires the **Desktop development
with C++** workload and a current Windows SDK from Visual Studio Installer.
Run clean release checks from a Visual Studio Developer PowerShell or another
terminal initialized with `VsDevCmd.bat`; otherwise Rust may find `link.exe`
without finding SDK libraries such as `kernel32.lib`.

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

Lesson-specific sources and generated artifacts currently follow this layout:

```text
lessons/
└── 001-smallest-query-engine/
    ├── expected-output.txt
    ├── lesson.yaml
    ├── narration-beats.json
    ├── narration.md
    └── scenes.md

video/
├── components/       reusable and lesson-specific visual objects
├── music/            deterministic music source modules
├── scenes/           programmatic scene and thumbnail modules
├── scripts/          generation, rendering, composition, and verification
├── styles/           shared player layout and visual styles
├── player.html
├── player.mjs
└── pronunciation.json

build/
└── video/
    └── 001/           generated audio, timing, captions, frames, and previews

dist/
├── thumbnails/
│   └── 001-smallest-query-engine.png
└── videos/
    └── 001-smallest-query-engine.mp4
```

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

Lesson-specific scene filenames begin with the same three-digit lesson ID used
by their lesson directory and manifest, such as `001-plan-structure.mjs`. Leave
a scene unprefixed only after it has been made genuinely reusable and contains
no lesson title, narration-specific timing, example data, or next-lesson copy.
Apply the same rule to components: components containing lesson data use the
lesson prefix, while generic layout helpers remain unprefixed.

A headless browser will load the scene and capture deterministic frames. The
renderer should request an exact timestamp for every frame instead of relying
on wall-clock playback. This makes the same inputs produce the same frame
sequence and lets measured narration durations control the timeline.

The lesson 001 prototype uses Playwright 1.63.0 with its pinned Chromium build.
Playwright is a development dependency because it renders source assets but is
not part of the published database program. Install the matching browser once:

```bash
npx playwright install chromium
```

Playwright stores the browser outside the repository in its operating-system
cache. The browser binary, generated frames, and preview clips are not committed.

Conceptually, a scene module will expose behavior like this:

```js
export function renderEmployeeFilter({ time, duration, data }) {
  // Compute the table state for this exact point on the timeline.
}
```

This is the browser equivalent of Manim's programmatic scene model. We do not
need Manim or Python for the first prototype. Reconsider them only if a real
scene exposes a requirement that browser-native rendering cannot meet cleanly.

# Frame layout contract

Every scene uses the same three vertical regions at 1920 by 1080:

```text
title region
content stage
single-line caption region
```

The main composition must be optically centered inside the content stage, not
centered across the full frame. Titles and captions do not count as content
when calculating that position. Shared layout helpers define the regions,
standard gaps, and common one-, two-, and three-column arrangements. Scene
modules should use those helpers instead of independently choosing unrelated
screen coordinates.

Visible objects must remain within their assigned region. Overlap is allowed
only when it communicates a deliberate transformation. Review tooling should
flag objects that cross a safe-area boundary or collide unexpectedly. A scene
must remove or hide an earlier state before a later state occupies the same
space.

# Timeline contract

Generated narration timing is the authority for visual transitions. Scene
modules address narration beats by their stable IDs and derive local beat
starts and ends from `timing.json`. Do not duplicate measured beat boundaries
as unexplained numeric constants in scene code.

Motion within a beat may still use local offsets, but the visual that belongs
to the next beat must not begin before that beat starts. This keeps section
changes, questions, diagrams, and narration synchronized when audio is
regenerated.

# Captions

Captions must occupy one line at a time. Split long sentences into consecutive
phrase-level cues at punctuation or natural speech boundaries. Cue generation
must consider rendered width as well as character count, keep each phrase on
screen for a readable interval, and preserve the measured duration of its
narration beat.

Caption validation must reject a cue that wraps, exceeds the caption-safe
width, overlaps another cue, or extends beyond its narration beat. Captions
remain a separate generated artifact until final composition.

# Episode identity

Published episodes begin with a short original ident. It should establish the
project's own visual identity rather than imitate another channel's artwork.
The ident may contain a reusable logo animation, the project name, and the
lesson title, and should transition into the lesson's opening visual in roughly
four to six seconds.

The ident is an ordinary programmatic scene. Its module and any durable logo
assets must be indexed by `lesson.yaml`, rendered deterministically, and
included in the same review process as instructional scenes.

# Sound design

Use music only for the opening ident and closing lesson card. Instructional
scenes remain narration-only so music does not compete with technical
explanations. The opening and closing may share a short musical theme, with
gentle fades at both boundaries and no abrupt cut into narration.

The ident begins with a visual idea, assembles the series mark, and reveals the
lesson title in that order. The outro transforms the lesson's final idea into
the next-lesson card. These transitions use an original visual and musical
identity rather than copying another publication's branding.

Prefer an original, reproducible sonic logo before subscribing to an external
music generator. If an externally generated track is adopted, preserve its
original download, creation record, prompt, service terms, and proof of the
commercial-use entitlement. Record its licensing separately from the MIT code
license in `ASSETS.md`; do not imply that the music is distributed under MIT.

Music must have a durable source, either a committed asset or a deterministic
generator. Generated WAV files remain build artifacts. Index the source,
generated paths, levels, and fades in `lesson.yaml` so final audio can be
reproduced. Mix ident and outro music during composition; changing music must
not require visual frames to be rendered again.

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

`narration-beats.json` assigns a stable ID and planned trailing pause to every
narration paragraph. Audio generation measures each beat with FFprobe and
writes `build/video/<lesson-id>/timing.json`. Scene animation and captions use
that generated timing rather than estimating speech duration.

The Kokoro repository revision is a required `audio.revision` field in
`lesson.yaml`. It must contain a full Hugging Face commit hash. Audio generation
resolves model files through that immutable revision instead of the repository's
moving `main` branch.

`scenes.md` is the human-reviewable storyboard. Organize it by narration beat
and describe the purpose, visible state, transitions, and review questions for
each section. Review this plan before implementing the corresponding animation.
The storyboard records visual intent; JavaScript remains the executable source
of truth for the rendered scene.

Lesson-specific editorial timestamps belong under `review.checkpoints` in
`lesson.yaml`. Review scripts consume this list and must not contain conditional
logic or timestamp constants for a particular lesson.

`lesson.yaml` is the episode index. It lists scenes in playback order and gives
each implemented scene its JavaScript module. A scene without a `module` entry
is planned but not implemented. The renderer reads this manifest and refuses
to render an unlisted scene or a scene whose module is missing.

Scene modules import their reusable components and other source assets through
normal JavaScript imports. Shared styles are loaded by the browser player, and
tool versions are pinned by `package-lock.json`. Do not repeat these transitive
dependencies in every lesson manifest.

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

First write the section in the lesson's `scenes.md` and review its visual
sequence against the generated narration timing. Prototype one section before
planning the rest of the episode so discoveries about pacing and visual
language can inform the remaining storyboard.

The first prototype must prove that the renderer can seek to an exact time,
capture deterministic frames, load local fonts and assets, and use measured
audio duration. Select the smallest browser automation or rendering dependency
that passes this test. Do not add a general video framework before it becomes
necessary.

## 4. Render the episode

Before rendering every frame, capture review frames at the start and end of
every narration beat and at any timestamps recorded during editorial review.
Create a contact sheet for each scene and inspect centering, safe areas,
collisions, stale visual states, arrow meaning, and narration alignment. Then
render short scene previews for pacing review.

Generate the full scene frames only after those checks pass. Compose scene
audio, captions, and visuals with FFmpeg into a preview at:

```text
build/video/001/preview.mp4
```

Review the preview before producing the final file:

```text
dist/videos/001-smallest-query-engine.mp4
```

## 5. Reuse and parallelize work

Store a fingerprint beside each generated frame set. The fingerprint covers
the scene module and imported visual sources, shared styles and components,
measured timing, render dimensions, and frame rate. Reuse a frame set only when
its fingerprint and expected frame count both match. A changed scene must not
force unchanged scenes to render again.

After a frame set is encoded, store the same fingerprint beside its scene clip
and remove the PNG sequence by default. This bounds disk usage during a full
episode render. Set `VIDEO_KEEP_FRAMES=1` only while debugging frames.

For a full scene render, divide the timeline into non-overlapping frame ranges
and allow several headless-browser workers to capture those ranges. Assemble
the numbered frames only after every range succeeds. Normal preview rendering
captures each frame once; deterministic double-capture checks run on review
timestamps instead of doubling the cost of the full render.

Scene encoding may run concurrently after the corresponding frame sets are
ready. Hardware encoding such as NVENC may be used for disposable review
previews when available. The browser frame capture is expected to remain the
main cost, so additional GPU encoders do not replace parallel browser workers.
Use the final delivery encoder only after comparing its output quality.

## 6. Verify the result

Use FFprobe to verify the final container, codecs, resolution, frame rate,
duration, and audio stream. Review narration, pronunciation, captions, code,
diagrams, transitions, and synchronization. Re-run the lesson demo and confirm
that the video shows the same stable output.

# Command interface

The complete episode can be rebuilt from committed sources with:

```bash
npm run video:render -- 001 --clean
```

`--clean` removes only that lesson's generated build directory and declared
final output. The command regenerates narration and timing, joins the audio,
creates captions, renders every scene, embeds a selectable caption track in the
final MP4, runs FFprobe checks, and verifies the Rust demo output.

Individual stages remain available for development:

```bash
npm run video:audio -- 001
npm run video:audio-review -- 001
npm run video:music -- 001
npm run video:captions -- 001
npm run video:validate-sources -- 001
npm run video:review -- 001
npm run video:frames -- 001 core-idea
npm run video:frames -- 001 core-idea --fps 12
npm run video:frames -- 001 core-idea --fps 12 --from 36 --to 42
npm run video:scene-preview -- 001 core-idea 12
npm run video:preview -- 001 12
npm run video:compose -- 001
npm run video:verify -- 001
```

Without `--fps`, `video:frames` captures a small set of review timestamps and
checks that two captures at each timestamp are identical. `video:review`
derives its timestamps from narration beats, adds editorial checkpoints from
the lesson manifest, and produces scene contact sheets. With `--fps`,
`video:frames` renders every frame needed by `video:scene-preview`. Twelve
frames per second is suitable for a quick animation review; use the final
delivery rate only after the scene's pacing has been approved. Once a complete
frame set exists, `--from` and `--to` may regenerate only a changed time range
while preserving the other frames.

`video:preview` validates every source reference, reuses only fingerprinted
frames or encoded clips, composes each scene with its measured audio segment,
and concatenates scene clips in the order declared by `lesson.yaml`.

`video:review` renders the start and end of every narration beat together with
lesson-specific editorial checkpoints. It writes one contact sheet per scene
under `build/video/<lesson-id>/review/`. Inspect these sheets before rendering
a complete frame sequence.

Review rendering uses two concurrent scene workers by default. Delivery rates
of 24 FPS or higher default to one worker so concurrent PNG sequences do not
exhaust disk space. Override that value only when the machine has enough CPU,
memory, and temporary storage:

```bash
VIDEO_RENDER_WORKERS=3 npm run video:render -- 001 --clean
```

In PowerShell, set `$env:VIDEO_RENDER_WORKERS = "3"` before running the npm
command. Three workers produced the verified Lesson 001 release on the current
development machine; lower the value if memory or disk pressure becomes high.

The final file path, dimensions, frame rate, and caption language are declared
under `video` in `lesson.yaml`. Generated previews remain under `build/`; only
the verified delivery file is written under `dist/videos/`.

# Thumbnail

Each published episode has a dedicated thumbnail source rather than using an
arbitrary video frame. Its module, output path, and delivery dimensions live
under `thumbnail` in `lesson.yaml`. Keep the lesson number, main idea, and one
clear database visual readable at small sizes. Avoid sentences, fine details,
and duplicated YouTube interface text.

Generate the declared thumbnail with:

```bash
npm run video:thumbnail -- 001
```

The renderer captures the source twice and rejects nondeterministic output.
The generated PNG is a delivery artifact under `dist/thumbnails/`; its scene
module and manifest entry are the durable inputs.

# Publishing metadata

Keep stable destination identifiers, such as the YouTube playlist ID, under
`publishing` in the lesson manifest. Store the ID rather than a YouTube Studio
management URL so automated publishing can construct viewer-facing and API
requests without depending on a private browser route. Credentials and OAuth
tokens must remain outside the repository.
