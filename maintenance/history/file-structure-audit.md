# File structure audit (PROPOSAL)

Status: proposal only; nothing has been moved, merged or deleted. Audit date 2026-10-02, branch `docs/unified-handbook`. Precedes roadmap item 5 in [implementation-progress.md](implementation-progress.md). Inbound references were found by grep across the repo (excluding `node_modules`, `.git`, `dist`).

## 1. Current state

```
README.md, CONTRIBUTING.md        repo entry points (live); CONTRIBUTING links STYLE-GUIDE, OUTLINE
STYLE-GUIDE.md                    authoring rules (live, cited by CONTRIBUTING/README)
HANDBOOK-OUTLINE.md (314 l)       controlling outline (live; cited by docs/ pages)
HANDBOOK-IMPLEMENTATION-PLAN.md   sequencing plan (live planning)
AI-READABILITY-PLAN.md (127)      early plan; cited in validate-docs.mjs comment
REWRITE-PLAN.md (305)             Sept readability rewrite plan; cited by check-rewrite.py docstring
HANDBOOK-REVIEW.md (321)          review snapshot (history)
DESIGN-REVIEW.md (123)            design review snapshot (history)
PROGRESS.md (58)                  2026-09-27 consolidation log (superseded by maintenance/)
docs.md, Fellowship Handbook [shared].md   9-10 line pointer stubs to docs/ and archive/
archive/README.md + sources/      unchanged originals (docs.md 421 l, Fellowship 625 l), 1.1M, outside docs/ root
10-2 content additions/           Oct 2 inputs: 10-2.txt (168 l, user WIP), Tech Team Notes.md, 2 SVGs
maintenance/                      content-map.md (ledger), decisions.md, implementation-progress.md
handbook-data/toc.json            ordered TOC registry (live data)
scripts/                          validate-docs, handbook-toc/references (+tests), validate-diagrams.py, check-rewrite.py, build-book.mjs
.github/workflows/deploy.yml      CI: node --test scripts/handbook-*.test.mjs; docs:check; docs:build; book:build
docs/                             numbered: introduction, dna, leadership, staff, appendices (+reference/*.md x5)
                                  legacy: guide, learning, members, organization, organizers, practices, strategy, supporters, work, find.md, index.md
                                  other: changelog.md (WIP), public/, .vitepress/ (config, theme, version.mjs WIP)
.agents, .codex, .aws             tool/agent config dirs (not audited; confirm gitignore status)
```

## 2. Disposition table (all proposed)

| Path | Category | Proposed action | Inbound refs | Risk |
| --- | --- | --- | --- | --- |
| README.md, CONTRIBUTING.md | live | keep; README becomes the single layout explainer | each other, plans | low |
| STYLE-GUIDE.md | live | keep; later move to `maintenance/` | README, CONTRIBUTING, OUTLINE, plans | med (many links) |
| HANDBOOK-OUTLINE.md | live | keep; later move to `maintenance/` | docs/introduction, docs/dna/strategy, leadership, how-the-handbook-works, README, CONTRIBUTING, STYLE-GUIDE | high (published pages link it) |
| HANDBOOK-IMPLEMENTATION-PLAN.md | planning-history | move to `maintenance/` once item 5 done | OUTLINE, content-map, plans | low |
| AI-READABILITY-PLAN.md | planning-history | archive to `maintenance/history/`; fix comment in validate-docs.mjs | IMPL-PLAN, validate-docs.mjs (comment), maintenance/* | low |
| REWRITE-PLAN.md | planning-history | archive; update docstring in check-rewrite.py | check-rewrite.py, PROGRESS, IMPL-PLAN | low |
| HANDBOOK-REVIEW.md, DESIGN-REVIEW.md | planning-history | archive to `maintenance/history/` | IMPL-PLAN, maintenance/* | low |
| PROGRESS.md | redundant | merge remaining unique decisions into `maintenance/decisions.md`, then archive | plans, style.css (comment match only, verify) | low |
| docs.md, Fellowship Handbook [shared].md | redundant | delete after redirect/README note; originals stay in archive | PROGRESS, IMPL-PLAN, content-map | low (spaces/brackets in name) |
| archive/sources/* | source input | keep unchanged (ledger cites them); relocate to `maintenance/archive/sources/` only with link rewrite | archive/README, content-map | med |
| archive/README.md | source input | merge into the one root README layout section, keep a short pointer | archive sources | low |
| 10-2 content additions/10-2.txt | source input | keep in place until DNA/Leadership/Staff drafts reconcile; then move to `maintenance/archive/inputs/` (user WIP, do not touch now) | docs/dna/strategy.md, docs/staff/expectations.md, reference/*.md, OUTLINE, content-map | high (provenance links) |
| 10-2 .../Tech Team Notes.md, *.svg | source input | same as above; SVGs may be duplicates of `docs/public/diagrams/` (verify hashes) | reference/tech-team-meeting-agenda.md, validate-diagrams? | med |
| maintenance/* | live planning | keep | scripts none; docs none | low |
| handbook-data/toc.json | live tooling | keep | handbook-toc.mjs, config.mts, tests | high |
| scripts/ (all) | live tooling | keep; `check-rewrite.py` is orphaned (not in package.json or CI): decide keep/archive with REWRITE-PLAN | CI, package.json | low |
| scripts/build-book.mjs, docs/changelog.md, docs/.vitepress/version.mjs, theme/components/ReadingProgress.vue | live tooling (uncommitted WIP) | keep, leave to user | package.json `book:build`, CI | n/a |
| docs/introduction, dna, leadership, staff, appendices | live handbook | keep | toc.json, config.mts | n/a |
| docs/index.md | live handbook | keep (rewrite pending ledger) | site root | high |
| docs/guide/*, find.md | legacy pending migration | keep until ledger rows complete; then stub-redirect | content-map, many docs links | high |
| docs/learning/*, members, organization, organizers, practices, strategy, supporters, work | legacy pending migration | keep; retire per ledger rows only after destinations exist (Metrics, Feedback, Atlas pages not yet drafted) | cross-links among legacy pages, config nav | high |
| docs/appendices/reference/values-standards.md | live handbook? | confirm whether registered in toc.json (not mentioned in 10-2 refs) | toc.json | low |
| docs/public/ | live tooling | keep | config head, pages | low |
| .agents / .codex / .aws | tooling (non-handbook) | confirm tracked vs ignored; do not touch | none found | unknown |

## 3. Proposed target layout

```
README.md                 single explainer of layout + how to contribute
CONTRIBUTING.md
docs/                     numbered handbook + public/ + .vitepress/ + redirect stubs only
handbook-data/toc.json
scripts/                  tooling + tests
maintenance/
  content-map.md, decisions.md, implementation-progress.md, file-structure-audit.md
  STYLE-GUIDE.md, HANDBOOK-OUTLINE.md, HANDBOOK-IMPLEMENTATION-PLAN.md   (live governance)
  history/                AI-READABILITY-PLAN, REWRITE-PLAN, HANDBOOK-REVIEW, DESIGN-REVIEW, PROGRESS
  archive/sources/        original docs.md and Fellowship handbook
  archive/inputs/         10-2 content additions (after reconciliation)
```

Note: there is no redirect mechanism today (`config.mts` has no `rewrites`; `cleanUrls: true`). Retiring any legacy route needs a new mechanism first (static stub pages with meta refresh, or a build-time generated redirect list from a registry in `maintenance/`).

## 4. Ordered batches (each small, one commit by the user)

Common verification: `node --test scripts/handbook-*.test.mjs`, `npm run docs:check` (zero errors), `npm run docs:build`, then grep for the old filename returning zero stale hits.

1. Redirect groundwork (no moves): add and test a redirect-stub mechanism and a legacy-route registry in `maintenance/`. Verify: build emits a stub for a test route; docs:check passes.
2. Root pointer stubs: delete `docs.md` and `Fellowship Handbook [shared].md` after folding their pointers into README; update PROGRESS/IMPL-PLAN/content-map references. Verify: grep for both names; archive links still resolve.
3. History move: AI-READABILITY-PLAN, REWRITE-PLAN, HANDBOOK-REVIEW, DESIGN-REVIEW, PROGRESS to `maintenance/history/`; update relative links inside them and the comments in `validate-docs.mjs` / `check-rewrite.py`. Verify: tests, docs:check, grep.
4. Governance move: STYLE-GUIDE, HANDBOOK-OUTLINE, IMPLEMENTATION-PLAN to `maintenance/`. HANDBOOK-OUTLINE is linked from published pages, so rewrite those links (introduction/index, how-the-handbook-works, dna/strategy, leadership/culture-in-leadership) and CONTRIBUTING/README. Verify: docs:check link check, built HTML for the four pages, raw Markdown exports.
5. Archive relocation: `archive/` to `maintenance/archive/sources/`, merge archive/README into README; update content-map links. Verify: link check over maintenance files (docs:check does not cover them: run a one-off grep/markdown link check).
6. 10-2 inputs: after DNA/Leadership/Staff reconciliation is recorded in the ledger, move to `maintenance/archive/inputs/`; update the five docs pages and OUTLINE provenance links. Blocked on user WIP.
7. Legacy route retirement, one chapter group per batch, in ledger order (guide, learning, members, organization, organizers, practices, strategy, supporters, work, find). Each: destination exists, ledger row marked done, stub redirect added, internal links repointed, nav in `config.mts` updated. Verify: docs:check, build, built old URL returns a redirect stub, external-link sampling.
8. Final: README layout section, remove orphan scripts if unused, update CONTRIBUTING paths and CI if any path changed.

## 5. Decisions needed from the user

1. Should governance docs (STYLE-GUIDE, OUTLINE, IMPLEMENTATION-PLAN) stay at the root for visibility or move under `maintenance/`?
2. Is `archive/sources/` required to stay at its public URL/path (e.g. linked from outside the repo, the old Google Docs, or the GitHub URL)? If so keep it at root.
3. Redirect mechanism for retired legacy routes: static stub pages, host-level redirects, or a VitePress plugin? Do old URLs have external inbound links that must keep working?
4. Is `scripts/check-rewrite.py` still wanted (it is in neither CI nor package.json)?
5. When may `10-2 content additions/` be moved: after which chapters are considered reconciled? Are the two SVGs duplicates of `docs/public/diagrams/`?
6. Are `.agents`, `.codex`, `.aws` intentionally tracked or local only (gitignore)?
7. Is `docs/appendices/reference/values-standards.md` meant to be in the numbered handbook or legacy?
8. Delete `PROGRESS.md` after merging, or keep it in `history/` for provenance?

## Batch 1 status — done 2026-10-02

- Done: `PROGRESS.md`, `AI-READABILITY-PLAN.md`, `REWRITE-PLAN.md`, `HANDBOOK-REVIEW.md`, `DESIGN-REVIEW.md` moved to `maintenance/history/` (live decisions from PROGRESS summarized in `decisions.md`).
- Done: `docs.md` and `Fellowship Handbook [shared].md` stubs deleted; pointers folded into the README "Repository layout" section.
- Done: `scripts/check-rewrite.py` deleted; comments in `scripts/validate-docs.mjs` fixed.
- Done: `HANDBOOK-OUTLINE.md` and `HANDBOOK-IMPLEMENTATION-PLAN.md` moved to `maintenance/`; inbound links rewritten in README, STYLE-GUIDE, content-map and provenance comments in `docs/`. `CONTRIBUTING.md` line 21 still links `HANDBOOK-OUTLINE.md` and needs `maintenance/` added (left untouched: user work in progress).
- Not yet: redirect mechanism, `STYLE-GUIDE.md` move (kept at root per decision 1), archive relocation, 10-2 inputs move, legacy route retirement.
