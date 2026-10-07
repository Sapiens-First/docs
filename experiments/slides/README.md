# DNA slide experiment

This experiment turns the DNA speech into ten audience slides and preserves its original passages as speaker notes. The editable deck lives in `decks/10-6-dna.deck.json`. The presentation deliverable is one self-contained HTML file; authoring files are needed only to rebuild it.

## Build and present

Run these commands from the repository root with its existing Node installation:

```sh
node experiments/slides/slides.mjs validate experiments/slides/decks/10-6-dna.deck.json --strict
node experiments/slides/slides.mjs build experiments/slides/decks/10-6-dna.deck.json experiments/slides/output/10-6-dna.html --strict
node --test experiments/slides/tests/slides.test.mjs
```

Double-click `output/10-6-dna.html` to open it in a browser. Share that HTML file alone. Fonts, logo, diagrams, source notes, original speech, CSS, and navigation code are embedded; presenting needs no installation, internet, or server. Generated output and browser evidence are ignored by Git and can be rebuilt.

Use Left/Right, Page Up/Page Down, Space/Shift-Space, or the Previous/Next buttons. Home and End jump to the boundaries, which do not loop. Press N or click Notes to show the current slide's original passages and separately labelled editorial cues. Notes scroll and update as you navigate. They appear in the same window and are included in the file shared with the audience. Browser modifiers and editable fields retain their own shortcuts.

`validate --json` prints a machine-readable coverage, notes, and rules report. Structural errors and missing source coverage always fail. Presentation findings fail validation or build when `--strict` is present, unless the slide declares a specific justified exception. The tool does not truncate content or shrink its type to make a deck pass.

## Embedded assets

The renderer uses the existing `docs/public/logo.png` and local fonts in `fonts/`. Barlow Condensed 800 and DM Sans 400/700 were downloaded from Google Fonts on October 6, 2026. Their unmodified SIL Open Font License notices are stored alongside the fonts and embedded in each HTML file. Building does not download assets.

- [Barlow Condensed upstream license](https://github.com/google/fonts/blob/main/ofl/barlowcondensed/OFL.txt)
- [DM Sans upstream license](https://github.com/google/fonts/blob/main/ofl/dmsans/OFL.txt)

The theme follows the handbook and [public site](https://sapiensfirst.org/): paper `#f8f3eb`, ink `#111111`, coral `#ff7870`, yellow `#ffd60a`, sky `#bcd8ff`, condensed uppercase headlines, rectangular panels, ink borders, and hard shadows. The design uses a 1280 × 720 logical canvas. Principal audience text is at least 40 CSS px (30pt) before scaling. The canvas scales to fit the browser around usable controls; smaller viewports display proportionally smaller text. Use a large screen for a live presentation.

## Authoring format

The JSON boundary is `schemaVersion: 1`. A deck contains `id`, `title`, `targetDurationSeconds`, `source`, `sourceGaps`, `sourceClassifications`, `editorialReview`, and `slides`.

`source` contains the repository-relative `path`, the lowercase SHA-256 `sha256` of its UTF-8 bytes, and the complete original `text`. Preserve every character, including whitespace. A changed original requires an editorial refresh of the snapshot, digest, and line mapping together.

Each slide contains a stable unique `id`, `layout`, `purpose` (`explain`, `engage`, or `empower`), `role` (`content` or `buffer`), audience-facing `title`, layout-specific `content`, positive integer `durationSeconds`, and `notes`. An optional `sectionLabel` is audience text too. Optional `tone` selects `paper` (default), `dark`, `coral`, or `yellow` without changing the layout.

| Layout | Content fields |
| --- | --- |
| `statement` | `lines`: zero to two supporting strings |
| `triad` | `labels`: exactly three strings |
| `cycle` | `labels`: exactly three strings in repeating order |
| `question` | Empty object; the title is the question |
| `steps` | `labels`: three or four ordered strings; optional `caption` |
| `roles` | `circle`: one string; `roles`: two or three strings inside that circle; optional `caption` |

Content is plain text. It cannot supply HTML, SVG, executable expressions, or asset URLs. The renderer owns the diagram shapes and relationships.

`notes.sourceRanges` is an ordered array of `{ "start": 19, "end": 24 }` objects. These are inclusive, one-based line numbers in `source.text`, not a rewritten summary. Notes assembly takes each range exactly from the snapshot, retaining its line breaks. `notes.cues` is a separate array of editorial prompts and must be labelled as additions when displayed.

`sourceClassifications` lists `{ start, end, kind, reason }`, where `kind` is `heading` or `agenda`. Use it only for source headings or literal navigation that is not assigned to notes. Every substantive nonblank source line belongs in notes, in source order. Prefer nonoverlapping ranges and document intentional duplication in `editorialReview`. Blank lines require no separate coverage entry; the full snapshot still retains them.

`sourceGaps` records genuinely empty source sections as `{ heading, explanation, start, end }`. The current DNA source has none, so its array is empty. `editorialReview` contains author-visible strings recording source drift, paraphrases, fidelity decisions, and review needs. These are not audience slide content.

Optional slide `ruleExceptions` entries contain `{ rule, reason, text }`; an exception must identify its affected text and specific justification. The current DNA deck needs no content-rule exceptions.

## Editorial conversion and source coverage

The narrative follows the speech: technology and political change, AI concerns, the movement's vision, organizing strategy, roadmap, participation, organizational roles, and an invitation to act. The question after slide 5 gives participants a pause and interrupts the content run. The four roadmap phases remain four steps. Ten slides total 840 planned seconds, or 14 minutes.

The source changed after the plan was written: Culture now has four bullets at lines 68–71. They remain verbatim in slide 8 notes before the Structure passage. There is no empty Culture gap to preserve. No definitions or additional Culture teaching have been invented.

| Slide | Source lines | Preserved passages | Seconds |
| --- | --- | --- | --- |
| 1 `opening` | 3 | Opening technology sentence | 45 |
| 2 `technology` | 5; 17 | Agriculture, industry, and digital-age examples | 75 |
| 3 `crisis` | 19–24 | AI/power introduction and all three risk explanations | 90 |
| 4 `vision` | 28–31 | Complete Life, Liberty, Happiness vision | 90 |
| 5 `momentum` | 35; 39–48 | Cohesive strategy, two organizing approaches, momentum and Act–Recruit–Train | 90 |
| 6 `chapter-question` | 50 | Original 3.5% claim; facilitator prompt remains a separate cue | 60 |
| 7 `roadmap` | 54–64 | Objective, treaty mission, four phases, campaigns/tactics, local freedom and experimentation | 105 |
| 8 `participation` | 68–80 | Four Culture bullets, Structure heading, volunteers, full engagement path | 75 |
| 9 `roles` | 82–92 | Holacracy, autonomy/unity, rules/ownership, roles and circles | 120 |
| 10 `next-step` | 96–101 | Full invitation and Donate, Join, Organize details | 90 |

Unspoken headings at lines 1, 13, 15, 26, 33, 37, 52, 66, and 94 are explicitly classified. Lines 7–11 are classified as the literal four-part navigation agenda. This avoids moving the agenda ahead of the preceding technology paragraph in notes. The Structure heading at line 73 remains within slide 8's continuous range. There are no duplicated ranges or uncovered substantive passages.

Audience headlines and labels are paraphrases. `Human extinction` shortens the source's `Omnicide`; the notes preserve its full explanation and conditional framing. The roadmap caption `Federal legislation: an AI treaty` preserves the source mission within the text budget. Donation amounts, dues, Discord, local tactics, democratic institutions, and other detail remain in notes rather than crowded onto slides. No policies from the handbook or tech-team notes enter the speech content.

The source contains claims that require review before publication: technology effects, AI examples, surveillance and corruption concerns, the 3.5% threshold, roadmap phases, and financial details. Preserving them does not establish their accuracy. This local experiment adds no new statistics, donation links, or QR codes.

## Presentation heuristics

Count a word as a whitespace-delimited token after trimming; hyphenated terms count as one. Titles, optional section labels, captions, and every diagram label each consume one authored string. Allow at most six audience strings per slide, six words in titles/section labels/captions, and five words in points or labels. Notes, labelled cues, controls, and slide numbers are outside these budgets.

The DNA deck has ten slides, 840 planned seconds, a question buffer at slide 6, and at most six audience strings on any slide. Slide 7 uses all six strings and therefore has no section label. The deck assigns each slide an explain, engage, or empower purpose. Authored counts are a first check; actual wrapping, logical 40px principal text, clipping, and visual relationships require browser inspection. Planned timings are not a live rehearsal result.

## Editorial verification

The original UTF-8 snapshot and SHA-256 digest were checked byte for byte. Its digest is `a23a8c3855415511f3a635f3975c9aff0890f017383d0f279303bed5bfd7f85e`. All nonblank source lines are assigned to notes or explicitly classified headings/agenda; substantive ranges are strictly increasing and never duplicated. Audience labels and titles were inspected against the text budgets. Renderer and browser verification are recorded separately after implementation.

## Verification and evidence

Run the browser check against the built HTML, directly over `file://`:

```sh
node experiments/slides/tests/browser.mjs
```

It uses Playwright's installed Chromium by default. To select an existing installation:

```sh
SLIDES_CHROMIUM=/path/to/chrome node experiments/slides/tests/browser.mjs
```

Optional positional arguments select another HTML path and an evidence directory. The harness checks this DNA acceptance deck's ten slides and six layouts. It copies only the HTML to a new temporary directory, disables networking, compares its opener pixels to the original, loads all embedded assets, exercises navigation/notes/focus, and measures text after fonts load. It writes `output/browser-evidence/report.json` and screenshots, then removes its temporary copied file.

Checks performed on October 6, 2026:

| Check | Observed result |
| --- | --- |
| Strict DNA validation | Ten slides, 840 planned seconds, zero uncovered lines, no rule exceptions |
| Complete Node suite | 34 passing tests, including 12 slide validation/generation tests |
| Chromium verification | 280 passing checks at 1280 × 720, 1920 × 1080, and 390 × 844 |
| Offline portability | Copied HTML alone opens; identical opener pixels; three font faces and all logos load; zero external requests or browser errors |
| Actual text geometry | Two to six rendered audience lines per slide; every principal font ≥40 logical px; text/diagram bounds and text overlaps pass |
| Navigation and notes | All defined keys, boundaries, editable controls, focus, notes toggles, exact source passages, and scrolling pass |
| Source drift | All four current Culture bullets remain in source notes; the speech and plan files were untouched |
| Visual review | All ten 1280 × 720 screenshots reviewed; large-screen diagrams and narrow-screen notes also inspected |
| Reuse | Temporary second JSON deck with different source/copy and `statement`/`steps` layouts builds strictly through the unchanged renderer |
| Handbook regression | `npm run docs:check` and `npm run docs:build` pass |
| Live speaker rehearsal | Pending; no observed speaking duration is claimed |

The verified browser executable was `/home/rohan/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`. The JSON report records the HTML digest, actual executable, asset status, every check, viewport geometry, and screenshot names. At 1280 × 720 the controls leave a 0.9333 canvas scale, so 40 logical px displays at about 37.3 effective px. At 1920 × 1080 the scale is 1.4333; at 390 × 844 it is 0.3047. The report distinguishes those effective sizes from the logical 30pt target.

Visual comparison used the existing handbook theme and the public site's paper/ink palette, condensed headlines, coral/yellow/sky panels, marker underline, and hard shadows. Crisis uses a dark surface, the audience question uses yellow, and the closing uses coral. Triads stack three labels to avoid extra wrapped lines; the roadmap keeps four full-width numbered stages. Every diagram label remains text, with an accessible description of its relationships.

The first generation-test run failed because the CLI had no build operation; all four added generation scenarios then passed. Browser verification initially exposed a test's incorrect assumption about resetting Tab order after blur; the harness now tests focus using actual keyboard movement. Additional containment checks found SVG text extending slightly above its boxes; enlarging the boxes resolved the defect without changing text size. No renderer acceptance check was weakened. Three simplification reviews found one useful filesystem-check reduction; repeated source splitting was left alone because changing the tiny notes API added no practical value. No lint or typecheck command is configured in this repository.

Before presenting, rehearse the original notes, facilitator cues, transitions, and question pause, then record an observed duration. The intended 840 seconds is not proof of a delivery under twenty minutes.

## Make another deck

Create JSON using the versioned format above, with its own complete source snapshot, digest, notes ranges, audience copy, layouts, and timings. Validate and build it using the same commands with your paths substituted. The source path is checked against its digest when available; viewing the generated HTML never uses it. Missing source paragraphs remain errors even when the snapshot is complete.

For a deliberate source update, replace `source.text` and `source.sha256` together, then remap and review every source range and classification before validating. Do not refresh only the hash: valid old line numbers can still refer to different passages. Fonts and brand assets remain build inputs shared by decks; no renderer edit is required for different content.
