# Sapiens First Handbook

The shared handbook for continuous training, for people curious about the movement and those already organizing, leading, or teaching. Begin at [0 Start here](docs/introduction/index.md), then choose from 1 DNA, 2 Go deeper, 3 Lead, 4 Train others, and 5 Supplemental. Appendices A–D keep their reference numbers; staff guidance is Appendix E.

Built with [VitePress](https://vitepress.dev) for [GitHub Pages](https://sapiens-first.github.io/docs/). [Atlas](https://sapiensfirst.org/atlas) holds current governance, projects, priorities, and owners; the handbook explains the concepts and practices behind them.

## Incremental handbook implementation

The current chapter structure and remaining work are recorded in [TODO.md](TODO.md); [HANDBOOK-OUTLINE.md](maintenance/HANDBOOK-OUTLINE.md) records the earlier outline. See [implementation progress](maintenance/implementation-progress.md), [decisions](maintenance/decisions.md), and [content map](maintenance/content-map.md) for the earlier migration. Legacy pages and old staff routes redirect through `handbook-data/redirects.json`. Go deeper, Train others, and Supplemental contain planned modules whose content still needs to be written. The `10-2 content additions/` directory supplies helpful role rubrics, tech notes, and source diagrams.

Published diagrams use SVG under `docs/public/diagrams/`; [STYLE-GUIDE.md](STYLE-GUIDE.md#diagrams-and-visuals) defines the standard. Run `npm run diagrams:check` for asset checks; `npm run docs:check` includes them. Run `node --test scripts/handbook-*.test.mjs` for TOC/reference fixtures; CI includes both checks. The ordered contents live in `handbook-data/toc.json`; canonical rubric blocks are included in HTML and Markdown exports. See CONTRIBUTING for the authoring syntax.

## Repository layout

```text
docs/                     Published handbook
  index.md                Site home
  introduction/           0 Start here: welcome, how the handbook works, getting involved
  dna/                    1 DNA: story, strategy, culture, structure
  go-deeper/              2 Go deeper: planned modules on nonviolence, strategy, AI safety, conversations
  leadership/             3 Lead: culture, planning, people, facilitation
  train-others/           4 Train others: planned modules on teaching and running training
  supplemental/           5 Supplemental: four planned practical topics
  appendices/             A Reference materials, D Glossary, and E Staff (appendices/staff/)
  further-reading/        B Further Reading
  citations/              C Citations
  public/                 Shared images and icons
  .vitepress/             Navigation, theme, generated build output
archive/sources/          Unchanged input documents; not built into the site
.github/workflows/        Existing GitHub Pages deployment
CONTRIBUTING.md           Writing conventions and maintenance guidance
```

Top-level directories:

- Root: `README.md`, `CONTRIBUTING.md`, `STYLE-GUIDE.md`, `TODO.md` and build configuration; loose source inputs remain pending reconciliation.
- `docs/`: published handbook content, and nothing else.
- `handbook-data/`: the ordered table of contents (`toc.json`) and other data the build reads.
- `scripts/`: validators, TOC/reference tooling and their tests, and the book builder.
- `maintenance/`: the [current implementation plan](maintenance/HANDBOOK-IMPLEMENTATION-PLAN.md), [generated-slide formula](maintenance/generated-slides.md), decisions, the content map, and implementation progress. Earlier audit and migration paths point to the current plan and archived originals.
- `maintenance/history/`: superseded plans and reviews kept for provenance, unchanged.
- `archive/`: unchanged original input documents (`archive/sources/`, including the original movement guide and Fellowship handbook with embedded images and dated material). See [the content map](archive/README.md) for where material moved and what still needs clarification.
- `10-2 content additions/`: October 2 input notes, rubrics and source diagrams, kept until reconciled with the handbook; published diagram copies live in `docs/public/diagrams/`.
- `experiments/slides/`: DNA presentation source, renderer, notes, assets and tests. It stays here during concurrent editing; moving it to `slides/` is pending.

## Local development

Use Node.js and Python 3 (for SVG validation).

```sh
npm ci
npm run docs:dev
npm run docs:build
npm run docs:preview
npm run docs:check   # validate frontmatter and links; add --warn-only locally
```

The production build is written to `docs/.vitepress/dist`. The site uses the `/docs/` base path. Do not commit generated build files.

The build also writes `llms.txt`, `llms-full.md`, `llms-full.txt`, a `sitemap.xml`, and a raw-Markdown twin of every page (for example `leadership/strategic-planning.md` next to `leadership/strategic-planning.html`), plus redirect stubs for retired legacy routes, for LLMs and other tools that read the site directly. See "Metadata and machine-readable files" in [CONTRIBUTING.md](CONTRIBUTING.md).

## Editing

Edit Markdown under `docs/`. Use lowercase, hyphenated filenames and relative `.md` links so content is navigable in both GitHub and VitePress. Register new numbered pages in `handbook-data/toc.json`; the sidebar, navbar and home page chapter map are generated from it, grouped by chapter; the short reader-facing chapter labels ("Start here", "Lead", …) live in `CHAPTER_LABELS` in `scripts/handbook-toc.mjs` (see [CONTRIBUTING.md](CONTRIBUTING.md)). Link new pages from their chapter landing page or from [0.2.5 Find anything](docs/introduction/how-the-handbook-works.md#find-anything). When you move or retire a page, add its old route to `handbook-data/redirects.json`.

## Deployment

Every push to `main` builds and deploys through `.github/workflows/deploy.yml`. Local edits and builds do not publish the site.
