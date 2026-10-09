# Handbook restructuring: current implementation plan

Last updated: 2026-10-09

[The restructuring TODO](../TODO.md) owns the current requirements and completion checkboxes. This plan consolidates their execution order and the still-relevant directory decisions from the October 2 plans. The October 9 chapter order supersedes the older outline's chapter numbering. Historical plans and progress entries are not a second backlog.

## Work first on the shared structure

The highest-leverage increment is A + B + E: establish the chapter order, stable page identities, status metadata and planned pages together. Every navigation view and later slides integration relies on these. Update the TOC, validators and pages before polishing the theme or generating decks.

The current chapter contract is **0 Start here, 1 DNA, 2 Go deeper, 3 Lead, 4 Train others, 5 Supplemental**, followed by the appendices. Staff becomes an appendix; existing Reference, Further reading and Citations remain. Preserve stable page IDs when numbering changes. Add redirects for retired routes and anchors, and rewrite internal links to their new canonical destinations.

Another agent is actively editing the DNA presentation under `slides/`. Keep that directory, its JSON, assets and renderer available in place until that work is coordinated. C1/C2 and changes to the renderer or generation CLI depend on that coordination. Independent handbook work and formula documentation can proceed.

## Execution sequence

| TODO scope | Work and dependency | Evidence needed before marking complete |
| --- | --- | --- |
| A1–A5 | Rewrite `handbook-data/toc.json`; align chapter labels and navigation; move Staff into the appendices; renumber Lead; fix metadata, headings, anchors, links and contributor documentation. Keep the redirect registry authoritative for old URLs. | TOC/page agreement, useful destinations for old routes and fragments, updated chapter references. |
| B1–B4 | Add `planned`; derive status emoji from frontmatter in the sidebar, home chapter map and handbook guide. Map adopted/reference → ✅, draft → 📝, under-construction → 🚧, planned → ⬜. Show construction notes and a legend. | Status-agreement test and rendered metadata from the same source. |
| E1–E4 | Create planned Go deeper and Train others skeletons; keep the four Supplemental pages with accurate statuses; update the Start here welcome. Link existing organizer-conversation and training-organizer material instead of duplicating it. | One-paragraph purpose and intended headings on each stub; links resolve; no invented substantive curriculum. |
| A6 | Run `npm run docs:check` and `node --test scripts/handbook-*.test.mjs` after integrating structure, status and page changes. | Actual passing command output, including redirect checks. |
| E5 | Compare skeleton scope with *This Is an Uprising* and Momentum training material, then review with Rohan before filling it in. | Verified source notes and Rohan's review; skeleton creation alone does not complete this item. |
| C1–C7 | Once coordinated with the slide editor, move the renderer to `slides/`; add origin/approval/coverage metadata; validate explicit module/deck mappings; publish eligible decks and notes; add module buttons and a Slides index. | Handcrafted drafts stay hidden until approved; generated decks are labelled; browser checks include published paths and notes-window synchronization. |
| D1 | Document the deterministic formula in [generated-slides.md](generated-slides.md). | Formula matches existing layout capacities and source-coverage rules. Documentation is complete; the generator remains a separate task. |
| D2–D5 | Implement deterministic generation, visible generated footers, strict validation and regeneration at build time. Skip any module with a handcrafted deck. Depends on C metadata and coordinated renderer work. | Identical source/settings produce identical deck JSON; all source lines accounted for; no runtime AI or silent truncation. |
| D6 | Generate starter decks for Lead and one Go deeper page; review with Rohan. | Review records and resulting formula changes; unreviewed output is not completion. |
| F1–F4 | Review home/chapter/sidebar presentation; add a Trainings view; improve spacing, typography, callouts and headers using the slide palette. Integrate after structure stabilizes. | Findings tied to actual pages; mobile and dark-mode checks. |
| G1–G2 | Reconcile loose image assets and `10-2 content additions/` with source/licence records and the handbook. Retire inputs only after dispositions and provenance links are recorded. Coordinate anything owned by the slide editor. | Licence/source entries, content ledger reconciliation, working provenance links. |
| G3 | Replace conflicting current plans with this plan and preserve their original text in `maintenance/history/`. Keep short pointers at old paths used by provenance and progress records. | Supersession map below; archived source text retained. |
| G4 | Keep local tool state ignored and out of tracked source. | Evidence below; already satisfied by repository configuration. |
| G5 | Update README's repository layout to the actual integrated result. | Accurate live paths; describe `slides/` only once C1 has actually moved it. |

The table is a dependency plan, not a claim that every item has been implemented. [TODO.md](../TODO.md) records the reviewed completion state; verification belongs to the integrating agent.

## Directory and authoring decisions carried forward

- Keep `README.md`, `CONTRIBUTING.md` and `STYLE-GUIDE.md` at the root as contributor entry points. Put planning and handbook-maintenance records in `maintenance/`.
- Keep original sources under `archive/sources/`; preserve externally useful paths. `10-2 content additions/` remains source input until reconciliation and provenance are complete. A requested retirement is not evidence of reconciliation.
- Keep `handbook-data/toc.json` as the ordered identity/numbering registry and `handbook-data/redirects.json` as the old-route registry. Handbook source frontmatter owns page status and explicit deck mappings.
- Preserve the readability contract: at most three number levels, numbered H2s on two-level section pages, unnumbered H2s on three-level appendix pages, and paragraphs rather than extra nested headings. Preserve substance and route/anchor destinations when flattening.
- Keep policies and reusable definitions at their canonical source; inclusion and generated exports are derived views. Do not invent policies, approval, ownership, dates or source claims. Keep planned and incomplete material visibly labelled.
- Preserve actual editorial dates through moves. A fresh build does not mean fresh content.

## Supersession and provenance

| Previous path | Current role | Archived original |
| --- | --- | --- |
| `maintenance/HANDBOOK-OUTLINE.md` | Short pointer; the October 9 chapter contract supersedes the earlier placement proposals. | [Original October 2 outline](history/HANDBOOK-OUTLINE.md) |
| `maintenance/HANDBOOK-IMPLEMENTATION-PLAN.md` | This current plan replaces the October 2 execution sequence and numbering proposals. | [October 2 implementation plan](history/HANDBOOK-IMPLEMENTATION-PLAN.md) |
| `maintenance/file-structure-audit.md` | Short pointer; audit findings and remaining cleanup are consolidated here and in TODO G. | [Original file-structure audit](history/file-structure-audit.md) |
| `maintenance/migration-brief.md` | Short pointer; records provenance for the completed October 2 migration. | [Original migration brief](history/migration-brief.md) |
| `maintenance/flatten-brief.md` | Short pointer; lasting readability rules are summarized above. | [Original flatten brief](history/flatten-brief.md) |

Archived originals retain their source text, including paths and relative links as written at their original locations. Their proposals, status reports and paths describe that historical checkout; they do not govern new work. Existing earlier review/rewrite files in `history/` remain historical. `content-map.md`, `decisions.md`, `implementation-progress.md` and `open-questions.md` retain their distinct roles as reconciliation ledger, decision record, chronological evidence and unresolved content questions. The DNA renderer plan in `maintenance/plans/` remains available to the concurrent slide editor.

## Local tool state: G4 evidence

The repository's [.gitignore](../.gitignore) already contains `.aws/`, `.agents/` and `.codex/` under “Local tool state”. The [October 2 file-structure decisions](decisions.md#file-structure-decisions--2026-10-02) record their intended exclusion from source control.

Checked on 2026-10-09:

```text
git ls-files .agents .codex .aws
→ no tracked paths

git check-ignore .agents .codex .aws
→ .agents
→ .codex
→ .aws
```

These directories are local state and do not belong in handbook source. Ignore rules already satisfy G4; no directory contents were inspected, moved or deleted.
