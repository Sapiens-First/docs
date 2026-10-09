# Migration brief — complete the new structure (2026-10-02)

User direction: "make sure existing information is incorporated into the new structure, and that the general new structure is set and committed." Anything needing the user's input is marked **Under construction** with short bullets; the user will review the whole handbook later.

## Goal

Every numbered unit in `maintenance/HANDBOOK-OUTLINE.md` has a page, and every block of every legacy page under `docs/` (guide, learning, members, organization, organizers, practices, strategy, supporters, work, find.md) has a home in the new structure. Legacy routes then become redirects.

## Rules for content agents

- **Move, don't link.** Legacy pages will be retired, so practical detail (steps, tables, checklists, mermaid diagrams, templates, prompts) must be carried into the new page, retaining wording. Light edits only for flow, numbering and links. Do not drop content; if something doesn't fit anywhere, put it in the closest page under a clearly labelled subsection and report it.
- **Never invent** policies, numbers, owners, cadences, sources or claims. Where input is needed, use:

  ```md
  ::: clarify
  - What is needed, as a short question.
  - Another item.
  :::
  ```

  (renders as "Under construction"). Keep each to bullets, no prose essays. Existing `::: proposal` and other containers stay as they are.
- **Pattern:** copy frontmatter/heading conventions from `docs/staff/expectations.md` or `docs/leadership/people.md`: `title` and H1 start with the number; `section` is one of Introduction, DNA, Leadership, Staff, Reference materials, Further Reading, Citations, Glossary; `status` keeps the source page's status if moved verbatim (adopted/proposed), else `draft`; `last_updated` keeps the source date for verbatim-moved pages, else 2026-10-02; `handbook_id`, `handbook_number`, `canonical`; Summary; provenance HTML comment; numbered H2s with explicit `{#anchors}`.
- **Links:** rewrite links inside moved content to point at new pages, not legacy routes, when the target's new home is known (see ledger `maintenance/content-map.md` and the target map below). Otherwise leave the legacy link; redirects will cover it.
- **Ownership:** only create/edit the files assigned to you. Do NOT edit `handbook-data/toc.json`, `maintenance/*`, `scripts/*`, `docs/.vitepress/*`, or legacy pages. You can't run a passing build until toc entries exist — that's fine; check links/anchors by grep.

## Target map (new homes)

| Legacy | New home |
| --- | --- |
| guide/index.md, find.md | introduction/ (0, 0.2) |
| guide/getting-started.md, guide/fellowship.md, members/, supporters/, organizers/index, fellows, stewards, leads | 0.3 Getting involved (introduction/getting-involved.md) |
| guide/agreement.md | A.1.6 |
| guide/glossary.md | D (glossary) |
| strategy/index.md | 1.1 / 1.2 |
| strategy/resources.md | B (further reading), C (citations), A.3.2 (prompts) |
| organization/values.md | 1.3 + A.1.1 |
| organization/index, roles-and-circles, decisions, participation | 1.4 Structure |
| organizers/compensation.md | 3.2 |
| work/index, projects, weekly-work, learning/index, metrics, reviewing-metrics, strategic-hypotheses, atlas-and-ai | 2.2 Strategic planning (and 1.4.6 for Atlas) |
| work/meetings-and-updates | 2.4 Facilitation |
| learning/feedback | 2.1 / 2.3 / 3.3 |
| work/templates | A.2.1 (templates), A.3.1 (prompt) |
| practices/index, gatherings, actions, starting-a-circle, training, organizing-conversations | A.2.6 field guides (A.2.6.x), A.2.2 conversation aid, 2.3.1 |

## Report back (under 40 lines)

1. Files written/edited.
2. toc.json entries, in order: `{ "id", "number", "title", "path", "section" }`.
3. Redirect pairs: `legacy route → new page#anchor` (page level, plus important anchors).
4. Block checklist: for each assigned legacy page, every H2/H3 → destination. Flag anything not carried.
5. Under-construction items added (one line each).
