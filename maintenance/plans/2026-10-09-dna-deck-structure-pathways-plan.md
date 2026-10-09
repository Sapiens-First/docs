# DNA Deck Structure and Pathways Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the Structure section (triangle of participation, a table of what each level does, Holacracy first, people energize roles, an example circle) and add a "choice" callback before Pathways, plus a deck-wide spacing and layout pass.

**Architecture:** Reuse before building. The participation triangle is the existing `cycle` layout with labeled edges, so it visually matches Act / Recruit / Train. The table is one new layout (`columns`). The callback reuses the `choice` layout and `crossroads.svg` from revision 1. The spacing pass is an audit of rendered screenshots, then CSS token fixes locked in by geometry tests.

**Tech Stack:** Node ESM (`slides/slides.mjs`), `node:test`, Chromium browser tests (`slides/tests/browser.mjs`), inline SVG.

**Depends on:** `maintenance/plans/2026-10-09-dna-deck-revision-2-plan.md`. Tasks 1-2 of this plan can run independently. Task 5 needs `assets/crossroads.svg` (revision 2, Task 5) and the `section` field (revision 2, Task 3). Slides are referenced by **id**, not number, because revision 2 renumbers the deck.

---

## Target order for the back half

Current slide numbers in parentheses (the numbers used in your notes).

| # | id | Source | Change |
|---|---|---|---|
| 1 | `structure-section` (15) | unchanged | |
| 2 | `participation` (16) | edit | Titled "Ladder of engagement". Triangle: Supporter, Member, Organizer, with Act / Recruit / Train on the edges. |
| 3 | `participation-levels` | **NEW** | Table: what each level looks like. |
| 4 | `ownership-principles` (18) | move + edit | Moves before circles. Title "Holacracy". Labels stay: Rules of the road, Clear ownership. |
| 5 | `circles` (17) | move + edit | Title "People energize roles". |
| 6 | `roles` (19) | edit | Framed as an example circle, with a meeting-time line. |
| 7 | `pathways-section` (20) | unchanged | |
| 8 | `choice-callback` | **NEW** | Crossroads image again, echoing "Humanity faces a choice". |
| 9 | `next-step` (21) | unchanged content | Included in the spacing pass. |

**Placement to confirm:** the callback sits after the Pathways divider and directly before "Choose your next step", so the section progress strip stays correct. If you want it before the divider, change one line in Task 5.

Run every command from the repo root: `/home/rohan/Desktop/Coding/S1 - Docs`.

Baseline before starting:

```bash
node --test slides/tests/*.test.mjs
node slides/slides.mjs validate slides/decks/10-6-dna.deck.json --strict
```
Expected: all pass. If not, stop and report.

---

### Task 1: Participation triangle (cycle with edge labels)

**Files:** `slides/slides.mjs` (`cycle` branch in the diagram function, ~line 417; cycle validation near line 146), `slides/decks/10-6-dna.deck.json` (`participation`), `slides/tests/revisions.test.mjs`

Meaning of the diagram, from your notes: organizers **act**, which brings supporters in; supporters are **recruited** into members; members are **trained** into organizers; organizers act again. Same three verbs and same direction as the Act / Recruit / Train cycle, so the two slides read as a pair.

Data shape: add an optional `content.edgeLabels`, three strings, one per edge in drawing order (node 0 → 1, 1 → 2, 2 → 0).

For this slide, node order and edge labels are:
- nodes: `Supporter`, `Member`, `Organizer`
- edges: `Recruit` (Supporter → Member), `Train` (Member → Organizer), `Act` (Organizer → Supporter)

- [ ] **Step 1: Write the failing test**

```js
test('cycle renders optional edge labels and rejects a wrong count', () => {
  const labels = ['Supporter', 'Member', 'Organizer']
  const ok = deck('cycle', { labels, edgeLabels: ['Recruit', 'Train', 'Act'] })
  assert.deepEqual(validateDeck(ok).errors, [])
  const html = renderDeck(ok)
  for (const word of ['Recruit', 'Train', 'Act']) assert.match(html, new RegExp(`class="edge-label[^>]*>${word}<`))
  assert.ok(validateDeck(deck('cycle', { labels, edgeLabels: ['Recruit'] })).errors.length)
  assert.deepEqual(validateDeck(deck('cycle', { labels })).errors, []) // still optional
})
```

- [ ] **Step 2:** `node --test slides/tests/revisions.test.mjs` → FAIL (`edge-label` not found, wrong count accepted).
- [ ] **Step 3: Implement.** In validation: if `c.edgeLabels !== undefined`, require an array of exactly 3 non-empty strings. In the `cycle` renderer, after the three `<path class="edge">` elements, add one `<text class="edge-label audience-text">` per edge at these midpoints (the cycle viewBox is 1136 wide; nodes are at (568,65), (850,305), (285,305)):

```js
const mids = [[820, 120], [568, 340], [300, 120]] // Supporter→Member, Member→Organizer, Organizer→Supporter positions chosen to sit beside each edge
body += (c.edgeLabels ?? []).map((value, i) => label(value, mids[i][0], mids[i][1], 30).replace('<text class="audience-text"', '<text class="edge-label audience-text"')).join('')
```

Add `edge-label` CSS (italic, `fill: var(--ink)`, small paper-colored halo via `paint-order: stroke` so it stays readable over the arrows). Update the `description` string to include the edge verbs when present: `Supporter —Recruit→ Member —Train→ Organizer —Act→ Supporter`.

Note on node placement: the existing cycle puts node 0 on top, node 1 bottom-right, node 2 bottom-left. With labels in order Supporter, Member, Organizer the Member → Organizer edge runs along the bottom, which reads left-to-right wrong for "Train". When rendering, check visually; if it reads backwards, reverse the label order in the deck (Organizer top, Supporter bottom-right, Member bottom-left) rather than changing the shared geometry, so the Act / Recruit / Train slide is unaffected.

- [ ] **Step 4:** Update the `participation` slide: `layout: "cycle"`, drop `mode: "progression"`, add `edgeLabels`, set `title` to "Ladder of engagement" (was "Grow through participation"). Keep the existing notes and `sourceRanges`; add a cue "Organizers act; supporters are recruited; members are trained into organizers."
- [ ] **Step 5:** Run the revisions test and strict validation → pass. Commit:

```bash
git add slides && git commit -m "feat(slides): participation triangle with labeled edges"
```

### Task 2: Participation table (`columns` layout)

**Files:** `slides.mjs` (validation + render + CSS), `decks/10-6-dna.deck.json`, `tests/revisions.test.mjs`

Content:

| Supporter | Member | Organizer |
|---|---|---|
| On the email list | Pays dues | Participates |
| Comes to events | Part of our Discord | Joins working groups |

Data shape:

```json
{ "columns": [
  { "label": "Supporter", "items": ["On the email list", "Comes to events"] },
  { "label": "Member", "items": ["Pays dues", "Part of our Discord"] },
  { "label": "Organizer", "items": ["Participates", "Joins working groups"] } ] }
```

Rules: exactly 3 columns; each has a non-empty `label` and 1-3 non-empty `items`.

- [ ] **Step 1: Write the failing test**

```js
test('columns layout validates three labeled columns and renders every item', () => {
  const columns = [
    { label: 'Supporter', items: ['On the email list', 'Comes to events'] },
    { label: 'Member', items: ['Pays dues', 'Part of our Discord'] },
    { label: 'Organizer', items: ['Participates', 'Joins working groups'] }]
  const ok = deck('columns', { columns })
  assert.deepEqual(validateDeck(ok).errors, [])
  const html = renderDeck(ok)
  assert.equal((html.match(/class="column-head/g) ?? []).length, 3)
  assert.match(html, /Joins working groups/)
  for (const bad of [columns.slice(0, 2), [...columns.slice(0, 2), { label: 'Organizer', items: [] }], [...columns.slice(0, 2), { label: '', items: ['x'] }]]) assert.ok(validateDeck(deck('columns', { columns: bad })).errors.length)
})
```

- [ ] **Step 2:** Run → FAIL (unknown layout).
- [ ] **Step 3: Implement.** Register `columns`; add to validation: `if (slide.layout === 'columns') { /* 3 columns, label text, 1-3 items each */ }`. Render `<div class="columns">` with three cards. Each card: a person icon (reuse the `person()` helper used by the participation cards, scaled up per column so the three sizes visually step up), head `<h2 class="column-head audience-text">`, then `<ul>` of items. Card fills use the same palette order as the old participation cards (coral, yellow, sage) so the color identity of Supporter / Member / Organizer carries over from the triangle.
- [ ] **Step 4:** `audienceLines` for this slide is 1 title + 3 heads + 6 items = 10, which will trip the strict line-count finding (the revisions test shows a "7 authored lines" finding for the pyramid). Do not shorten the text. Add a justified `ruleExceptions` entry on the slide, in the form already used by the old roadmap slide: `{ "rule": "<rule id from the finding>", "text": "<title>", "reason": "A three-by-two comparison table is read as one unit; the presenter explains each cell aloud." }`. Run `validate --strict` first to see the exact rule id and message.
- [ ] **Step 5:** Add slide `participation-levels` after `participation`: title "What each level looks like", `purpose: "explain"`, `role: "content"`, `durationSeconds: 60`, `notes.sourceRanges: []`, cue "How people move between levels is on the previous slide; this one is what each level means in practice."
- [ ] **Step 6:** Commit `feat(slides): columns layout and participation table`.

### Task 3: Holacracy first, then "People energize roles"

**Files:** `decks/10-6-dna.deck.json`, `tests/revisions.test.mjs` (order test), `tests/browser.mjs` (ids/order)

- [ ] **Step 1: Failing order test.** Add to the deck-level checks in `tests/browser.mjs` (or a node test that loads the deck JSON):

```js
test('structure section order', () => {
  const ids = JSON.parse(readFileSync(new URL('../decks/10-6-dna.deck.json', import.meta.url))).slides.map(s => s.id)
  const start = ids.indexOf('structure-section')
  assert.deepEqual(ids.slice(start, start + 6), ['structure-section', 'participation', 'participation-levels', 'ownership-principles', 'circles', 'roles'])
})
```
(import `readFileSync` from `node:fs` in that file if it is not already imported.)

- [ ] **Step 2:** Run → FAIL on the current order.
- [ ] **Step 3:** In the deck JSON, move `ownership-principles` ahead of `circles`. Change `ownership-principles.title` to `"Holacracy"`; leave `content.labels` as `["Rules of the road", "Clear ownership"]`. Change `circles.title` to `"People energize roles"`; leave the circle graphic and labels (Media, Advocacy, Community, Tech) alone. Move the notes' ordering cues: `ownership-principles` now introduces the idea, `circles` follows from it.
- [ ] **Step 4:** Check that no note cue references "the next slide" or "the previous slide" in a way the move broke: `grep -n "preceding\|previous slide\|next slide" slides/decks/10-6-dna.deck.json`.
- [ ] **Step 5:** Run tests and commit `feat(slides): holacracy before circles, retitle`.

### Task 4: Example circle slide with a meeting time

**Files:** `slides.mjs` (`roles` validation at line ~151 and its render), `decks/10-6-dna.deck.json` (`roles`), `tests/revisions.test.mjs`

Your notes say each circle has a meeting time, which you will explain live. The slide needs to show that a circle has one, without carrying the explanation. Add an optional `content.meeting` string rendered as a small pill under the circle.

**Blocking input:** the actual text for the pill. Candidates from the docs: check `docs/appendices/reference/tactical-meeting-agenda.md`, `governance-meeting-agenda.md` and `tech-team-meeting-agenda.md` for the real cadence. Do not invent a day or time. If nothing is decided, use the neutral `"Meets on a regular rhythm"` and flag it in the hand-off.

- [ ] **Step 1: Failing test**

```js
test('roles can carry an example label and a meeting pill', () => {
  const data = deck('roles', { circle: 'Media Circle', roles: ['Social Media Manager', 'Email Sender'], meeting: 'Meets weekly' }, { sectionLabel: 'Example circle' })
  assert.deepEqual(validateDeck(data).errors, [])
  const html = renderDeck(data)
  assert.match(html, /class="section-label[^>]*>Example circle</)
  assert.match(html, /class="meeting-pill[^>]*>Meets weekly</)
  assert.ok(validateDeck(deck('roles', { circle: 'Media Circle', roles: ['A', 'B'], meeting: '' })).errors.length)
})
```

- [ ] **Step 2:** Run → FAIL (no `meeting-pill`).
- [ ] **Step 3: Implement.** Validate `meeting` as an optional non-empty string. Render a `<p class="meeting-pill audience-text">` under the diagram with a small clock icon (inline SVG, `aria-hidden`). `sectionLabel` is already supported, so "Example circle" needs no renderer work.
- [ ] **Step 4:** Deck edit on `roles`: `sectionLabel: "Example circle"`, keep the title "Own a role. Build together.", add `content.meeting` with the text from the blocking input. Update the `circle`/`caption` notes cue: "Each circle has its own meeting time; explain it live."
- [ ] **Step 5:** Commit `feat(slides): example circle with meeting pill`.

### Task 5: Callback to "Humanity faces a choice"

**Files:** `decks/10-6-dna.deck.json`, `tests/revisions.test.mjs`, `tests/browser.mjs`

Prerequisite check: `ls slides/assets/crossroads.svg` must exist (revision 2, Task 5). If it does not, run that task first.

You will say "What will you choose?" aloud. The slide only needs to echo the earlier image so the audience recognizes the moment. Reuse the `choice` layout and the same illustration; same two labels as the first time so the match is exact.

- [ ] **Step 1: Failing test** (deck-level, so it checks the real data):

```js
test('choice callback reuses the opening crossroads image', () => {
  const slides = JSON.parse(readFileSync(new URL('../decks/10-6-dna.deck.json', import.meta.url))).slides
  const first = slides.find(s => s.id === 'technology'), echo = slides.find(s => s.id === 'choice-callback')
  assert.ok(echo)
  assert.equal(echo.layout, 'choice')
  assert.equal(echo.image.path, first.image.path)
  assert.deepEqual(echo.content.labels, first.content.labels)
  const ids = slides.map(s => s.id)
  assert.equal(ids.indexOf('choice-callback') + 1, ids.indexOf('next-step'))
})
```

- [ ] **Step 2:** Run → FAIL (`choice-callback` missing).
- [ ] **Step 3:** Add the slide immediately before `next-step` (after `pathways-section`): `id: "choice-callback"`, `layout: "choice"`, title `"What will you choose?"`, `purpose: "engage"`, `role: "buffer"`, `durationSeconds: 30`, `content.labels` copied from `technology`, `image` copied from `technology`, `section: "pathways"` (if revision 2's field exists), `notes.sourceRanges: []`, cue "Callback to Humanity faces a choice. Pause here; the choice is theirs." Copy the image object including `alt`, so alt text is identical.
- [ ] **Step 4:** To the browser test, add: the slide exists, the SVG loads (no broken `<img>`), and the road labels sit inside the viewport.
- [ ] **Step 5:** Commit `feat(slides): choice callback before next step`.

### Task 6: Spacing and layout pass

**Files:** `slides.mjs` (CSS block starting near line 300), `tests/browser.mjs`, `slides/output/browser-evidence/`

This is an audit first, then fixes; you asked for a quick pass, so it is capped at the problems visible in the screenshots.

- [ ] **Step 1: Capture.** Build the deck and screenshot every slide at 1920x1080 with the existing browser harness (`node slides/tests/browser.mjs` already writes evidence under `output/browser-evidence/`). If it does not capture every slide, extend its loop to do so.
- [ ] **Step 2: Audit against this checklist**, one line per defect with slide id:
  - title position and size consistent across `explain` slides
  - same left/right safe margin (72px in `.slide-footer`) used by content
  - vertical rhythm: gap between title and content, content and footer
  - diagram centered in the space under the title, not just the page
  - nothing within 24px of the footer
  - label size consistent across the diagrams (`label()` sizes of 30-44 appear in different layouts)
  - the `next-step` slide specifically: spacing between the three options and the image/graphic
- [ ] **Step 3: Failing geometry test** for each systemic defect found, using the harness's existing geometry helpers (for example "diagram bounding box is horizontally centered within 8px", "no content box overlaps the footer"). Write the assertion before the CSS change.
- [ ] **Step 4: Fix with shared CSS variables**, not per-slide offsets: introduce `--safe-x`, `--title-gap`, `--footer-clear` on `:root` and use them in the layout rules. Per-slide overrides only for a genuine one-off, with a comment saying why.
- [ ] **Step 5:** Re-run the browser test; re-screenshot; confirm each audited defect is fixed or listed as deliberately left.
- [ ] **Step 6:** Commit `style(slides): shared spacing tokens and layout pass`.

### Task 7: Documentation and full verification

**Files:** `slides/README.md`, `slides/TODO.md`

- [ ] **Step 1:** README: add `columns` layout, `cycle.edgeLabels`, `roles.meeting`; update slide count (this plan adds 2: `participation-levels`, `choice-callback`).
- [ ] **Step 2:** `TODO.md`: note this plan and mark nothing complete until verified.
- [ ] **Step 3: Verify**
  - `node slides/slides.mjs validate slides/decks/10-6-dna.deck.json --strict` → no errors
  - `node slides/slides.mjs build slides/decks/10-6-dna.deck.json slides/output/10-6-dna.html --strict`
  - `node --test slides/tests/*.test.mjs` → all pass
  - `node slides/tests/browser.mjs` → pass (update expected counts/ids first)
- [ ] **Step 4:** Open `slides/output/10-6-dna.html` and step through Structure and Pathways at 1920x1080 and 1280x720. Report what was not checked.
- [ ] **Step 5:** Commit `docs(slides): structure and pathways docs`. Merge to `main` with the git CLI only after you confirm what the branch should carry (it also holds unrelated handbook work).

---

## Open questions

1. **Triangle direction (resolved):** exactly three levels, Supporter → Member → Organizer, with no direct Supporter → Organizer shortcut. The plan keeps the Organizer → Supporter "Act" edge that closes the triangle, from your first description ("organizers act, supporters are recruited"). Tell me if you want that closing edge dropped, which would make it a plain three-step progression instead of a triangle.
2. **Table title:** "What each level looks like" is a placeholder. You mentioned "how do you become a member?"; I can use that as the title instead.
3. **Meeting pill text:** needs the real cadence (Task 4). Until then it renders neutral text.
4. **Callback placement:** after the Pathways divider (default) or before it.
5. **Callback emphasis:** I echo the image exactly. If you want the "good" road lit this time, it is a small addition, similar to `triad.highlight` in revision 2.
6. **Spacing pass scope:** limited to the defects visible in screenshots. Sections outside Structure and Pathways are included in the audit, but only systemic problems get fixed.
