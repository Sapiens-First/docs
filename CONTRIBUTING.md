# Editing the handbook

The handbook explains how Sapiens First works. Write for someone who wants to participate and may be encountering the organization for the first time.

Read the [style guide](STYLE-GUIDE.md) before you write. It covers naming, framing, the rule of three, bold lead-ins, sentence rhythm, and diagrams. This file covers the mechanics.

## Put information in the right place

| Information | Home |
| --- | --- |
| Shared definitions, protocols, expectations, and repeatable guides | Handbook under `docs/` |
| Current roles, owners, governance, priorities, and work | Atlas or the live records linked from it |
| Current policy recommendations and campaign materials | Relevant Sapiens First website pages, linked from the handbook |
| Historical source material and original meeting notes | `archive/sources/`, outside the published site |
| Repository setup and contributor guidance | Root README and this file |

A handbook page may explain what a project record contains. It should link to the current records rather than maintaining a second project register. Examples should be clearly illustrative.

## Add pages incrementally

The chapter order is **0 Start here, 1 DNA, 2 Go deeper, 3 Lead, 4 Train others, and 5 Supplemental**, followed by **A Reference materials, B Further Reading, C Citations, D Glossary, and E Staff**. [TODO.md](TODO.md) records the restructuring; [HANDBOOK-OUTLINE.md](maintenance/HANDBOOK-OUTLINE.md) records the earlier outline. Legacy audience and staff routes redirect through `handbook-data/redirects.json` (validated by `npm run docs:check`, with redirect stubs written at build time). The [migration ledger](maintenance/content-map.md) records the earlier content moves. When you move or delete a page, add its old route to `redirects.json`. Department-specific guidance is E.4; the tech meeting agenda remains A.2.5.

Use a matching numbered H1 and `title`, `handbook_id` (stable descriptive ID), `handbook_number` (display number), `## Summary`, numbered content headings with stable anchors, and existing status/date/canonical metadata. Section values are `Introduction`, `DNA`, `Go deeper`, `Leadership`, `Train others`, `Supplemental`, `Reference materials`, `Further Reading`, `Citations`, `Glossary`, and `Staff`. `Introduction` and `Leadership` remain the metadata values for the reader-facing Start here and Lead chapters. Staff pages live in `docs/appendices/staff/`. Do not equate staff with Leads.

Register new numbered pages in `handbook-data/toc.json`; navigation is generated from it. Use relative `.md` links between handbook pages and keep current assignments/priorities in live records. Canonical reusable material lives in Appendix A; use links until the embed pilot is verified. Preserve missing organizational decisions as draft gaps.

Store published diagrams in `docs/public/diagrams/` as SVG, with Markdown alt text and an adjacent text equivalent. See [diagram conventions](STYLE-GUIDE.md#diagrams-and-visuals). Original 10-2 inputs are helpful source material, not a second handbook to maintain.

## Write with cascading detail

Start with a short explanation and the action or idea the reader needs. Put essential expectations in ordinary text. Use the handbook's labelled blocks for optional detail, worked examples, and explanations for people holding responsibilities.

```md
---
description: One sentence saying what the page helps with.
---

# Topic

A short introduction that explains why this matters.

## Get started

The practical steps or shared expectations.

::: roles Preparing for the first meeting
Additional context for people doing the work.
:::

::: related
- [Relevant guide](relative-page.md) — One line on what the reader will find there.
:::
```

Every page starts with a `description:` in its frontmatter. It feeds search results and link previews, and it is the line to reuse when you list the page in a section overview or a Related block. Add `audience: Fellows` (or similar) only when a whole page is for one group.

Each block gets a fixed label, so readers can tell what kind of text it holds. Use only these:

| Block | Label | Use for |
| --- | --- | --- |
| `::: roles` | For role holders | Extra detail for Fellows, organizers, staff, and other role holders |
| `::: example` | Example | A worked example. Don't use `>` blockquotes for examples; keep those for real quotations |
| `::: background` | Background | History, sources, and further reading |
| `::: optional` | Optional | An extra tool or technique the reader can skip |
| `::: proposal` | Proposal | See below |
| `::: clarify` | Under construction | See below |

Add a title after the block name (`::: background Holacracy and distributed authority`) to make it collapsible. Without a title, it stays open. Keep essential expectations out of collapsed blocks.

End a page with one `::: related` list rather than inline "Read more" links. Use each page's sidebar title as the link text, and follow it with a dash and the page's description.

Use direct, welcoming language and concrete examples. Define unfamiliar terms where they first appear, and add new organizational terms to the [glossary](docs/appendices/glossary.md). Prefer a visible definition or a collapsible block to hover-only explanations. Keep links next to the topic they support.

## Distinguish practice from proposals

Preserve established expectations from the source material. Label new governance rules, schemas, evaluation processes, and other unapproved organizational requirements as proposals.

```md
::: proposal Role-specific development rubrics
Explain the proposed practice and what still needs to be settled.
:::
```

Proposal and Under construction blocks have a dashed border and a coloured label, so they can't be mistaken for adopted practice. A title makes a proposal collapsible; the label stays visible either way.

Use `::: clarify` for a specific unresolved decision. Explain what people should do in the meantime. An editorial rewrite does not itself adopt a policy or change decision rights.

Once a proposal is adopted, update its wording and the relevant Atlas records through the organization's agreed decision process. Keep actual assignments and targets in the live records.

## Preserve useful context

Check the [source map](archive/README.md) before removing a topic. Historical schedules and meeting notes belong in the source archive, not the general onboarding path. Do not silently edit the Fellowship agreement while editing adjacent prose.

When adding a factual claim or external resource, verify it and link to the relevant source. Distinguish organizational beliefs, strategic assumptions, and research findings.

## Metadata and machine-readable files

Every content page (everything under `docs/` except `docs/index.md`) carries frontmatter that both the site and outside tools read:

```yaml
---
title: "3.2 Strategic planning"       # identical to the page's H1 text
description: One sentence saying what the page covers.
section: Leadership                      # one of the chapter values above
status: adopted                          # one of the statuses below
last_updated: 2026-09-27                 # YYYY-MM-DD; quote it if you want it to stay a plain string
canonical: /leadership/strategic-planning # site path, no base, no .md; index pages end in /
handbook_id: leadership-strategic-planning # stable ID; never changes when the number does
handbook_number: "3.2"                   # display number; title and H1 start with it
tags: [metrics, planning]                # optional
owner: …                                 # optional; only if the source names one — never invent
---
```

**Sections:** use the chapter values above.

**Status** (fixed list, rendered as a badge near the top of the page): `adopted` · `proposal` · `draft` · `experimental` · `reference` · `under-construction` · `planned`. Use `planned` for an unwritten module stub and `under-construction` for a page with some content and substantial unfinished sections. Keep a `construction_note` beside either status to explain what remains. A page that's mostly current practice but contains `::: proposal` blocks is still `adopted`; say which parts are proposals in its summary. Each page displays one status badge beneath its metadata. Draft or proposal content remains subject to review.

Note that YAML parses an unquoted `2026-09-27` as a date value, not a string — this handbook's build code accepts both forms, but if you want to be certain `last_updated` stays a plain string, quote it (`last_updated: "2026-09-27"`).

**The lede.** The `>` blockquote directly under the H1 is the page's one-sentence summary and is styled without a quote bar; every other blockquote is a real quotation and keeps the usual styling.

**`::: source`** is the "Source of truth" callout (label rendered automatically): use it wherever the handbook explains a concept but Atlas holds the current state, for example roles, projects, or metric values. It renders as a solid, calm block — deliberately distinct from the dashed `::: proposal` / `::: clarify` blocks, so a reader can't mistake an open question for settled fact.

**Generated files.** At build time (`npm run docs:build`), a `buildEnd` hook (`docs/.vitepress/llms.ts`) writes, into `docs/.vitepress/dist`:

- `llms.txt` — an index of every page, grouped by section, for LLMs and other tools that support the [llms.txt convention](https://llmstxt.org).
- `llms-full.md` / `llms-full.txt` — the entire handbook as one Markdown file, headings demoted so the whole document has one hierarchy, `::: kind` blocks spelled out as bold labels, and relative links rewritten to absolute URLs.
- A raw Markdown twin of every page next to its HTML (e.g. `dist/leadership/strategic-planning.md` beside `strategic-planning.html`) — these don't conflict with VitePress's clean URLs, which serve `strategic-planning.html` for `/leadership/strategic-planning`.
- A redirect stub (meta refresh plus a Markdown twin) for each retired route in `handbook-data/redirects.json`.

Don't hand-edit anything under `.vitepress/dist`; it's regenerated on every build.

## Check before publishing

New published diagrams use SVG. Run `npm run diagrams:check`; see the style guide for asset and accessibility rules. Existing Mermaid blocks remain supported during migration.

Run `npm run docs:build`. VitePress checks Markdown compilation and internal page links. Also check new fragment links, navigation entries, expandable sections, and the page at narrow widths when browser testing is available.

Run `npm run docs:check` (or `node scripts/validate-docs.mjs --warn-only` while content is still mid-migration) to check frontmatter completeness, the status and section vocabularies, `last_updated` formatting, duplicate or mismatched `canonical` paths, a single matching H1, and broken relative `.md` links or `#fragments`. It also warns (without failing) when a page has no `::: related` block, no `## In brief`, or no one-sentence lede under the H1. CI runs this in strict mode before every build; the local run can use `--warn-only` since content may be in flux.

Do not commit `node_modules`, `.vitepress/cache`, or `.vitepress/dist`. A push to `main` triggers the existing GitHub Pages workflow; a local build does not publish anything.

## Numbered contents and canonical references

`handbook-data/toc.json` is the ordered registry for numbered pages. Register each page’s stable ID, number, title, docs-relative path, and section there. Navigation and Markdown export order use this registry; validation checks page frontmatter and H1 against it. Keep IDs and filenames stable when changing display numbers. Authored numbers are checked against the registry; heading numbers are not yet generated.

Reusable rubric text stays in Appendix A. Mark a named body block in its canonical source:

```markdown
<!-- handbook:block ic-expectations-rubric -->
[The canonical rubric body]
<!-- /handbook:block -->
```

Include it at the point of explanation with a docs-relative source path:

```markdown
<!-- handbook:include appendices/reference/ic-expectations.md#ic-expectations-rubric -->
```

Keep frontmatter, H1, Summary, and navigation outside the marked block. Included headings receive unique local anchors; relative links resolve from the source page. Every embed shows its source title/link, status, and editorial date. Nested blocks and includes are unsupported and fail validation/build, as do missing or ambiguous blocks. Update the source once; HTML, raw Markdown and combined exports resolve the same body at the next build. Raw Markdown also includes page source, status, and date.

Run `node --test scripts/handbook-*.test.mjs` for resolver, TOC and validator integration fixtures. CI runs these before documentation checks and the build. Generated views never replace the canonical source.

## Releasing a version

The handbook uses CalVer, `YYYY.0M.MICRO`: the year, the zero-padded month, and a counter that starts at 0 each month (`2026.09.0`, `2026.09.1`, `2026.10.0`). The reader-facing history is the [Version log](docs/changelog.md).

- **When:** cut a release at the end of a working day that had meaningful reader-facing change (new or substantially rewritten pages, navigation or design changes, new downloads). Typo fixes, tooling and maintenance notes wait for the next release. Aim for at most one release a day, not one per commit.
- **How:** move the entries under "Unreleased" in `docs/changelog.md` into a new dated section titled with the next version, newest first, then update `VERSION` and `RELEASE_DATE` in `docs/.vitepress/version.mjs`. The footer reads from that file. Keep a headline, two to five plain-language bullets, and the pages touched.
- **Numbering:** a new month resets MICRO to 0; otherwise increment MICRO.
- **package.json:** leave its `version` alone. npm's semver rejects zero-padded CalVer such as `2026.09.0`.
