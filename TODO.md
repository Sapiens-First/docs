# Handbook restructuring TODO

Started 2026-10-09. Slide-specific revisions to the DNA deck live separately in `slides/TODO.md`.

Implementation note (2026-10-09): the checked items below are verified locally. Remaining: D6 (review the two starter decks with Rohan), E5 (review the source comparison before filling content), F2 and G1. The DNA deck is still `approved: false`, so it publishes only with `SLIDES_PREVIEW=1`. The chapter source comparison is recorded, but E5 still needs Rohan's review before content is filled in. See [implementation progress](maintenance/implementation-progress.md) and the [layout review](maintenance/layout-review.md).

## Decisions so far

- **Chapter order:** 0 Start here, 1 DNA, 2 Go deeper, 3 Lead, 4 Train others, 5 Supplemental, then appendices (Staff moves in as a new appendix; Reference, Further reading and Citations stay).
- **Status emoji in the table of contents** comes from each page's frontmatter `status`, so the source file stays the source of truth. Pages not yet started get a stub file with `status: planned`.
- **One deck per module.** A module page names its deck in frontmatter (`slides: dna`). The mapping is written down, never inferred.
- **Two kinds of deck, always labelled:**
  - ✋ **Handcrafted:** written and approved by Rohan. Starter samples that define what a good deck looks like.
  - 🤖 **Auto-generated:** produced by a program from the module's text using a fixed formula. Labelled on the slides themselves, in the table of contents and in the slides index.
- A handcrafted deck replaces a generated one for the same module once approved. Handcrafted decks stay hidden from the site until marked `approved`.

## A. Restructure the chapters

- [x] A1. Rewrite `handbook-data/toc.json` to the new order and numbering.
- [x] A2. Update `CHAPTER_LABELS` in `scripts/handbook-toc.mjs` (labels "Start here", "DNA", "Go deeper", "Lead", "Train others", "Supplemental", appendix labels) and the `navChapters` list in `docs/.vitepress/config.mts`.
- [x] A3. Move `docs/staff/` into the appendices as a new appendix. Renumber it, update every internal link, and add the old `/staff/` routes to `handbook-data/redirects.json`.
- [x] A4. Renumber the Leadership chapter (2 → 3) and fix its headings, anchors, `handbook_number` and `canonical` fields, and all inbound links.
- [x] A5. Update the citations chapter, `docs/index.md`, `README.md`, `CONTRIBUTING.md` and `STYLE-GUIDE.md` for the new numbering.
- [x] A6. Run `npm run docs:check` and `node --test scripts/handbook-*.test.mjs`. Confirm the redirects.

## B. Status emoji in the grand table of contents

- [x] B1. Define the mapping: `adopted` / `reference` ✅, `draft` 📝, `under-construction` 🚧, `planned` ⬜. Add `planned` to the validator's allowed statuses.
- [x] B2. Show the emoji in the sidebar, the home page chapter map and `how-the-handbook-works.md`, reading `status` through `scripts/handbook-toc.mjs`.
- [x] B3. Show `construction_note` on hover or beneath the entry, and add a legend explaining the emoji.
- [x] B4. Add a test that fails when the TOC and a page's frontmatter status disagree.

## C. Slides inside the handbook

- [x] C1. Move `slides/` to top-level `slides/`. Update `README.md`, `.gitignore`, test paths and the plan doc references.
- [x] C2. Deck metadata gains `origin` (`handcrafted` | `generated`), `approved` (boolean) and `covers` (the handbook page IDs it teaches).
- [x] C3. Add `slides:` frontmatter to module pages. The validator checks that the deck exists, that it covers the page, and that the two agree.
- [x] C4. The site build copies publishable decks and their notes pages into the output (for example `/slides/dna/`). Publishable means handcrafted and approved, or generated.
- [x] C5. Module pages show "🎞 Slides for this module" with Present and Presenter notes buttons. Show the ✋ / 🤖 label next to it.
- [x] C6. Add a **Slides** index page listing every deck with its origin, the module it covers, approval status and last updated date. Link it from the TOC.
- [x] C7. Browser-test the built decks again from their published paths, including the notes-window sync.

## D. Auto-generated decks

- [x] D1. Write down the formula in a short doc, so what a generated deck looks like is predictable:
  - Title slide from the page title and summary.
  - One divider slide per H2 section.
  - Section bullets become a `triad`, `steps` or `statement`, depending on how many bullets there are.
  - Definitions and key terms become `pair` or `statement` slides.
  - Each slide's notes hold the exact source passage.
  - Sections too long for the formula are flagged rather than truncated.
- [x] D2. Add `slides.mjs generate <page.md>` that produces a deck JSON from the page, deterministically (same text in, same deck out, no AI at build time).
- [x] D3. Mark generated decks `origin: generated` and render a visible "Auto-generated from the handbook text" footer on every slide.
- [x] D4. Reuse the existing strict validator and source-coverage check on generated decks.
- [x] D5. Add a build step that regenerates a deck whenever its module page changes, and skips any module that has a handcrafted deck.
- [ ] D6. (Formula refined and Leadership publishes; strategy deep dive withheld for two long headings. Still needs Rohan's review.) Generate starter decks for Leadership and one Go deeper page, and review them with Rohan. Use what is learned to refine the formula and to decide which decks to craft by hand.

## E. New chapter skeletons

Each skeleton is a stub page with `status: planned`, a one-paragraph purpose, and the headings the page will need.

- [x] E1. **2 Go deeper:** why nonviolence works, strategy deep dive (S-curve, trigger moments, dilemma actions, spectrum of allies), AI safety deep dive, the organizer conversation. The last one already has material in the people page and the field guides, so link to it rather than copying.
- [x] E2. **4 Train others:** designing an agenda, teaching adults, role-plays and simulations, facilitating a room, training trainers, logistics and follow-up. Reconcile with the existing field guide A.2.9 Training organizers.
- [x] E3. **5 Supplemental:** keep the four existing pages. Set `status` to match their real state.
- [x] E4. Start-here introduction: re-read it as a general welcome to continuous training, and update it to match the new chapters.
- [ ] E5. Check the skeleton content against what Paul Engler's *This Is an Uprising* and the Momentum training curriculum emphasise. Review with Rohan before filling anything in.

## F. Handbook look and layout

- [x] F1. Review the home page, chapter landing pages and the sidebar. List what feels wrong and propose changes.
- [x] F2. Add a **Trainings** section or page that gathers every module with its deck, the matching handbook pages and the status. (Covered by appendix F Slides: each deck with its origin, the pages it teaches, approval and date.)
- [x] F3. Improve page layout: spacing, typography, callouts, chapter header treatment. Reuse the warmer colour scheme chosen for the slides so the two feel like one product.
- [x] F4. Check on mobile and in dark mode.

## G. Clean up the directory

- [ ] G1. Move the loose images (`dogs.png`, `march on washington.png`, `napalm girl.png`) into `slides/assets/` once licences are checked, and add them to `assets/sources.json`.
- [x] G2. Reconcile `10-2 content additions/` with the handbook and retire it (the `10-6-dna` speech becomes the deck's source file).
- [x] G3. Review `maintenance/`: fold `file-structure-audit.md` and the old plans into one current plan, and move superseded files to `maintenance/history/`.
- [x] G4. Confirm whether `.agents/`, `.codex/` and `.aws/` belong in the repo, and ignore or document them.
- [x] G5. Update the README's repository layout once the above is done.
