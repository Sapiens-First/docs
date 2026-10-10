# DNA slide experiment

This experiment turns the DNA speech into twenty-four audience slides and preserves its original passages in a separate presenter notes page. An agenda, four topical section dividers, a click-to-reveal extinction focus on the crisis slide, three strategy-tree views, separate Birmingham and Vietnam trigger photographs, the original Movement Action Plan figure, a 3.5% impact slide, Culture, and holacracy vary the pacing. The footer shows the current section and progress within it. The editable deck lives in `decks/10-6-dna.deck.json`. Building produces two self-contained HTML files; authoring files are needed only to rebuild them.

## Build and present

Run these commands from the repository root with its existing Node installation:

```sh
node slides/slides.mjs validate slides/decks/10-6-dna.deck.json --strict
node slides/slides.mjs build slides/decks/10-6-dna.deck.json slides/output/10-6-dna.html --strict
node --test slides/tests/*.test.mjs
```

Double-click `output/10-6-dna.html` to open the audience slides. The same build creates `output/10-6-dna.notes.html`. Keep both files in the same folder when presenting, so the Presenter notes link works. Fonts, photographs, artwork, diagrams, styles, and navigation are embedded; neither page needs installation, internet, or a server. Generated output and browser evidence are ignored by Git and can be rebuilt.

Use Left/Right, Page Up/Page Down, Space/Shift-Space, or the Previous/Next buttons. Home and End jump to the boundaries, which do not loop. Press N or click **Presenter notes** to open the notes in a separate window, then move it to your second screen. Navigation in either window keeps the selected slide in sync. Clicking the link again focuses the existing notes window; closing and reopening reconnects it to the current slide. Browser modifiers and editable fields retain their own shortcuts.

Click **Present** or press P to hide the toolbar and use the full browser viewport for slides. Keyboard navigation and notes syncing still work. Press Escape or P to restore the toolbar; the selected slide is retained. Browser fullscreen remains available through the browser's own controls.

The notes window has large reading text, Previous/Next buttons, and a slide selector. Left/Right changes its slide; Space and Page Down retain normal scrolling. It preserves exact source passages, separately labelled editorial cues, and image credits. Opening the notes file directly also works, with independent navigation. Automatic syncing requires opening it from the slides' link. If the browser blocks the new window, allow it or open the linked file manually.

The audience HTML can still be shared alone and opened offline. Source text, speaker passages, editorial cues, and the complete authoring deck are stored only in the separate notes file. Sharing the notes requires sharing that second file explicitly.

`validate --json` prints a machine-readable coverage, notes, and rules report. Structural errors and missing source coverage always fail. Presentation findings fail validation or build when `--strict` is present, unless the slide declares a specific justified exception. The tool does not truncate content or shrink its type to make a deck pass.

## Embedded assets

The renderer uses the existing `docs/public/logo.png` and local fonts in `fonts/`. Barlow Condensed 800 and DM Sans 400/700 were downloaded from Google Fonts on October 6, 2026. Their unmodified SIL Open Font License notices are stored alongside the fonts and embedded in each HTML file. Building does not download assets.

- [Barlow Condensed upstream license](https://github.com/google/fonts/blob/main/ofl/barlowcondensed/OFL.txt)
- [DM Sans upstream license](https://github.com/google/fonts/blob/main/ofl/dmsans/OFL.txt)

The deck includes the website hero photo, a verified public-domain March on Washington photograph, and two user-supplied AP photographs. The AP images and website hero have unverified reuse rights; see the asset provenance and presenter credits before redistribution. Earlier Unsplash playground and city photographs remain as local assets. An original crossroads SVG illustrates two possible futures. The deck also uses the public Sapiens First site's contour and arc artwork and trusted inline SVG section motifs. [Image sources](assets/README.md) and `assets/sources.json` record provenance, usage, and file digests. Photo and artwork credits appear separately in speaker notes. The photographs are illustrative, and are not attributed to Sapiens First events. All image files are local build inputs.

The theme follows the handbook and [public site](https://sapiensfirst.org/): warm paper `#fbf1df`, ink `#241d18`, coral `#ed836b`, amber `#efb94c`, sage `#b9c596`, condensed uppercase headlines, ink borders, and restrained shadows. The design uses a 1280 × 720 logical canvas. Principal audience text is at least 40 logical px (30pt), including SVG transforms. The opening date is secondary text at 36px; footer progress labels, stage numbers, and the current-work tag are presentation chrome. The canvas scales to fit the browser, using its full viewport in presentation mode; smaller viewports display proportionally smaller text. Use a large screen for a live presentation.

## Authoring format

The JSON boundary is `schemaVersion: 1`. A deck contains `id`, `title`, `targetDurationSeconds`, `source`, `sourceGaps`, `sourceClassifications`, `editorialReview`, and `slides`.

`source` contains the repository-relative `path`, the lowercase SHA-256 `sha256` of its UTF-8 bytes, and the complete original `text`. Preserve every character, including whitespace. A changed original requires an editorial refresh of the snapshot, digest, and line mapping together.

Each slide contains a stable unique `id`, `layout`, `purpose` (`explain`, `engage`, or `empower`), `role` (`content` or `buffer`), audience-facing `title`, layout-specific `content`, positive integer `durationSeconds`, and `notes`. An optional `sectionLabel` is audience text too. Optional `section` selects `story`, `strategy`, `culture`, or `structure`. The progress strip derives section order from first appearance, counts all slides in the section, and fills proportionally to the current slide. Slides without `section` omit the strip. Optional `tone` selects `paper` (default), `coral`, `yellow`, `sunrise`, `sage`, or `dark` (valid but unused by the DNA deck) without changing the layout.

Optional `image` contains `path`, `alt`, `credit`, `sourceUrl`, `licenseUrl`, and optional `position` (`center`, `top`, or `bottom`). Paths must identify local JPEG, PNG, WebP, or SVG files under `slides/assets/`; external paths, traversal, escaping symlinks, missing files, and invalid signatures fail validation. Attribution URLs must use HTTPS. Statement images may use `treatment: "background"` for full-slide photography with a dark contrast overlay, or `"artistic"` for a sepia parchment treatment behind text. `photo` and `figure` slides require exactly one `image` (`content` allows only `caption`). A `montage` supplies `images` with exactly two image metadata objects instead of `image`; each keeps its own alt text and credits. Optional `referenceImage` uses the same metadata but embeds the image only in presenter notes. Optional `graphic` selects trusted `contours` or `arcs` brand artwork, or divider-only inline motifs: `book`, `route`, `hands`, `nested`, and `signpost`. Image alt text and attribution are separate from audience copy.

| Layout | Content fields |
| --- | --- |
| `statement` | `lines`: zero to two supporting strings |
| `triad` | `labels`: exactly three strings; optional `direction: "horizontal"`; optional integer `highlight` (0–2) accents one label while retaining readable context; `highlightStep: true` (requires `highlight`) holds the highlight back until the next Next press, giving the slide `data-steps="1"` |
| `cycle` | `labels`: exactly three strings in repeating order |
| `question` | Empty object; the title is the question |
| `steps` | `labels`: three or four strings; optional `caption` and `mode` (`horizons` or `progression`); horizons requires four labels |
| `roles` | `circle`: one string; `roles`: two or three strings inside that circle; optional `caption` |
| `divider` | Empty object; the title names a section |
| `impact` | Optional `caption`; the title is the oversized focal statement |
| `values` | `labels`: exactly four strings, arranged in a two-by-two grid; optional `descriptions`: four short practical cues |
| `pair` | `labels`: exactly two strings, shown as a pair of principles; optional `caption` |
| `circles` | `circle`: one enclosing circle name; `labels`: exactly four sub-circle names; optional `caption` |
| `choice` | Optional `labels`: exactly two short road labels when present; may be empty |
| `pyramid` | `labels`: exactly five strings, from apex to base; optional `caption` |
| `photo` | Optional `caption`; exactly one slide `image` |
| `figure` | Optional `caption`; exactly one slide `image` |
| `montage` | Empty object; two photographs in slide `images` |
| `agenda` | `labels`: three to six section names, rendered as a numbered list |
| `tree` | `tree`: root node; `reveal`: visible node ids; optional `focus`: revealed subtree id |
| `movement` | `stages`: exactly eight strings in model order; `highlight`: stage index (0–7); optional `caption` |
| `actions` | `labels`: three action names; `links`: three host/path strings; optional `descriptions`: three short explanations; optional `caption` |

`tree` nodes contain unique nonempty `id` and `label`, optional `children` arrays, and optional boolean `current`. At most one node may be current. `reveal` must be nonempty, unique, and include every visible node’s ancestors; `focus` must be revealed. Focus accents its visible descendants and preserves other branches as readable context. Each reveal fills the canvas, with successive tree depths in horizontal rows. Revealed labels count toward audience budgets, and the current node receives a “You are here” tag.

Content is plain text. It cannot supply HTML, SVG, executable expressions, or remote image resources. The renderer owns the diagram shapes and relationships. Image metadata supplies local asset paths and separately rendered credit links.

`notes.sourceRanges` is an ordered array of `{ "start": 19, "end": 24 }` objects. These are inclusive, one-based line numbers in `source.text`, not a rewritten summary. Notes assembly takes each range exactly from the snapshot, retaining its line breaks. `notes.cues` is a separate array of editorial prompts and must be labelled as additions when displayed.

`sourceClassifications` lists `{ start, end, kind, reason }`, where `kind` is `heading` or `agenda`. Use it only for source headings or literal navigation that is not assigned to notes. Every substantive nonblank source line belongs in notes. Optional deck `sourceOrder` defaults to `"original"`, which requires source order. `"presentation"` allows an explicit editorial reorder while still requiring complete coverage. The October 9 deck uses presentation order because the requested promise/dangers order and Strategy sequence rearrange passages. Prefer nonoverlapping ranges and document intentional duplication in `editorialReview`. Blank lines require no separate coverage entry; the full snapshot still retains them.

`sourceGaps` records genuinely empty source sections as `{ heading, explanation, start, end }`. The current DNA source has none, so its array is empty. `editorialReview` contains author-visible strings recording source drift, paraphrases, fidelity decisions, and review needs. These are not audience slide content.

Optional slide `ruleExceptions` entries contain `{ rule, reason, text }`; an exception must identify its affected text and specific justification. Optional deck `ruleExceptions` uses the same shape for deck-wide findings. The current DNA deck declares a `10-20-30` slide-count exception for the requested twenty-four slides. California and the Bay Area tree views declare `1-6-6` and `5-5-5` exceptions for their connected strategy labels. These exceptions remain visible and do not excuse duration mismatches, unreadable text, or clipping.

## Editorial conversion and source coverage

Revision 2 implements the [October 9 plan](../../maintenance/plans/2026-10-09-dna-deck-revision-2-plan.md). It opens with “Revolt for our future,” the plain subtitle “Sapiens First: Our DNA” (restyled October 10), and `10/09/26`. A deck-wide agenda introduces Story, Strategy, Culture, and Structure. Pathways to Action is the title of the closing slide inside Structure, not a section. Story uses a crossroads illustration, centers the promise of AI before its dangers, then lights human extinction as the initial focus on the crisis slide, one click after the three dangers appear (`highlightStep`, exposed as `data-steps="1"`). The Declaration bridge slide is removed; its editorial cue remains in the crisis notes.

Strategy begins with “Political change for humanity.” Three progressively revealed views share the same tree: AI treaty; California / New York–Florida–Texas / national movement with Bay Area, Sacramento, and Los Angeles; and the Bay Area’s leaves (Berkeley chapter, Policy creation, Protests, Statewide strategy). The Berkeley chapter is marked as current work. Sacramento, Los Angeles, and the national movement remain leaf nodes because no children were specified. The original roadmap stays verbatim in `tree-goal` notes.

“A cycle of engagement” precedes two trigger-moment photograph slides (Birmingham and Vietnam, `photo` layout), the original Movement Action Plan figure (`figure` layout), then the 3.5% benchmark and “Pause for questions.” The participation threshold is a buffer between the longer organizing sequence and the question. Planned timing is 1195 seconds (19 minutes 55 seconds); this is not an observed rehearsal duration.

The generic `pyramid` and `steps`/`horizons` layouts remain available for other decks. The National Archives March on Washington photograph appears only on the participation-threshold slide and supplies historical context, not evidence for the 3.5% claim.

The source changed after the original plan was written: Culture has four bullets at lines 68–71. All four appear verbatim on their own audience slide and in that slide's notes. The slide is titled Core values and contains only these four values in its boxes. The Culture divider introduces them before Structure.

The [public Atlas](https://sapiensfirst.org/atlas) is an additional visual reference explicitly requested by the user. Its [circle renderer](https://sapiensfirst.org/atlas-circles.js) and [governance data](https://sapiensfirst.org/data/atlas/governance.csv) were inspected on October 6, 2026, along with the rendered page. `references/atlas-circles.json` records the five selected records and their parent relationships. Media, Advocacy, Community, and Tech appear inside Sapiens First Global; this excerpt is not a complete roster. Small dashed circles symbolize roles, and their number and sizes are schematic. The speech's Media Circle examples remain on a separate close-up; they are not substituted with a current staffing list.

| Slide | Source lines | Seconds |
| --- | --- | --- |
| 1 `opening` | 3 | 45 |
| 2 `agenda` | — | 20 |
| 3 `story-section` | — | 10 |
| 4 `technology` | 5; 17 | 75 |
| 5 `vision` | 28–31 | 90 |
| 6 `crisis` | 19–24 | 120 |
| 7 `strategy-section` | 35 | 10 |
| 8 `tree-goal` | 54–64 | 40 |
| 9 `tree-california` | — | 30 |
| 10 `tree-bay` | — | 35 |
| 11 `momentum` | 45–48 | 90 |
| 12 `trigger-birmingham` | 39–43 | 55 |
| 13 `trigger-vietnam` | — | 30 |
| 14 `movement-action-plan` | — | 50 |
| 15 `participation-threshold` | 50 | 30 |
| 16 `chapter-question` | — | 60 |
| 17 `culture-section` | — | 10 |
| 18 `culture-values` | 68–71 | 90 |
| 19 `structure-section` | — | 10 |
| 20 `participation` | 75–80 | 75 |
| 21 `ownership-principles` | 88–90 | 30 |
| 22 `circles` | 82–86 | 45 |
| 23 `roles` | 92 | 55 |
| 24 `next-step` | 96–101 | 90 |

Headings at lines 1, 13, 15, 26, 33, 37, 52, 66, 73, and 94 are explicitly classified and represented by their section or associated content slide. Lines 7–11 remain classified as the literal four-part navigation agenda. There are no duplicated ranges or uncovered substantive passages.

Audience headlines and labels are paraphrases. `Human extinction` shortens the source's `Omnicide`; the notes preserve its full explanation and conditional framing. The tree root `AI treaty` names the requested goal; original federal-legislation wording stays in notes. Donation amounts, dues, Discord, local tactics, democratic institutions, and other detail remain in notes rather than crowded onto slides. No policies from the handbook or tech-team notes enter the speech content.

The closing Pathways to Action slide pairs Join, Donate, and Share with the membership, donation, and homepage URLs. The Holacracy, role example, and Atlas captions and closing explanations were removed at the user’s request. Closing card content is centered vertically and horizontally. The October 10 design changes preserve the slide count, sequence, source snapshot, notes ranges, and every duration.

The source contains claims that require review before publication: technology effects, AI examples, surveillance and corruption concerns, the 3.5% threshold, roadmap phases, and financial details. Preserving them does not establish their accuracy. This local experiment adds no new statistics or QR codes.

## Presentation heuristics

Count a word as a whitespace-delimited token after trimming; hyphenated terms count as one. Titles, optional section labels, captions, and every diagram label each consume one authored string. Allow at most six audience strings per slide, six words in titles/section labels/captions, and five words in points or labels. Notes, labelled cues, controls, and slide numbers are outside these budgets.

The DNA deck has twenty-four slides, 1195 planned seconds, four section buffers, an agenda, a percentage downbeat, and a question buffer. It assigns explain, engage, or empower purposes. Connected diagrams and cards pairing labels with descriptions have explicit label-budget exceptions; all principal labels remain at least 40 logical px. Browser checks verify authored text parity, actual font sizes after SVG transforms, bounds, collisions, node and card containment, progress fill, projection controls, and offline assets.

## Editorial verification

The original UTF-8 snapshot and SHA-256 digest were checked byte for byte. Its digest is `a23a8c3855415511f3a635f3975c9aff0890f017383d0f279303bed5bfd7f85e`. All nonblank source lines are assigned to notes or explicitly classified headings/agenda; substantive ranges are reordered explicitly and never duplicated. Audience labels and titles were inspected against the text budgets. Renderer and browser verification are recorded separately after implementation.

## Verification and evidence

October 10 design verification: strict validation passes with 24 slides, 1195 planned seconds, and complete source coverage. All 80 repository tests pass. Chromium passes 1025 checks at 1280 × 720, 1920 × 1080, and 390 × 844, including projection mode, actual SVG font sizes, text/card containment, closing links, offline figure-image decoding, and notes syncing. Handbook validation checks 77 pages and two diagrams without errors. Live rehearsal remains pending.

Run the browser check against the built HTML, directly over `file://`:

```sh
node slides/tests/browser.mjs
```

It uses Playwright's installed Chromium by default. To select an existing installation:

```sh
SLIDES_CHROMIUM=/path/to/chrome node slides/tests/browser.mjs
```

Optional positional arguments select another HTML path and an evidence directory. The harness checks this DNA acceptance deck's twenty-four slides and current layouts, including `photo`, `figure`, and `actions`. It copies the audience HTML alone to a temporary directory and verifies its offline appearance, then adds the companion notes file to test the presenter link, synchronized windows, and standalone notes. It loads embedded assets, exercises navigation/focus and projection mode, and measures text after fonts load. It writes `output/browser-evidence/report.json` and screenshots, then removes its temporary files.

Historical checks performed on October 6, 2026 (before the October 9 revision):

| Check | Observed result |
| --- | --- |
| Strict DNA validation | Nineteen slides, 1020 planned seconds, zero uncovered lines, one explicit slide-count exception |
| Complete Node suite | 42 passing tests, including 20 slide validation/generation tests |
| Chromium verification | 588 passing checks at 1280 × 720, 1920 × 1080, and 390 × 844; 61 screenshots |
| Offline portability | Copied HTML alone opens; identical opener pixels; fonts, logos, photographs, and website artwork decode; zero external requests or browser errors |
| Actual text geometry | Two to six rendered audience lines per slide; every principal font ≥40 logical px; authored-to-rendered text parity, bounds, and text overlaps pass |
| Diagram relationships | Cycle edges connect the correct nodes; role boxes fit their enclosing ellipse, including a three-role fixture; sub-circles fit their parent and contain their role dots; horizons describe strategic focus |
| Photo geometry | Images stay within the stage and viewport and never obscure audience text |
| Navigation and notes | All slide keys, boundaries, editable controls, focus, separate presenter link, N shortcut, popup reuse/reopening, two-way sync, standalone notes, exact source passages, and scrolling pass |
| Notes separation | Audience HTML contains no source snapshot, speaker passages, or editorial cues; the separate notes file retains them verbatim |
| Culture and pacing | Four original values appear on their own slide; four section dividers occur in order; the 3.5% impact figure is 300 logical px with a legible separate caption |
| Source drift | All original source bytes and all substantive passages remain preserved; Culture and holacracy notes are mapped to their dedicated slides; speech and plan files were untouched |
| Visual review | Root and visual red team reviewed all new layouts; story red team reviewed the expanded sequence and Atlas/source distinction; no material remaining findings |
| Reuse | Temporary second JSON deck with different source/copy and `statement`/`steps` layouts builds strictly through the unchanged renderer |
| Handbook regression | `npm run docs:check` and `npm run docs:build` pass |
| Live speaker rehearsal | Pending; no observed speaking duration is claimed |

Historical October 9 revision 1 checks (superseded deck):

| Check | Observed result |
| --- | --- |
| Strict validation and rebuild | 21 slides, 1120 planned seconds, zero uncovered or duplicated source lines; explicit slide-count and seven-line pyramid exceptions |
| Full Node suite | 49 tests passed, including 27 slide tests |
| Chromium verification | 678 checks passed at 1280 × 720, 1920 × 1080, and 390 × 844; 67 screenshots |
| New slide treatments | Transparent logo, background contrast overlay, horizontal promise cards, five-tier pyramid, two-photo montage, and artistic Declaration treatment checked |
| Source and portability | Original source bytes retained; notes synchronized; embedded assets decoded offline; zero external requests or browser errors |
| Review | Three simplification agents found no worthwhile changes; local correctness review found no blocking code defects |
| Remaining editorial work | Steps to success remain TBD; opening wording follows the TODO; AP photo and website hero reuse permissions remain unverified |

The verified browser executable was `/home/rohan/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`. The JSON report records the HTML digest, actual executable, asset status, every check, viewport geometry, and screenshot names. At 1280 × 720 the controls leave a 0.9333 canvas scale, so 40 logical px displays at about 37.3 effective px. At 1920 × 1080 the scale is 1.4333; at 390 × 844 it is 0.3047. The report distinguishes those effective sizes from the logical 30pt target.

The current design retains the handbook's paper/ink palette and condensed headlines. Crisis uses readable cards with a stronger accent on the selected danger. The closing uses three practical action cards on coral. Core values centers the four original principles beneath larger, bolder icons, without subtext; ownership uses two panels without a caption. Strategy trees expand into successive rows, and the Movement Action Plan displays the original supplied figure. Atlas uses four sub-circles and dashed role dots inside a larger enclosing scope. Every diagram label remains text, with an accessible description of its relationships.

The first generation-test run failed because the CLI had no build operation; all four added generation scenarios then passed. Browser verification initially exposed a test's incorrect assumption about resetting Tab order after blur; the harness now tests focus using actual keyboard movement. Additional containment checks found SVG text extending slightly above its boxes; enlarging the boxes resolved the defect without changing text size. No renderer acceptance check was weakened. Three simplification reviews found one useful filesystem-check reduction; repeated source splitting was left alone because changing the tiny notes API added no practical value. No lint or typecheck command is configured in this repository.

Before presenting, rehearse the original notes, facilitator cues, section transitions, percentage pause, and question, then record an observed duration. The planned 1195 seconds is not proof of a delivery under twenty minutes.

## Make another deck

Create JSON using the versioned format above, with its own complete source snapshot, digest, notes ranges, audience copy, layouts, and timings. Validate and build it using the same commands with your paths substituted. The source path is checked against its digest when available; viewing the generated HTML never uses it. Missing source paragraphs remain errors even when the snapshot is complete.

For a deliberate source update, replace `source.text` and `source.sha256` together, then remap and review every source range and classification before validating. Do not refresh only the hash: valid old line numbers can still refer to different passages. Fonts and brand assets remain build inputs shared by decks; no renderer edit is required for different content.
