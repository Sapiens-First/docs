# Incremental handbook implementation

Last updated: 2026-10-09

## 2026-10-09: Handbook restructuring

Implemented and verified locally: **A1–A6, B1–B4, D1, E1–E4, F1/F3/F4, G3–G5**. [TODO.md](../TODO.md) records the checked requirements; the [current implementation plan](HANDBOOK-IMPLEMENTATION-PLAN.md) governs the remaining work. Earlier entries below describe historical work and superseded roadmaps.

- Chapters now run 0 Start here, 1 DNA, 2 Go deeper, 3 Lead, 4 Train others and 5 Supplemental. Appendices A–D retain their existing numbers; Staff is E, with all five original pages under `docs/appendices/staff/` and a new landing page.
- All 75 numbered pages live in the TOC. Renumbered links, headings, citations and contributor instructions agree. Old staff URLs and historic compensation links go directly to their new destinations. Redirects preserve bookmarked subsections unless the mapping explicitly names a replacement anchor.
- Frontmatter supplies every navigation status and construction note. Sidebar, home and handbook-guide contents show symbols; the guide and home show a legend. Planned pages have a visible banner. Machine-readable exports use the same chapter order and allowed statuses.
- Added 12 planned pages: two chapter landings and ten topic outlines. They link existing organizer/training guidance. The book and Momentum source comparison is recorded on the landings; Rohan's E5 review remains pending before content is filled in.
- Kept the shared warm palette and adjusted contents spacing, narrow-screen typography and tablet navigation. [Layout findings and changes](reviews/layout-review.md) are recorded. The responsive menu opens through 959px.
- Documented the [deterministic slide formula](generated-slides.md); the generator is still unimplemented. Consolidated current planning and preserved five superseded originals unchanged in `maintenance/history/`. Local tool directories were already ignored and contain no tracked files; verified again.

Verification:

- `npm run docs:check`: 76 pages and 2 SVG diagrams, zero errors or warnings.
- `node --test scripts/handbook-*.test.mjs`: 25 tests pass, including frontmatter status refresh, TOC status conflicts, all moved staff routes and incoming bookmark preservation.
- `npm run docs:build`: production build passes. After the final redirect fix, regenerated stubs using the same `writeRedirects` helper as `buildEnd` and checked them in Chromium.
- `npm run book:build`: downloadable HTML, PDF and EPUB build successfully with the complete new chapter order.
- Chromium: 50 route/viewport/theme checks at 320, 390, 768, 1024 and 1440px, in light and dark mode; zero horizontal overflow, duplicate IDs or page errors. Menu interactions work; all 75 status marks render. Seven staff redirect checks pass, including `/staff/expectations.html#individual-contributor`. Evidence and the runnable local harness are under `/tmp/handbook-restructure-evidence/` and `/tmp/handbook-restructure-browser.mjs`.
- Built Markdown exports retain planned/under-construction statuses, current chapter order and new Staff links. `git diff --check` passes.
- Independent code review found a bookmark-loss defect in the original redirect stubs. The regression test failed before the fix and passes after it; the final browser check confirms closure. Review receipt: `/tmp/compound-engineering-1000/ce-code-review/20261009-124850-14e35268/review.json`; applied finding #1 and final verification are recorded in `closure.json`, with no unresolved review findings. No lint or standalone typecheck command is configured; VitePress compilation supplies the Vue/TypeScript build check.

Remaining: C1–C7 and D2–D6 need integration with the concurrent slide work; F2 needs explicit published-deck mappings; E5 needs Rohan's outline review. G1 needs resolved image licences, and G2 needs source reconciliation and a coordinated move of the DNA speech, which remains the slide deck's active source. No slide files, loose image inputs or local tool state were changed by this restructuring work. Changes remain uncommitted in the shared feature branch.

## Completed locally

| Increment | Deliverable | State |
| --- | --- | --- |
| Inventory | `maintenance/content-map.md`: 38 legacy pages, movable blocks, root documents, archives, all four 10-2 inputs | Inventoried; dispositions proposed |
| Tech pilot | 3.4 Department-specific guidance; A.2.5 canonical tech agenda | Draft primer; agenda explicitly proposed |
| Staff expectations | 3.1 Expectations; A.1.2 IC, A.1.3 DRI, A.1.4 PC canonical rubrics | Draft; all 45 evaluative cells preserved from supplied source |
| Diagram standard | SVG assets, style/contributor rules, responsive frame, accessible descriptions and text equivalents | Implemented; existing Mermaid support retained |
| Introduction | 0 landing, 0.1 Welcome, 0.2 How the handbook works; navigation and retained-fragment mappings | Draft; audience/Fellowship and reviewer questions visible |
| DNA Strategy | 1 chapter landing; 1.2 Strategy and six subsections; shared flywheel and retained-fragment mappings | Draft; strategic targets and review decisions open |
| Structural pilot | Ordered 11-page TOC; named-block rubric inclusion; shared HTML/export resolver; raw page metadata | Implemented; full numbering, catalogs/glossary and search deduplication pending |
| Transitional tooling | New navigation, numbered metadata validation, section support in HTML/LLM indexes, exported diagram URLs | Implemented alongside legacy pages |

The 10-2 material is helpful implementation input. Original source files remain intact. The handbook outline remains authoritative for placement; the implemented expectations subsections align with its IC/DRI/PC/mixed-role/evaluation order.

## Verification

- `npm run docs:check`: 43 pages, zero errors or warnings; 2 published SVGs, zero errors.
- `npm run docs:build`: VitePress 1.6.4 production build passes.
- Validator fixtures cover numbered page metadata, duplicate IDs/numbers, title prefix mismatch, invalid/leap dates, and Summary warnings.
- SVG fixtures cover a valid asset, missing description, bad viewBox, scripts, and external resources.
- Rubric table comparisons confirm all source headers/rows/cells preserved; IC and PC weightings remain suggested, and no DRI weighting was supplied or added.
- Built-output checks cover all six HTML/Markdown pages, diagram copying and `/docs/` asset URLs, Staff/Reference materials LLM sections, dates/status, and diagram text equivalents.
- `git diff --check` passes.

Browser-based desktop/mobile visual inspection remains pending. XML and build checks do not establish visual legibility. The user subsequently authorized publication of these increments. Policy adoption and full migration completion remain pending; the published pages retain draft status.

## Next bounded increments

1. Pilot an ordered TOC registry and canonical reference inclusion, including failure cases, status/date attribution, stable anchors, and identical Markdown exports. Rubric bodies now resolve from canonical blocks; remaining agenda/reference conversions are pending.
2. Continue DNA/Leadership migration using the ledger; Introduction and DNA Strategy drafts are already published. Preserve source dates for unchanged passages and retain old routes until complete reconciliation.
3. Add resource/citation records and glossary generation after the pilot; verify named external influences before using them as evidence.
4. Resolve staff review administration, compensation, governance, and tech meeting ownership through user-supplied organizational decisions. Keep independent drafting moving while particular inputs remain open.
5. **Restructure the repository file layout.** Consolidate redundant and superseded material: root planning docs (`AI-READABILITY-PLAN.md`, `REWRITE-PLAN.md`, `HANDBOOK-REVIEW.md`, `DESIGN-REVIEW.md`, `PROGRESS.md`, `docs.md`, etc.), `archive/`, legacy `docs/` routes once fully reconciled in the ledger, and the `10-2 content additions/` inputs. Target: `docs/` holds only the numbered handbook plus redirects; planning/history moves under `maintenance/` or `archive/`; one README explains the layout. Audit first (keep/move/merge/delete per file, with inbound links and redirects), then move in small verified batches. Do not delete source originals or legacy routes without a recorded disposition and redirect.
6. **De-emphasize Fellow / Steward / Lead.** “Organizer” is the supercategory. Map legacy terms once, in 1.4 Structure (`#organizers-and-role-types`): Fellows → Individual Contributors, Stewards → domain owners (DRIs), Leads → Player-Coaches, using the definitions in 3.1 Expectations. Elsewhere use “organizer” and IC/DRI/PC; glossary keeps legacy terms as pointers. Sweep all pages, nav and audience paths before legacy routes retire.

Continue recording actual destinations and reconciled blocks in the ledger. Retire old pages only once their complete dispositions and compatibility paths are verified.

## October 2 continuation — Introduction batch

Added three orientation drafts with stable anchors and source provenance; recorded source-to-destination block mappings without retiring legacy routes. Content-only authoring and static navigation additions use the existing validator/build as replacement verification; no new runtime feature or prose-mirroring tests. Ordered TOC, reference embeds, catalogs and generated glossary remain pending.

Batch checks: `npm run docs:check` passed (46 pages, zero errors/warnings; 2 SVGs valid); `npm run docs:build` passed. Built HTML anchors, dates/status and raw/combined prose exports checked. Raw twins omit frontmatter under existing exporter behavior; metadata parity remains part of the pending structural pilot. Browser visual inspection remains pending.

## October 2 continuation — DNA Strategy batch

Added a chapter landing and strategy draft from existing movement guidance and October 2 tech notes. Kept strategy as belief, growth as ambition, and tool labels as conceptual. Practical guides stay linked at their existing routes. No new runtime logic; existing validation/build and generated-output inspection provide verification. Structural TOC/embed pilot remains the next technical increment.

DNA batch verification: `npm run docs:check` passed (48 pages, zero errors/warnings; 2 SVGs valid); production build passed. Checked all five new pages’ anchors, linked fragments, HTML date/status, Markdown prose exports and flywheel `/docs/` URL. Code review: lite correctness review completed without actionable findings for both batches. User edits to `10-2 content additions/10-2.txt` during this run are excluded from commits.

## October 2 continuation — site cleanup

User authorized including the pre-existing site changes: shared pilot navigation, compact More menu, homepage reading cards, consolidated status badge, dark-mode card colors and responsive typography. Removed HomePaths component and its matching configuration/styles. Local docs checks (48 pages) and production build pass; independent correctness review found no actionable regressions. Browser checks remain pending. The cleanup hides the metadata date on narrow screens; the structural pilot will restore date visibility to meet the handbook date requirement. Source-note edits remain excluded.

## October 2 continuation — TOC and canonical references

Added an ordered registry for all 11 numbered pages, shared navigation/export ordering and coverage checks. Three rubric tables remain authored only in Appendix A; Expectations resolves each beside its role explanation, and tech guidance resolves the same IC source. Embeds display canonical source title/link, status and date. Relative links and headings adapt to each host; nested inclusion is rejected. Raw Markdown twins now include source/status/date.

Independent review found two anchor issues, both fixed: validation now expands anchors before checking links; emitted IDs remain unique even when natural suffixes and host IDs collide. All 12 actual test cases pass with subprocess execution enabled, including validator integration. Initial sandboxed `node --test` output listed test files without running their cases; those counts are not used as evidence. Mobile/desktop preview at 390, 960 and 1440px passed after restarting a stale preview; dates remain visible and tables scroll within the page. Further output/parity and final build checks are recorded below before publication.

The user’s continuing site additions (number styling, search button/search relevance, not-found navigation, clipboard link feedback and responsive styles) are integrated with the authorized site changes. Supplied source-note edits remain excluded. No policy adoption is implied.

Final output checks confirm unchanged canonical table text in host raw Markdown and combined exports, correctly based source links, visible draft attribution and registry export order. Homepage now links to Introduction, displays its editorial date and avoids defining staff by a legacy Lead reading path. Existing VitePress 1.6.4 home-content hydration logs a viewport-offset style warning; it originates in `VPHomeContent.vue`, and the default CSS fallback remains in use. This does not block page rendering or search. Resource/citation/glossary pilot and canonical-only search deduplication remain later work.

The fixture test command is `node --test scripts/handbook-*.test.mjs`, wired directly into Pages CI. New unrelated package/dependency edits appeared during integration; `package.json` and `package-lock.json` are left uncommitted together, along with the source-note edits.

## October 2 continuation — DNA Culture and canonical standards

Added 1.3 Culture and A.1.1 Values-related standards, red lines, and reporting; registered both in the ordered TOC (13 numbered pages). Existing leadership standards, red lines/reporting, and representation wording now have one authoring home in A.1.1. Both Culture and the legacy values page include those canonical blocks. Legacy routes and heading anchors remain intact. Existing policy bodies were relocated verbatim, retaining adopted status and September 27 content date; the Culture rewrite remains draft. Reporting gaps and distinctive-culture questions remain visible.

No runtime implementation changed. Existing inclusion tests and validator/build/output checks replace prose-mirroring tests; the registry coverage test count was updated. `npm run docs:check` passed: 51 pages, zero errors/warnings, two valid SVGs. Production build passed. All 12 handbook tests passed with subprocess permissions enabled; sandbox-only integration execution fails with `spawnSync EPERM` and is not counted as a passing run. Verified all three canonical bodies against HEAD, export parity across Culture, legacy values, canonical source and combined Markdown (allowing the established callout normalization), source attribution, dates, and new/legacy HTML anchors. Scoped diff whitespace check passed; an unrelated source-note EOF warning remains untouched.

Local changes remain uncommitted and unpublished. Other ongoing theme, export, dependency, source-note, and CI edits were preserved. Resource/citation/glossary generation and remaining DNA/Leadership migration are still pending.

Browser checks passed at 390px and 1440px for Culture, A.1.1, and legacy values: visible page dates and no horizontal overflow. Manual diff review checked policy-body preservation, registry ordering, legacy anchors, metadata status/date, and unresolved-policy wording; no actionable issue found.

## October 2 continuation — DNA completion and Leadership start

Agents drafted 1.1 Story, 1.4 Structure, 2 Leadership landing and 2.1 Culture in leadership. Registry (17 numbered pages), DNA landing list and registry test count were integrated centrally; ledger rows were appended to `content-map.md`. All pages are draft; open inputs are visible callouts. The DNA chapter now has all four sections. Legacy routes remain unchanged.

Verification: `npm run docs:check` 55 pages, 0 errors/warnings, 2 SVGs valid. All 12 handbook tests pass (run unsandboxed). Production build passes. A.1.1 `leadership-standards` resolves in both 2.1 HTML and raw Markdown. Scoped `git diff --check` is clean. Browser visual check not run for this batch.

Next: 2.2 Strategic planning, 2.3 People, 2.4 Facilitation; 3.0 Beliefs about staff; file-structure audit (roadmap item 5); then resource/citation/glossary pilot.

## October 2 continuation — Leadership 2.2–2.4 and file-structure audit

Published `ca7fdc6` (DNA 1.1–1.4, Leadership 2/2.1, A.1.1). Agents then drafted 2.2 Strategic planning, 2.3 People and 2.4 Facilitation; the Leadership chapter now has all four sections. Registry has 20 numbered pages; landing links updated; one paraphrased facilitation sentence restored to source wording. Ledger rows appended.

Verification: `docs:check` 58 pages, 0 errors/warnings; 12/12 tests pass; production build passes; scoped `git diff --check` clean. Browser check not run.

Roadmap item 5 audit landed in `maintenance/file-structure-audit.md` (proposal only; nothing moved). Key points: build a redirect mechanism first (none exists in `config.mts`); move root planning/history docs to `maintenance/history/`; delete pointer stubs `docs.md` and `Fellowship Handbook [shared].md` after folding pointers into README; move outline/style guide separately with link rewrites; keep `10-2 content additions/` until DNA/Leadership/Staff reconciliation. Its open decisions need the user.

Superseded by the next section.

## October 2 continuation — Staff chapter drafts and restructure batch 1

User delegated the file-structure decisions; recorded in `decisions.md` (“File-structure decisions”). Restructure batch 1 done: root history docs moved to `maintenance/history/`; outline and implementation plan moved to `maintenance/` with inbound links rewritten; pointer stubs and unused `scripts/check-rewrite.py` deleted; README gained a repository-layout section; `.aws/`, `.agents/`, `.codex/` ignored. Redirect stubs deferred to the first legacy-route retirement.

Agents drafted 3.0 Beliefs about staff, 3.2 Compensation and 3.3 Professional development (mostly open callouts). Staff chapter now has 3.0–3.4. Registry: 23 numbered pages.

Verification: `docs:check` 61 pages, 0 errors/warnings; 12/12 tests; production build passes. Browser check not run.

Next: Appendix A remaining references (A.2.x agendas/templates, A.3 prompts, A.4 style); restructure batch 2 (redirect generator + first legacy-route retirements where ledger rows are complete); resource/citation/glossary pilot (B/C/D).

## October 2 continuation — complete structure and incorporate legacy content

User: commit everything; mark anything needing their input as **Under construction** with bullets; ensure existing information is incorporated into the new structure and the structure is set. Committed the versioning/downloads/reading-progress work (`4076a8f`). The `::: clarify` label is renamed “Under construction”. Brief for agents: `maintenance/migration-brief.md`. Five agents are building 0.3 + D glossary, full legacy fold-in for DNA/Leadership, Appendix A references, A.2.6 field guides, and Appendices B and C. Next: integrate the TOC, group the sidebar by section, generate redirect stubs for legacy routes, then retire the legacy pages.

Result (`f84c354`): every outline unit has a page; all 37 legacy pages retired after a heading/URL comparison found no missing substance; their routes redirect via `handbook-data/redirects.json` (static stubs generated at build, validated in `docs:check`). Sidebar grouped by chapter; homepage and nav point at the numbered handbook. Fellow/Steward/Lead removed from headings and menus; mapping lives in 1.4.4.

## October 2 continuation — readability flattening and Supplemental chapter

User: no sub-sub-sections; at most three number levels (2.1.1); prefer paragraphs; optimize for skimmability. Rules in `maintenance/flatten-brief.md`. Four agents flattened all pages: numbered H3s became bold lead-ins; appendix pages' H2s are unnumbered; boilerplate “In brief / When to use this” headings folded into Summaries. Field guides renumbered A.2.6–A.2.10 (index page folded into the Appendix A landing). Removed anchors mapped to surviving headings across all links and redirects. Added chapter 4 Supplemental (4.1 Fundraising, 4.2 Interviewing, 4.3 Media, 4.4 Running for office), all Under construction.

Verification: 62 numbered pages, max number depth 3, no 4-level numbers in headings or prose; `docs:check` 63 pages 0 errors/warnings; 19/19 tests; production build passes with redirect stubs. Browser check not run.

Remaining roadmap: user's full review of Under construction items; glossary generation and citation records (B/C/D); possible further merges (1.2.2–1.2.4 Act/Recruit/Train are short separate H2s; 1.4.6 is long); terminology sweep of body prose.

## 2026-10-02: Navigation, readability, and publishability pass

Done:

- **Chapter navigation replaces role-based routing.** The supporter, member, and organizer entry points are gone. The navbar reads Start here · DNA · Lead · Staff · More. The home page is a contents map built from `toc.json` by `ChapterMap.vue`. Labels live in `CHAPTER_LABELS` and `SHORT_TITLES` in `scripts/handbook-toc.mjs`.
- **Sidebar.** Chapter headers are bold "N. Title" links, with no duplicated index item. Numbers sit in an aligned column. A separate "Appendices" block holds A–D, and Appendix A is grouped into A.1–A.4.
- **Readability.** Table type and mobile scrolling, heading rhythm, list spacing, the mobile eyebrow, and the "On this page" outline are fixed. The noisy "Draft" badge is removed.
- **Under construction.** Frontmatter `status: under-construction` plus `construction_note` renders a banner at the top of the page through `PageMeta.vue`. The validator accepts the status.
- **Content cleanup.** All 97 visible `::: clarify` editor notes and other meta sentences are removed from pages and preserved in `maintenance/open-questions.md`. Duplicated definitions are condensed. Incomplete pages are flagged as under construction.
- **A.2.5 Tech team meeting agenda** is rewritten from `10-2 content additions/Tech Team Notes(1).md`. It covers the full two-week cycle: Sprint Planning, Governance, 1:1, Sprint Check, All-Hands, and Demo Day, and is cross-linked with A.2.3, A.2.4, 2.4, and 3.4.

Next:

1. **Merge the Introduction into one page.** Fold 0.1 Welcome and 0.3 Getting involved into `/introduction/` and retire 0.2 How the handbook works. Update `toc.json`, add redirects for the retired routes, and repoint inbound links. Known inbound links: the glossary, fellowship-agreement, dna/story, dna/structure, changelog, and 10 entries in `redirects.json`. The anchors include `#find-anything`, `#where-to-start-as-an-organizer`, `#volunteer-and-fellowship-pathways`, `#finding-current-people-and-projects`, and `#where-authoritative-information-lives`.
2. **Renumber appendices with Roman numerals.** A→I, B→II, C→III, D→IV across `toc.json`, headings, `handbook_number`, and in-text references. Widen `HANDBOOK_NUMBER` in `scripts/validate-docs.mjs`. The nav, sidebar, and home code already derive numbers from `toc.json`.
3. **Remaining de-duplication.** Repeated Atlas source callouts, the 0.3.2 first-weeks table, "source guide" phrasing in A.2.6–A.2.9, adoption caveats on A.1.2–A.1.4, and repeated "Unverified" lines in citations.
4. **Changelog and version.** Add a changelog entry and bump the version for this pass.
5. **Visual check.** Inspect the under-construction banner and the restyled tables in a browser at 390px and 1440px, in light and dark modes. The banner has been checked only as far as building successfully.
6. **Decisions needed.** Whether the tech sprint cycle (A.2.5) is adopted. Whether the Fellow rubric and attendance rule from the tech notes become policy.
