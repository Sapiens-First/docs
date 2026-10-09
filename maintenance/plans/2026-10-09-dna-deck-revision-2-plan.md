# DNA Deck Revision 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the October 9 spoken notes to the 21-slide DNA deck: new opening, agenda slide, topical section graphics, crossroads slide, reordered AI slides, an extinction-focus slide, a multi-slide strategy tree, reordered momentum slides, and a deck-wide progress indicator.

**Architecture:** The deck is data in `slides/decks/10-6-dna.deck.json`, rendered by `slides/slides.mjs` (layouts are branches in `validateDeck` around lines 129-151 and in the SVG diagram function around lines 395-440). New behavior is added as new layouts (`agenda`, `tree`) and small options (`highlight` on `triad`, a progress strip in the footer). Everything is TDD'd through the existing `node:test` suites.

**Tech Stack:** Node ESM (`slides.mjs`), `node:test`, Chromium browser tests (`tests/browser.mjs`), inline SVG.

**Supersedes:** the unchecked items in `slides/TODO.md` that conflict with this plan (see Task 10).

---

## Target slide order

Current slide numbers in parentheses. Items marked **NEW** do not exist yet.

| New # | id | Source | Change |
|---|---|---|---|
| 1 | `opening` (1) | edit | Title "Revolt for our future". "Sapiens First DNA" restyled as a badge. Date as small `10/09/26`. |
| 2 | `agenda` | **NEW** | Table of contents: Story, Strategy, Culture, Structure, Pathways to Action. |
| 3 | `story-section` (2) | edit | New graphic that fits "Story" (open book / unfolding pages). |
| 4 | `technology` (3) | edit | Replace playground photo with a crossroads illustration. |
| 5 | `vision` (5) | move + edit | "The promise of AI", icons centered, more coherent. |
| 6 | `crisis` (4) | move | "Dangers of AI" unchanged. |
| 7 | `extinction-focus` | **NEW** | Same three dangers; "Human extinction" lit, other two dimmed. |
| 8 | `founding-promise` (6) | **delete** | Move its notes and source ranges to a neighbor. |
| 8 | `strategy-section` (7) | edit | Better graphic, better color scheme. |
| 9 | `tree-goal` | **NEW** (replaces `roadmap`) | Tree level 1-2: AI treaty, then California / NY-FL-TX / national movement. |
| 10 | `tree-california` | **NEW** | California expanded: Berkeley, Sacramento, Los Angeles, and what goes under each. |
| 11 | `tree-berkeley` | **NEW** | Berkeley focus lit: chapter, Cal campaign, Freeze AI in California, policy creation, protest planning. |
| 12 | `tree-full` | **NEW** | Whole tree, current focus (Berkeley chapter) marked. |
| 13 | `momentum` (11) | move | Act / Recruit / Train. |
| 14 | `trigger-moments` (10) | move | After the cycle. |
| 15 | `participation-threshold` (9) | move | 3.5%. |
| 16 | `chapter-question` (12) | edit | Retitle "Pause for questions". |
| 17-21 | Culture, Structure, Pathways | unchanged | Renumber only. |

**Interpretations to confirm before Task 4 (cheap to flip, see Open Questions):** the agenda is a deck-wide table of contents; promise comes before dangers; the tree is a new layout rather than the old pyramid.

---

## File structure

- Modify `slides/slides.mjs`: validation + rendering for `agenda`, `tree`, `triad.highlight`, progress strip, per-section divider art, badge/date styles on `statement`.
- Modify `slides/decks/10-6-dna.deck.json`: all slide data and reordering.
- Create `slides/assets/crossroads.svg`: original illustration (no license risk).
- Modify `slides/assets/sources.json` and `assets/README.md`: remove the playground credit if no slide uses it, record the crossroads asset.
- Modify `slides/tests/revisions.test.mjs`: new unit tests (one test per task).
- Modify `slides/tests/browser.mjs`: slide count, order, progress indicator, tree geometry.
- Modify `slides/README.md`: counts and layout list.

Run all commands from the repo root: `/home/rohan/Desktop/Coding/S1 - Docs`.

Baseline check before starting:

```bash
node --test slides/tests/*.test.mjs
node slides/slides.mjs validate slides/decks/10-6-dna.deck.json --strict
```
Expected: all pass. If not, stop and report; do not build on a red baseline.

---

### Task 1: Opening slide

**Files:** `decks/10-6-dna.deck.json` (slide `opening`), `slides.mjs` (`statement` CSS and render), `tests/revisions.test.mjs`

Content shape change: keep `content.lines` as `["Sapiens First DNA", "10/09/26"]` and let the renderer style by position: line 0 becomes a badge, line 1 a small date. This avoids a schema change and keeps `audienceLines` counting.

- [ ] **Step 1: Failing test**

```js
test('opening statement renders a badge line and a small MM/DD/YY date', () => {
  const data = deck('statement', { lines: ['Sapiens First DNA', '10/09/26'] }, { title: 'Revolt for our future' })
  const html = renderDeck(data)
  assert.match(html, /<li class="audience-text statement-badge">Sapiens First DNA<\/li>/)
  assert.match(html, /<li class="audience-text statement-date">10\/09\/26<\/li>/)
})
```

- [ ] **Step 2:** `node --test slides/tests/revisions.test.mjs` → FAIL (no such classes).
- [ ] **Step 3:** In the `statement` render branch (`slides.mjs` ~line 471) change the `<li>` map to add `statement-badge` for index 0 and `statement-date` for index 1 when `slide.id === 'opening'`-style data is present; simplest rule: any statement with two lines gets these classes. Add CSS: `.statement-badge` pill with coral fill, ink border, letter-spaced caps, slight rotation (-2deg) for the "snazzier" look; `.statement-date` ~22px, reduced opacity, bottom-aligned.
- [ ] **Step 4:** Update the deck JSON: `title: "Revolt for our future"`, lines as above. Update the note cue that mentions the "revolt" alternative being pending: it is now decided.
- [ ] **Step 5:** Tests pass, then commit: `git add slides && git commit -m "feat(slides): revolt title, badge, short date"`

### Task 2: Agenda layout and slide

**Files:** `slides.mjs`, `decks/10-6-dna.deck.json`, `tests/revisions.test.mjs`

- [ ] **Step 1: Failing test**

```js
test('agenda lists 3-6 section labels in order and rejects other counts', () => {
  const ok = deck('agenda', { labels: ['Story', 'Strategy', 'Culture', 'Structure', 'Pathways to Action'] })
  assert.deepEqual(validateDeck(ok).errors, [])
  assert.match(renderDeck(ok), /class="agenda"/)
  assert.ok(validateDeck(deck('agenda', { labels: ['One'] })).errors.length)
})
```

- [ ] **Step 2:** Run → FAIL (unknown layout).
- [ ] **Step 3:** Register `agenda` wherever the layout list is enforced; add `if (slide.layout === 'agenda') labelArray('labels', 3, 6)`. Render as a numbered `<ol class="agenda">` with large numerals, each item in the color of its section divider tone (coral, yellow, paper, sage) so the later dividers visibly "belong" to it.
- [ ] **Step 4:** Insert slide `agenda` after `opening`: title "What we'll cover", `purpose: "engage"`, `role: "buffer"`, `durationSeconds: 20`, `notes.sourceRanges: []`, cue "Orient the audience to the five sections; the progress strip (Task 3) mirrors this list."
- [ ] **Step 5:** Tests pass; commit `feat(slides): agenda layout and slide`.

### Task 3: Deck-wide progress indicator (delegated design)

**Files:** `slides.mjs` (footer + CSS + validation), `decks/10-6-dna.deck.json` (a `section` field per slide), `tests/revisions.test.mjs`, `tests/browser.mjs`

**Delegation:** The visual design of the indicator goes to **Astra** per the notes. This task defines the data contract and tests so Astra's design drops in; Astra owns the look. If Astra is unavailable, implement the default below and mark the CSS as replaceable.

Data contract: each slide gets an optional `section` id (`story | strategy | culture | structure | pathways`). Sections are derived in order of first appearance; slides without `section` (opening, agenda) show no strip.

Default design: a thin segmented bar in the footer between the logo and the page counter, one segment per section, current segment filled and its sub-progress shown as a proportional fill, current section name in small caps.

- [ ] **Step 1: Failing test**

```js
test('footer progress strip marks the current section and fill', () => {
  const data = deck('statement', { lines: ['A'] }, { section: 'story' })
  data.slides.push({ ...data.slides[0], id: 'second', section: 'strategy' })
  const html = renderDeck(data)
  assert.equal((html.match(/class="progress-seg/g) ?? []).length, 4) // 2 sections x 2 slides each render the strip
  assert.match(html, /data-section="story"[^>]*aria-current="step"/)
})
```
(Adjust the count to the renderer's actual markup when writing; the assertion that matters is one segment per section on every slide with a `section`, and `aria-current="step"` on the active one.)

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Validate `section` against the allowed ids; render the strip in `.slide-footer`; ensure it never overlaps the photo footer badge style (`.slide.with-photo .slide-footer span` at line ~314).
- [ ] **Step 4:** Add `section` to every slide in the deck JSON per the final order table.
- [ ] **Step 5:** Browser test: on slide N the active segment's section matches the slide's `section`; strip fits inside 1920x1080 and 1280x720 without clipping.
- [ ] **Step 6:** Commit `feat(slides): section progress strip`.

### Task 4: Section divider graphics that match their topics

**Files:** `slides.mjs` (`dividerArt`), `decks/10-6-dna.deck.json` (`graphic` values), `tests/revisions.test.mjs`

Replace the generic `contours` / `arcs` rotation with a graphic keyed to the section:

| Section | `graphic` | Motif |
|---|---|---|
| Story | `book` | open book, pages fanning out |
| Strategy | `route` | winding route to a flag (also fixes Task 7's "better graphic") |
| Culture | `hands` | linked hands / heart |
| Structure | `nested` | nested circles |
| Pathways | `signpost` | signpost with three arrows (matches Donate / Join / Organize) |

- [ ] **Step 1: Failing test**: for each id, `renderDeck` of a `divider` slide with that `graphic` contains `data-graphic="<id>"` and an `aria-hidden` SVG; an unknown graphic is a validation error.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement each as a small inline SVG path set in `dividerArt`, using existing CSS variables only (`--coral`, `--yellow`, `--sage`, `--paper`, `--ink`).
- [ ] **Step 4:** Set `graphic` on the five divider slides. Strategy also gets its color change here: switch `tone` from `coral` to the deck's darker accent so the divider contrasts with the Story divider (confirm visually in Task 11).
- [ ] **Step 5:** Pass and commit `feat(slides): topical divider graphics`.

### Task 5: Crossroads slide

**Files:** create `assets/crossroads.svg`; modify `decks/10-6-dna.deck.json` (`technology`), `assets/sources.json`, `assets/README.md`

The user wants a crossroads image, then talks over "could be really good or really bad". Draw it as an original SVG: one road splitting in two, left fork under dark clouds, right fork toward sunrise. No people, no text inside the SVG.

- [ ] **Step 1:** Write `assets/crossroads.svg` (viewBox `0 0 1600 900`, roads converging at the bottom center, two horizons).
- [ ] **Step 2:** In `technology`, replace the `civic-park.jpg` image with `assets/crossroads.svg`, keep `layout: choice`, keep the labels. Confirm how `imageAsset()` embeds SVG; if it only handles raster types, extend it for `image/svg+xml` with a failing test first.
- [ ] **Step 3:** Update `sources.json` (add the SVG as original work, no license needed). `civic-park.jpg` is still used by `next-step`, so keep its credit.
- [ ] **Step 4:** Validate `--strict`; commit `feat(slides): crossroads illustration`.

### Task 6: Reorder AI slides, center the promise slide, add extinction focus

**Files:** `slides.mjs` (`triad`), `decks/10-6-dna.deck.json`, `tests/revisions.test.mjs`

- [ ] **Step 1: Failing test**

```js
test('triad highlight lights one item and dims the rest', () => {
  const data = deck('triad', { labels: ['Human extinction', 'Threats to democracy', 'Vast inequality'], highlight: 0 })
  assert.deepEqual(validateDeck(data).errors, [])
  const html = renderDeck(data)
  assert.match(html, /<li class="is-lit"/)
  assert.equal((html.match(/is-dim/g) ?? []).length, 2)
  assert.ok(validateDeck(deck('triad', { labels: ['A', 'B', 'C'], highlight: 5 })).errors.length)
})
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Validate `highlight` as an integer index into `labels`; render `is-lit` / `is-dim` classes; CSS dims to ~35% opacity and gives the lit item a glow and larger icon.
- [ ] **Step 4:** Center the horizontal triad (`.triad.horizontal`): `justify-content:center`, equal-width columns, icon above label, consistent icon box size. Visual check on `vision`.
- [ ] **Step 5:** Deck edits: move `vision` before `crisis`; add `extinction-focus` after `crisis` (title "Our focus: human extinction", same labels, `highlight: 0`, `tone: dark`, notes: "This is the risk the strategy that follows addresses first." with no new source ranges).
- [ ] **Step 6:** Commit `feat(slides): centered promise, extinction focus slide`.

### Task 7: Delete the founding-promise slide

**Files:** `decks/10-6-dna.deck.json`, `assets/sources.json`, `assets/README.md`, tests that count slides or reference `founding-promise`

- [ ] **Step 1:** `grep -rn "founding-promise\|declaration-of-independence" slides/ maintenance/` to find every reference.
- [ ] **Step 2:** Move its `notes.sourceRanges` onto `extinction-focus` so strict source coverage still passes.
- [ ] **Step 3:** Remove the slide. Delete `declaration-of-independence.jpg` and its `sources.json` entry only if nothing else references it.
- [ ] **Step 4:** `node slides/slides.mjs validate ... --strict` passes; commit `chore(slides): remove founding promise slide`.

### Task 8: Tree layout and the four strategy slides

**Files:** `slides.mjs` (validation, render, CSS), `decks/10-6-dna.deck.json`, `tests/revisions.test.mjs`

The tree is one authored structure, rendered at four zoom/focus levels so the same shape builds across slides and the audience always sees where the current work sits.

Content shape:

```json
{ "tree": {
    "id": "treaty", "label": "AI treaty",
    "children": [
      { "id": "ca", "label": "State action in California", "children": [
        { "id": "berkeley", "label": "Berkeley", "children": [
          { "id": "chapter", "label": "Berkeley chapter", "current": true },
          { "id": "cal", "label": "Campaign in Cal" },
          { "id": "freeze", "label": "Freeze AI in California" },
          { "id": "policy", "label": "Policy creation" },
          { "id": "protest", "label": "Protest planning" } ] },
        { "id": "sac", "label": "Sacramento" },
        { "id": "la", "label": "Los Angeles" } ] },
      { "id": "states", "label": "New York, Florida, Texas" },
      { "id": "national", "label": "National movement" } ] },
  "reveal": ["treaty", "ca", "states", "national"],
  "focus": "ca" }
```

Rules: `reveal` is the list of node ids shown; every id must exist; a revealed node's parent must also be revealed; at most one node has `current: true`; `focus` (optional) lights that node and its revealed descendants and dims the rest. Top-level goal is "AI treaty" only (no "federal policy" wording).

- [ ] **Step 1: Failing tests**

```js
const tree = () => ({ id: 'treaty', label: 'AI treaty', children: [{ id: 'ca', label: 'California', children: [{ id: 'berkeley', label: 'Berkeley', current: true }] }, { id: 'states', label: 'NY, FL, TX' }] })
test('tree validates reveal, focus and the single current node', () => {
  assert.deepEqual(validateDeck(deck('tree', { tree: tree(), reveal: ['treaty', 'ca'], focus: 'ca' })).errors, [])
  for (const bad of [{ reveal: ['ca'] }, { reveal: ['treaty', 'nope'] }, { reveal: ['treaty'], focus: 'berkeley' }]) assert.ok(validateDeck(deck('tree', { tree: tree(), reveal: ['treaty'], ...bad })).errors.length, JSON.stringify(bad))
})
test('tree renders only revealed nodes and marks the focus and current node', () => {
  const html = renderDeck(deck('tree', { tree: tree(), reveal: ['treaty', 'ca', 'berkeley', 'states'], focus: 'ca' }))
  assert.equal((html.match(/class="tree-node/g) ?? []).length, 4)
  assert.match(html, /data-node="berkeley"[^>]*data-current="true"/)
  assert.match(html, /data-node="states"[^>]*data-dim="true"/)
})
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement validation (above rules) and a deterministic top-down layout: level = depth, x spread by leaf count, SVG elbow connectors, nodes as rounded rects colored by depth using the existing palette. Place the renderer beside the other diagram layouts, and add an `aria` description that reads the revealed tree in order. Keep node text at the deck's minimum font size; if Berkeley's five children do not fit on one row, stack them vertically under Berkeley.
- [ ] **Step 4:** Replace `roadmap` with four slides sharing one `tree` object (copy the full object into each slide; the schema has no cross-slide references):
  - `tree-goal`: title "Political change for humanity", `reveal: [treaty, ca, states, national]`, no focus.
  - `tree-california`: title "It starts in California", reveal adds `berkeley, sac, la`, `focus: ca`.
  - `tree-berkeley`: title "Where we are now: Berkeley", reveal adds Berkeley's five children, `focus: berkeley`.
  - `tree-full`: title "One chapter at a time", full reveal, no focus, `current` marker visible with a "You are here" tag.
  Keep the `march-on-washington.jpg` image only if a slide has room; otherwise drop it from this block (it stays on the 3.5% slide). Carry the original `roadmap` notes and its `sourceRanges` 54-64 onto `tree-goal`; the other three have `sourceRanges: []`.
- [ ] **Step 5:** `ruleExceptions` for `1-6-6` on the old roadmap no longer applies; remove it and re-run strict validation to see what the new slides need.
- [ ] **Step 6:** Commit `feat(slides): tree layout and four strategy slides`.

### Task 9: Reorder momentum slides, retitle the closing question

**Files:** `decks/10-6-dna.deck.json`, `tests/browser.mjs`

- [ ] **Step 1:** Order after the tree slides: `momentum` (Act/Recruit/Train), `trigger-moments`, `participation-threshold` (3.5%).
- [ ] **Step 2:** `chapter-question`: title "Pause for questions"; update the cue to "Open the floor"; keep its `arcs` graphic. Remove the line that references the pyramid; point it at the tree.
- [ ] **Step 3:** Fix the cue text in `momentum` and `trigger-moments` that says "preceding Trigger moments slide" / "original three action definitions" so each references its new neighbors.
- [ ] **Step 4:** Commit `feat(slides): reorder momentum, pause for questions`.

### Task 10: Update docs, counts, and the old TODO

**Files:** `slides/README.md`, `slides/TODO.md`, `maintenance/` index if it lists plans

- [ ] **Step 1:** README: new slide count (21 + agenda + extinction-focus - founding-promise + 3 net tree slides = 25; confirm against the built deck), new layouts `agenda` and `tree`, `triad.highlight`, `section`.
- [ ] **Step 2:** `TODO.md`: mark superseded items (roadmap pyramid, founding-promise slide, "Astro" question) as replaced by this plan and link to it.
- [ ] **Step 3:** Commit `docs(slides): revision 2 docs`.

### Task 11: Full verification

- [ ] **Step 1:** `node slides/slides.mjs validate slides/decks/10-6-dna.deck.json --strict` → no errors, no uncovered source ranges.
- [ ] **Step 2:** `node slides/slides.mjs build slides/decks/10-6-dna.deck.json slides/output/10-6-dna.html --strict`
- [ ] **Step 3:** `node --test slides/tests/*.test.mjs` → all pass.
- [ ] **Step 4:** Update `tests/browser.mjs` expectations (slide count, order, ids) then `node slides/tests/browser.mjs` → pass.
- [ ] **Step 5:** Open `slides/output/10-6-dna.html` and step through every changed slide at 1920x1080: opening badge/date, agenda, five divider graphics, crossroads, promise centered, extinction lit, four tree slides, progress strip on every section slide, Pause for questions. Fix anything clipped or illegible; report anything not checked.
- [ ] **Step 6:** Merge to `main` with the git CLI (no PR, per the standing preference): `git checkout main && git merge --no-ff docs/unified-handbook` only after the user confirms the branch contains nothing else they want held back (the branch also carries unrelated handbook changes).

---

## Open questions

1. **Astra:** unidentified. The plan assumes Astra is a person or tool that designs the progress indicator (Task 3). `TODO.md` also lists an unresolved "Astro". Confirm who/what this is and how to hand off the design.
2. **Agenda scope:** the notes say "table of contents for the story slide". Read as a deck-wide contents slide placed before Story. If it should list only the Story subsections, change Task 2's labels and drop the five-section coloring.
3. **Promise/dangers order:** the notes read "promise of AI... and then the dangers of AI", the reverse of the current deck, so Task 6 swaps them.
4. **Opening title:** "Revolt for our future" is used as dictated. Earlier drafts said "Fight for our future".
5. **Date format:** `10/09/26` assumes MM/DD/YY. Should it be generated at build time instead of hard-coded?
6. **Tree content beyond Berkeley:** what sits under Sacramento and Los Angeles, and whether "National movement" gets children, was not specified. Task 8 leaves them as leaf nodes.
7. **Extinction slide wording:** title "Our focus: human extinction" is a placeholder for your phrasing.
