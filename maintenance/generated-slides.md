# Generated slides: deterministic formula

Last updated: 2026-10-09. D1 contract, now implemented by `slides/generate.mjs` (`node slides/slides.mjs generate PAGE.md`), the generated-deck footer in the renderer, and the regeneration step in `scripts/build-slides.mjs`. Generated decks with unresolved presentation findings are withheld from the site until reviewed.

## Input and output

Generate only for a module's explicit `slides:` mapping; never infer a deck from its filename or chapter number. Read its title, Summary and source Markdown in document order. Preserve a complete source snapshot, repository-relative source path and SHA-256 digest. Derive slide IDs from the stable page ID and block ordinal. Use fixed serialization, timing and styling defaults recorded by the generator; no build timestamps, randomness, AI or invented explanatory text. The same source and formula version must produce byte-identical deck JSON.

Before writing or regenerating, check the module/deck registry. If any handcrafted deck exists for that module, skip generation, including when that deck is still awaiting approval. Never overwrite a handcrafted deck. A handcrafted deck replaces the generated deck in public navigation only once approved.

## Slide formula

Use the following rules in source order. Strip Markdown presentation syntax and explicit heading anchors from audience labels, while keeping wording and punctuation; notes retain the exact original Markdown.

| Source block | Generated slide |
| --- | --- |
| Page title and Summary | Opening `statement`: page title as title; Summary as up to two content lines when it fits. Preserve the complete Summary in notes. A longer Summary is flagged for review, never shortened. |
| Each H2, including Summary | One `divider` with that heading as its title, `content: {}`, and role `buffer`. |
| One bullet or numbered-list item | `statement` with one content line. |
| Two items in one list | `pair` with exactly two labels. |
| Three items in one list | `triad` with exactly three labels. |
| Four items in one list | `steps` with exactly four labels, in original order. |
| Five or more items | Flag the section as too long for one `steps` slide. Preserve every item in notes and the source snapshot; require review of splitting or handcrafting rather than dropping items. |
| Explicit term and definition, such as a Markdown definition-list entry or `**Term:** definition` | `pair` with the term and definition as its two labels when they fit. A self-contained single definition becomes a `statement`. Do not infer definitions from ordinary prose. |
| Ordinary short paragraph | `statement` using the enclosing heading as title and the unchanged paragraph as a content line, subject to validator findings. |
| Nested lists, tables, diagrams, code or other unsupported blocks | Flag the exact section and source range for review; retain the complete source passage in notes. Do not flatten away meaning. |

Current strict capacities in `validateDeck` are: `statement` has 0–2 lines, `pair` exactly 2 labels, `triad` exactly 3, `steps` 3–4, and `divider` no content fields. Consequently, “four or more bullets become steps” does not permit a five-label slide. Any future pagination rule must be explicit, deterministic and preserve all items.

Content slides use purpose `explain` and role `content`; H2 dividers use purpose `explain` and role `buffer`. Keep the original source order. Do not invent images, citations, engagement prompts or rule exceptions. Existing reading guidance can remain in notes without becoming new recommendations.

## Notes and coverage

Every slide's `notes.sourceRanges` identifies the exact source passage using inclusive, one-based `{ start, end }` ranges against the stored snapshot. Notes assemble those ranges verbatim; generated labels are not a substitute for the source. Preserve complete paragraphs, bullet bodies, links, formatting and any continued lines. Put frontmatter and provenance comments in the opening notes as exact source metadata rather than discarding them.

Every nonblank source line must be covered by notes or a valid, explained source classification. The existing validator accepts only literal `heading` and original `agenda` classifications; it does not allow prose, definitions, YAML or unsupported material to be classified away. Headings used for dividers can be covered by their notes directly. Retain and report any duplicate coverage, such as the opening Summary and its later section slide. Do not exploit `sourceGaps` to hide substantive text.

Run the existing strict validator and source-coverage check. Report long labels, unsupported blocks, more than ten slides, excessive duration and other presentation findings with their page, section and source ranges. Findings require review; the generator must not fix them by truncating words, leaving source uncovered or silently adding exceptions. Preserve a diagnostic draft and complete notes, and withhold publication until unresolved findings are reviewed.

## Publication contract

Generated output has `origin: generated`, initial `approved: false`, and `covers` matching its explicitly mapped handbook page IDs; approval never presents it as handcrafted. Every slide, including title and dividers, displays **Auto-generated from the handbook text**. The handbook TOC, module buttons and Slides index also show the 🤖 label. The generator regenerates when module source changes, then validates before publication. These renderer, metadata and build behaviors remain implementation requirements, not existing functionality.


## Refinements after the first two starter decks (D6)

Applied in `slides/generate.mjs` after generating Leadership and the strategy deep dive:

- **Link-and-description list items** (`[3.1 Culture in leadership](page.md) — description`) use the link text as the label. The description stays in the notes.
- **Five-word limit.** A list item, paragraph or Summary over five words is not shown on the slide. The slide shows its heading only, the full text stays in the notes, and the block is listed under `generation.flags` as `long-label`, `long-paragraph` or `long-summary`. Nothing is shortened.
- **Slide count.** A deck over ten slides carries one explicit deck-level `10-20-30` exception that names the formula as the reason, so it remains visible in the JSON.
- **Headings over six words** are still reported as findings. A person must retitle the page heading or handcraft the deck; the deck is withheld from the site until then.

Result: Leadership publishes (5 slides, 2 flagged blocks). The strategy deep dive is withheld because two section headings run seven words.
