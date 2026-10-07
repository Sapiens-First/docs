# DNA slide experiment

This experiment turns the DNA speech into ten audience slides and preserves its original passages as speaker notes. The editable deck lives in `decks/10-6-dna.deck.json`. The presentation deliverable is one self-contained HTML file; authoring files are needed only to rebuild it.

## Authoring format

The JSON boundary is `schemaVersion: 1`. A deck contains `id`, `title`, `targetDurationSeconds`, `source`, `sourceGaps`, `sourceClassifications`, `editorialReview`, and `slides`.

`source` contains the repository-relative `path`, the lowercase SHA-256 `sha256` of its UTF-8 bytes, and the complete original `text`. Preserve every character, including whitespace. A changed original requires an editorial refresh of the snapshot, digest, and line mapping together.

Each slide contains a stable unique `id`, `layout`, `purpose` (`explain`, `engage`, or `empower`), `role` (`content` or `buffer`), audience-facing `title`, layout-specific `content`, positive integer `durationSeconds`, and `notes`. An optional `sectionLabel` is audience text too.

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
