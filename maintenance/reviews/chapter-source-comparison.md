# Chapter-to-source comparison and content-organisation audit

Date: 2026-10-09. Scope: task E5 (planned chapters 2 Go deeper and 4 Train others) plus a content-organisation audit of `docs/`. Research and recommendations only. No `docs/`, `scripts/`, `slides/`, `handbook-data/` or `TODO.md` file was changed, and none of the skeleton pages were filled in. All outlines below are proposals for Rohan's review.

No earlier `chapter-source-comparison.md` existed in `maintenance/`, so this is a new file. Related existing files: `content-map.md`, `file-structure-audit.md`, `layout-review.md`. Several `maintenance/*.md` files also have differing copies under `maintenance/history/` (see O6).

## Part 1. Source comparison

### 1.1 Verification status of the sources

| Claim | Status | Source |
| --- | --- | --- |
| *This Is an Uprising* presents nonviolent uprising as a learnable craft, not spontaneous eruption; 10th anniversary edition (2026) | Verified (publisher/author page) | https://thisisanuprising.org/about/ |
| Momentum's hybrid model combines structure-based organizing and mass protest | Verified | https://www.momentumcommunity.org/momentum-model |
| Cycle of momentum: escalation, absorption ("elevator of engagement"), active popular support | Verified | same |
| Movement DNA = story, strategy, structure, culture; "frontloading" for 3-5 year cycles | Verified | same |
| Momentum 101 (fundamentals of hybrid organizing, social change approaches, historical lessons, ideology, organizing building blocks, strategic leadership; three virtual days) and 201 (advanced frameworks, political context analysis, ideology; three days in person) | Verified | https://www.momentumcommunity.org/momentum-training-cohort |
| Trainer cohort: up to 25 trainers, lead/assistant lead/trainer roles, 6-8 week prep cycles, coached run-throughs, team rehearsals, post-training debriefs, monthly cohort calls | Verified | same |
| Trigger events ("moments of the whirlwind") shock people out of routine; need a "landing pad"/absorption | Verified in secondary sources | https://whirlwindinstitute.org/momentum-mass-protest/ , https://wagingnonviolence.org/2016/03/using-momentum-to-build-a-stronger-movement/ (search snippets only; pages not opened) |
| Dilemma actions put the opponent in a lose-lose position | Verified in search snippet only | https://commonslibrary.org/movement-power-the-science-of-nonviolent-direct-action/ , theecologist.org Movement Power series |
| Spectrum of allies / pillars of support as the movement's target map (movement, active allies, neutrals, opponents) | Verified in search snippet only | same Ecologist series; spectrum-of-allies is also an older (Training for Change / Bill Moyer-lineage) tool, not original to the Englers |
| "Momentum-driven organizing" vs "mobilizing" vs "structure-based organizing" as three named models in the book | Partly verified. Momentum site verifies structure-based vs mass protest and the hybrid. The three-way "mobilizing / organizing / momentum" contrast is from my background knowledge of the book and is not verified online. | |
| S-curve of movement growth as a named framework in the book | NOT VERIFIED. No fetched source mentions it. The 3.5% figure and S-shaped growth are usually attributed to Chenoweth and to Bill Moyer's Movement Action Plan (already listed in B.4.2), and I could not confirm Momentum teaches it under this name. Treat 2.2.1 as unverified in provenance until a source is chosen. | |
| Book chapter list / table of contents | NOT VERIFIED. Author site, publisher and library pages returned no chapter list. Do not cite chapter titles. | |
| Momentum's public video list (`/videos`) | NOT VERIFIED. Page returned HTTP 401 to fetch. The skeleton's claims about it (index pages) are unchecked by me. | |

Note: the handbook already hedges correctly ("not a verified reproduction of Momentum's full curriculum"). Keep that language until the S-curve and video list are checked by a person with access.

### 1.2 What the sources emphasise vs the skeletons

Momentum's own teaching order, as verifiable: why movements (history, social change approaches), the hybrid model and the momentum cycle, then the four DNA elements (story, strategy, structure, culture), then building blocks and leadership. The handbook's chapter 1 DNA already mirrors story/strategy/culture/structure, which is a strong match. Chapter 2 should therefore be framed as the "why and how it works" layer under 1.2 Strategy, not a separate curriculum.

### 1.3 Chapter 2 Go deeper: gaps, ordering, redundancy

Current: 2.1 Why nonviolence works (3 headings), 2.2 Strategy deep dive (5), 2.3 AI safety deep dive (4), 2.4 The organizer conversation (3).

Gaps (relative to the sources):
1. Structure-based organizing vs mass mobilizing vs momentum is absent. This is the central argument of the book and of Momentum's hybrid model, and it is what links 1.2's act/recruit/train cycle to a theory. Currently only mentioned in the chapter index "sources" note.
2. Escalation, absorption and the "elevator of engagement" (Momentum's cycle) are absent from 2.2. 2.2.5 "Connect action to recruitment and training" is a partial placeholder for absorption but unnamed, and it sits last when absorption is the point of trigger moments.
3. Pillars of support / loyalty shifts and withdrawal of consent are the mechanism behind "power, cooperation, and disruption" in 2.1.2 but not named. Relevant source term: pillars of support.
4. Frontloading (prepare people, structure and narrative before a trigger moment) is missing. It connects trigger moments to training (chapter 4) and to 1.4 Structure.
5. Backfire/repression and nonviolent discipline are missing from 2.1 (why nonviolence works includes the question of violent flanks; the evidence page should address this honestly).
6. Limits and criticism of each tool (S-curve as heuristic, not law; dilemma action ethics) are covered only generically in the summary ("limits on when it is useful"), with no heading.
7. Examples/case studies have no home. B.3 Historical movements is empty ("Nothing is listed here yet"), so 2.1.3 and 2.2 will have nowhere to link for cases.

Mis-ordering and redundancy:
- 2.2 order is S-curve, trigger moments, dilemma actions, spectrum of allies, then recruitment. A teaching order that follows the sources is: spectrum of allies (who we are trying to move) -> dilemma actions (how an action moves them) -> trigger moments (when a moment opens) -> S-curve (where in the long arc) -> absorption (what we do with those who join). Alternatively keep S-curve first as the "map" and move the spectrum before dilemma actions. Either way, spectrum of allies should precede dilemma actions, because a dilemma action is defined by its effect on the spectrum.
- 2.1.1 "Participation and public support" and 2.2.4 "Spectrum of allies" overlap (public support). Decide which page owns the concept; recommend 2.1 stays at the mechanism level and 2.2.4 owns the tool.
- 2.1 vs 1.2 "Assumptions" box: the 3.5% target lives in 1.2.6 background; 2.1.3 or 2.2.1 will need to correct/contextualise it (the figure is a descriptive finding, not a threshold). Put the evidence discussion in one place and link the other.
- 2.3 AI safety: outside the Engler/Momentum scope entirely; that is correct, but the skeleton has no heading for "why AI safety needs a movement" separate from "responses". Already covered by 2.3.3. Overlap: 1.1.1 The AI Crisis and B.1 reading list. 2.3.1 "Claims and key terms" will duplicate the glossary (D) and 1.1; recommend linking to D rather than redefining.
- 2.4 The organizer conversation: strongest redundancy in the handbook. Same five steps appear in 3.3.1, A.2.10, A.2.2 (as aids) and 1.2.3 (pointer). A fifth copy must not be written. 2.4 should be exercises and reflection only (headings already say practice/reflect).

Recommended outlines (proposals only; numbering follows the current scheme):

**2.1 Why nonviolence works**
- 2.1.1 Where power comes from: cooperation and pillars of support {#power-and-pillars} (merges current 2.1.2 first half)
- 2.1.2 Why participation and public support grow {#participation-and-public-support}
- 2.1.3 Disruption, discipline, and backfire {#disruption-discipline-backfire}
- 2.1.4 Evidence and its limits {#evidence-and-limits} (cite Chenoweth/Stephan with caveats)
- 2.1.5 Strategic argument vs ethical commitment {#strategic-vs-ethical} (the skeleton summary promises this distinction but no heading carries it)
- Cases: link B.3 once populated

**2.2 Strategy deep dive**
- 2.2.1 Three models: structure-based organizing, mass mobilizing, and the hybrid {#three-models} (new; ties to 1.2 and 1.4)
- 2.2.2 Spectrum of allies {#spectrum-of-allies}
- 2.2.3 Dilemma actions {#dilemma-actions}
- 2.2.4 Trigger moments {#trigger-moments}
- 2.2.5 Escalation and absorption: from moment to movement {#escalation-and-absorption} (replaces current 2.2.5 and links to 1.2.3, A.2.9, chapter 4)
- 2.2.6 The S-curve and where we are on it {#s-curve} (only after source chosen; unverified)
- 2.2.7 Limits and how to test these tools {#limits-and-testing} (links 3.2.4 strategic hypotheses)
Keep the existing anchors #s-curve, #trigger-moments, #dilemma-actions, #spectrum-of-allies unchanged so existing references (slides, llms, redirects) stay valid.

**2.3 AI safety deep dive**: keep four headings; add "Where the evidence is thin" explicitly under 2.3.2 and a link to D and B.1. No change in order. Scope note: no Engler/Momentum source applies.

**2.4 The organizer conversation**: keep three headings. Add one line to the page summary that scripts are NOT repeated here; point to A.2.10 as canonical (as A.2.2 already does). Consider merging into A.2.10/chapter 4 role-play (4.3) if exercises are the only new content (see O4).

### 1.4 Chapter 4 Train others: gaps, ordering, redundancy

Current: 4.1 Designing an agenda, 4.2 Teaching adults, 4.3 Role-plays and simulations, 4.4 Facilitating a room, 4.5 Training trainers, 4.6 Logistics and follow-up (3 headings each).

Comparison with Momentum's verifiable training structure (101/201 tiers; trainer cohort with coached practice, rehearsal and debrief; prep cycles; recruiting for trainings):
- Gap: no page on what is taught. Momentum 101/201 define a curriculum tier (fundamentals vs advanced). The handbook has "Go deeper" content (2.1-2.4) and DNA, but chapter 4 has no "choosing curriculum / training ladder" heading. Suggest adding to 4.1 or index: "Which training for whom" (introductory vs responsibility-holders; A.2.9 already says this in one sentence).
- Gap: recruiting participants and absorbing them after the training (the "elevator of engagement") is only implied in 4.6.2. Name it, tie to 2.2.5 and 1.2.3.
- Gap: training team structure (lead trainer, assistant, small-group facilitators) is only implied in 4.5. Momentum's roles are verified; Sapiens First roles are undecided, so mark as a proposal.
- Gap: remote/virtual vs in-person delivery. Momentum 101 virtual, 201 in person. No handbook heading covers format choice.
- Gap: measurement ("can participants use it, can they teach it?") exists in 1.2.4 and A.2.9 but not in chapter 4; add "Check results" to 4.6.3 (already "Collect feedback") and link 3.2.3 Metrics.
- Gap: values/safety in practice sessions (consent in role-plays, red lines): link 1.3.3 and A.1.1.

Ordering and redundancy:
- 4.4 Facilitating a room vs 3.4 Facilitation: real overlap (participation, timekeeping, outputs). The skeleton already says meeting guidance stays in 3.4; keep, but 3.4.1 already has a "For a learning session..." sentence that should link to 4.4.
- 4.2 Teaching adults sits before 4.3 and 4.4 correctly, but 4.1 Designing an agenda before 4.2 means the learner analysis (4.2.1) comes after designing. Recommended order: teaching adults (who learns) -> designing an agenda -> role-plays -> facilitating -> logistics -> training trainers. Training trainers is the capstone and should be last, after logistics.
- 4.5 and 4.6 overlap on "lessons/feedback": 4.5.3 "keep improving" and 4.6.3 "Collect feedback and hand over lessons" cover the same loop. Assign feedback collection to 4.6.3 only; 4.5 should cover trainer development (observation, coaching, handover).
- All six pages expand A.2.9 (about 400 words, status adopted). Risk: A.2.9 and chapter 4 will say the same things at different depth. Plan A.2.9 as a one-page summary that points into chapter 4 once pages are written; do not duplicate its three headings. (Also: 4.3 and 4.2 both link to #help-people-practice; A.2.9 has only two anchored headings, so 4.1 to 4.4 all point to the same anchor.)

Recommended outline:

**4 Train others (index)**: add a short "Which training, for whom" box and a note that sessions use handbook chapters 1 to 3 as content.
- 4.1 Teaching adults: experience and needs; connect ideas to practice; check understanding
- 4.2 Designing an agenda: choose outcome; sequence explain/show/try/reflect; time and reusable agenda (add flipped-classroom proposal link from A.2.9)
- 4.3 Role-plays and simulations: skill and scenario; roles, consent and participation; debrief and try again
- 4.4 Facilitating a room: unchanged
- 4.5 Logistics and follow-up: prepare people/materials/setting (including virtual vs in person); participants' next steps and absorption; feedback and results
- 4.6 Training trainers: prepare with agenda and source; rehearse, observe, debrief; share responsibility and team roles

Renumbering these would change `handbook_number`, `handbook_id`, paths, titles in `toc.json`, redirects, and links; that is a larger change than headings only. If Rohan prefers not to renumber, keep the existing order and only move the "learner analysis first" point into 4.1.1 (cheap alternative).

### 1.5 Overlap map with existing handbook pages

| Topic | Existing locations | Recommendation |
| --- | --- | --- |
| Organizer conversation five steps | 3.3.1, A.2.10, A.2.2 (aids), 1.2.3 pointer, 3.3.5, 2.4 (planned) | Canonical: A.2.10. 3.3.1 keeps the why. Do not add steps to 2.4. |
| Training guidance | A.2.9, 1.2.4, 3.3.5, 0.3 reading list, 4.x (planned) | Treat A.2.9 as the summary; chapter 4 the full guide |
| Meeting facilitation | 3.4, A.2.3, A.2.4, 4.4 (planned) | 4.4 only for training sessions; cross-link |
| Feedback | 3.1.1, 4.5.2 and 4.6.3 (planned), E.3 | Single source 3.1.1 |
| S-curve / 3.5% | 1.2.6 background only | 2.2 owns evidence; 1.2.6 links |
| Spectrum of allies, Movement Action Plan | B.4.2 reading list only | 2.2.2 should cite B.4.2 |
| Metrics for training | 3.2.3, 1.2.4 | 4.6.3 links, no new metrics |

## Part 2. Content-organisation audit

Method: read `toc.json` against `docs/` front matter and files, built a link graph (inbound `.md` links) for orphans, scanned headings for duplication, and reviewed redirects.

What is consistent: all 75 `toc.json` entries exist on disk and every `docs/**/*.md` except `index.md` and `changelog.md` is in the TOC. Front-matter `title` equals H1 equals `toc.json` title for every page. Nothing is missing from the TOC.

### Findings, prioritised

**P1 (do first)**
- O1. Staff material sits under the `appendices/` path but is Appendix E (and `glossary.md` is Appendix D under `appendices/`, while B and C have their own top-level folders). So Appendix A's folder holds A, D and E, whereas B and C do not. This was a deliberate move (git shows renames, redirects exist for `/staff/*`), but the path no longer matches the letter. Recommend either leave and document, or move D and E into sibling top-level folders `glossary/` and `staff/`. If kept, note it in `STYLE-GUIDE.md` or the file-structure audit. (E.0 numbering starts at zero like C.0 and 0; consistent.)
- O2. Duplicated compensation and rubrics: A.1.5 Compensation policy (placeholder, 114 words) vs E.2 Compensation (355 words, the real draft); A.1.2 to A.1.4 rubrics vs E.1 (transcluded, fine). A.1.5 is the unwritten policy and E.2 explains the factors, so the split is intentional but confusing. Suggest A.1.5 be explicit that it is the future policy and keep the single pointer to E.2.
- O3. The chapter 3 and chapter A provenance comments are stale. Examples: `docs/leadership/people.md` comment refers to "2.3.4", "2.1.4", "2.3.2" (old outline numbers); `docs/leadership/facilitation.md` comment says "A.2.3 and A.2.4 do not exist yet" and refers to "2.4.2" (they exist now). These are only HTML comments but are misleading for the next editor. Low risk fix.

**P2**
- O4. Four near-copies of the organizer conversation (see overlap table). Consider deciding whether 2.4 should exist as its own page or become a section of 4.3 (role-play practice) given it will contain only exercises. If it stays, the content must not restate the five steps.
- O5. Pages in the wrong chapter, arguable:
  - E.4.1 "Tech team: strategy primer" (about 600 words including the company brain and Q4 2026 focus table) is strategy and technology content in a staff department appendix; parts duplicate 1.2.5. Dated "2026 Q4" table is live-record material (the page itself says assignments live in Atlas). Recommend moving the "users and outcomes" and flywheel text to 1.2 or leaving a short pointer, and removing the dated table to Atlas.
  - E.4.2 and A.2.5 Tech team meeting agenda duplicate each other (E.4.2 is a pointer paragraph repeating the six meetings by name; acceptable, but the six meeting names are repeated in three places: E.4.2, A.2.5 table, and 3.4.4/3.4.2 for general formats).
  - 3.2 Strategic planning is 4,493 words (longest chapter 3 page, with seven top-level sections); it contains OKRs, metrics, hypotheses, portfolio, and project execution. Project execution and handoffs (3.2.6) overlaps A.2.1 Planning templates (project scope, plan, update, weekly plan, handoff). Consider splitting 3.2.5 to 3.2.7 into "Projects" or keep the templates in A.2.1 and make 3.2.6 a short pointer.
  - 1.4 Structure is 2,815 words, 6 sections; 1.4.4 Participation, responsibility, and employment (about 50 lines) reads as policy and overlaps 0.3.2 Volunteer and Fellowship pathways and A.1.6 Fellowship agreement. Check for duplicated pathway descriptions.
  - Learning prompts (A.3.2) and "Explore with an LLM" in B index both exist; check they do not diverge.
- O6. `maintenance/` has duplicates: `file-structure-audit.md`, `flatten-brief.md`, `migration-brief.md`, `HANDBOOK-OUTLINE.md`, `HANDBOOK-IMPLEMENTATION-PLAN.md` appear both at top level and in `maintenance/history/` with different content. Confirm the history copies are the frozen originals and that the top-level files are the live versions; consider a one-line header in each saying which.
- O7. Planned-chapter linking is thin. Each of the 11 child pages in chapters 2 and 4, and four of the five chapter 5 pages, has exactly one inbound link (their chapter index). Not orphans but not woven into reading paths. 0.2 and 0.1 link to the chapter indexes only. When filling in pages, add inbound links from 1.2 (to 2.2), 1.1 (to 2.3), 3.3.1 (to 2.4), A.2.9 (to chapter 4), and 3.4 (to 4.4). Currently chapter 5 index is linked only from `introduction/index.md`.

**P3**
- O8. Orphans by inbound link count: `docs/index.md`, `docs/changelog.md`, `docs/introduction/index.md` have no inbound `.md` links (normal for home and log; the intro index is reached from navigation). `docs/slides/index.md` is untracked (git `??`) and not in `toc.json`; it is an intentional generated page but is outside the TOC; confirm it is expected in the build and in `llms`. Single-link pages worth watching: all of `appendices/reference/{website-style-guide,visual-style-guide,other-policies,other-prompts,outreach-templates}.md`, `further-reading/{historical-movements,privacy-and-surveillance}.md`, and four `citations` pages (reachable only from the citations index, which is expected).
- O9. Empty or placeholder pages exposed in the TOC: B.3 Historical movements ("Nothing is listed here yet") and B.1.1 will block 2.1.3 and 2.2 case studies. Prioritise populating B.3 and adding the Engler/Chenoweth/Moyer references before writing chapter 2.
- O10. Naming: `toc.json` titles are consistent with files, but chapter 4 "Train others" uses a verb phrase while others are nouns/verbs ("Start here", "DNA", "Go deeper", "Lead", "Supplemental"); acceptable. "Further Reading" in H1 uses capital R while others in the TOC use sentence case ("B Further Reading" matches toc but not style guide). `how-the-handbook-works.md` says six chapters, the first being "0 Start here" (numbered 0); fine.
- O11. Status mismatch to resolve: A.2.9 is `adopted`, while its target expansions are `planned`; the welcome page tells readers that planned pages "do not yet provide a training curriculum" (good). No action beyond keeping that statement true.

## Part 3. Top recommendations

1. Add a three-models heading ("structure-based organizing, mass mobilizing, and the hybrid") and an "escalation and absorption" heading to 2.2, move spectrum of allies before dilemma actions, and keep existing anchors. This is the biggest gap against both the book and Momentum.
2. Do not publish the S-curve section until a source is chosen; I could not verify it in the book or Momentum material (the 3.5% and S-shape attribution is more commonly Chenoweth and Moyer's Movement Action Plan). Also unverified: the book's table of contents and Momentum's `/videos` list.
3. Populate B.3 Historical movements and B.4 pointers first; chapter 2 cases need a home.
4. Chapter 4: reorder so learner analysis precedes agenda design and training trainers is last; assign feedback to 4.6.3 only; add "which training for whom", virtual vs in person, absorption, and training team roles (mark as proposal). Decide whether to renumber (costly) or only adjust headings (cheap).
5. Treat A.2.10 as the single owner of the five conversation steps; 2.4 gets exercises and reflection only, or is merged into 4.3.
6. Decide the path/letter mismatch for Appendices D and E (O1) and document it.
7. Clean stale provenance comments (O3) and relocate the dated Q4 tech-team table and strategy primer (O5).
8. Add inbound links to planned pages from the pages that will depend on them (O7).
