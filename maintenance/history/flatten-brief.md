# Flatten brief — readability pass (2026-10-02)

User direction: "I don't want the sub section sub sections. At most 2.1.1 that many layers. Too many sections confuses things. Have you heard of paragraphs?" Optimize for readability and skimmability.

## Rules

1. **Depth cap: three number levels.** No number anywhere (page or heading) with more than three parts: `2.1.1` and `A.1.1` are the maximum; `2.2.6.1`, `A.2.6.1`, `1.4.4.3` are not allowed.
2. **Chapter section pages** (numbered `X.Y`, e.g. 2.2): H2s are numbered `X.Y.Z`. No numbered H3s. Prefer **no H3 at all**: turn sub-subsections into paragraphs, bold lead-ins (`**Scope first.** …`), short lists or tables. Keep an unnumbered H3 only when the reader truly needs to jump to it (rare).
3. **Pages already at three levels** (Appendix A pages like `A.1.1`, field guides): H2s are **unnumbered**; again prefer paragraphs over H3s.
4. **Fewer, bigger sections.** Aim for roughly 3–7 H2s per page. Merge tiny sections. Fold boilerplate "In brief" / "When to use this" headings into the Summary paragraph. Don't add headings for single paragraphs.
5. **Keep all substance.** Flattening changes structure, not content: keep tables, diagrams, steps, examples, adopted wording, `::: clarify` (Under construction), `::: proposal` and other containers, and include directives. Tighten only obvious repetition.
6. **Anchors.** Keep explicit `{#anchor}` on surviving headings unchanged. When a heading with an anchor is removed, record `old-anchor → surviving-anchor` (same page). Don't fix inbound links from other pages yourself — the integrator will apply your anchor map across the repo and to `handbook-data/redirects.json`.
7. **Ownership.** Edit only your assigned files. Don't edit `handbook-data/*`, `scripts/*`, `docs/.vitepress/*`, `maintenance/*`.

## Report back (under 25 lines)

Files edited; heading counts before → after; anchor map lines `path#old → path#new`; anything you couldn't flatten without losing content.
