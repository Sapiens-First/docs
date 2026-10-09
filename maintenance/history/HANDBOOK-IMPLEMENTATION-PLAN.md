# Sapiens First handbook restructuring: implementation plan

Created: 2026-10-02  
Last updated: 2026-10-02  
Status: Incremental local implementation authorized by the user on 2026-10-02; organizational policy decisions and publication remain subject to review.

## 1. Purpose and authority

Reorganize the handbook around Introduction, DNA, Leadership, Staff, and Appendices A–D. The user's new hierarchy, expanded in [HANDBOOK-OUTLINE.md](HANDBOOK-OUTLINE.md), supersedes the old audience-based structure. Existing content may be retained, rewritten, combined, archived, or removed after review.

The outline is authoritative for placement and editorial scope. This plan owns execution order and technical proposals. Canonical handbook pages own their guidance; canonical policies own policy wording; Atlas and other live systems continue to own current state. Plans, archives, redirects, rendered embeds, and generated exports must not become independently maintained alternatives.

**Current authorization:** the user explicitly requested agent-directed incremental implementation on 2026-10-02. Begin bounded local increments using the outline and helpful `10-2 content additions/` inputs. Record provisional technical choices and remaining policy questions in [maintenance/decisions.md](decisions.md). The original checkpoints still govern unresolved organizational policy and publication; implementation permission is not policy adoption.

## 2. Findings and limits of the first pass

- `docs/` contains the current VitePress handbook. `package.json` specifies VitePress `^1.6.4`, Markdown containers, and Mermaid; confirm the lockfile's installed version before implementing integrations. Keep the existing framework unless there is a demonstrated need to change it.
- `docs/.vitepress/config.mts` groups navigation by audience and already maps `last_updated` to page dates. `PageMeta.vue` visibly displays metadata for ordinary pages; home-layout pages are excluded from part of this processing.
- `scripts/validate-docs.mjs` permits only the three old audience groups, skips `docs/index.md`, and expects old page conventions. `scripts/check-rewrite.py`, `STYLE-GUIDE.md`, and `CONTRIBUTING.md` also encode old structural assumptions.
- `docs/.vitepress/llms.ts` generates raw Markdown, combined LLM exports, and indexes. Any new embedding/registry mechanism must work in those outputs as well as the HTML site.
- `docs/organizers/compensation.md` is a placeholder. `docs/learning/feedback.md` proposes rubrics without actual IC/DRI/PC scoring tables. Exact Holacracy adoption and several governance processes remain unresolved.
- The old glossary and participation pages say staff are Leads. The new structure must not silently preserve this as the definition of employment or responsibility.
- `archive/sources/` preserves the original source material, and `archive/README.md` records previous consolidation decisions. Existing root planning/review files describe earlier work and require classification during cleanup.
- The live site could not be retrieved through the web tool; shell retrieval also failed DNS resolution. This plan is based on local files, not a verified comparison with the deployed site.

## 3. Review checkpoint: proposed structural contract

The choices below are recommendations, not settled decisions. Review them together with the outline before agents implement them.

### 3.1 Chapter, section, and subsection model

- Chapter pages provide short orientation and links: `0 Introduction`, `1 DNA`, `2 Leadership`, `3 Staff`, `A–D Appendices`.
- A section normally has one canonical Markdown page: `1.1 Story`, `2.2 Strategic planning`, `3.2 Compensation`.
- Subsections have numbered, named headings: `2.2.3 Metrics`. Appendix reference items can be separate pages if they need independent linking, embedding, or maintenance.
- Use a stable string ID such as `staff-expectations` for identity and a separate display number such as `3.1`. Reordering changes the number, not the identity. Generate labels from a single ordered table of contents; do not maintain conflicting numbering in headings, frontmatter, and sidebar.
- Use descriptive filenames and explicit stable anchors. Numbering must be visible on the site, in source Markdown, and in exported Markdown; validation checks it against the table of contents. Choose the exact authoring/generation mechanism during the approved technical pilot.
- For the glossary, number the appendix and its containing section; alphabetic entries use stable term anchors. Confirm this exception with the user.

### 3.2 Proposed page anatomy

Directional template for review; not a finished implementation:

```markdown
# 3.1 Staff expectations

Last updated: [rendered from last_updated metadata]
Status: [adopted / proposal / draft / experimental / reference]

## Summary
One short paragraph or a few bullets explaining the main point.

## 3.1.1 Individual Contributor
Explanation and relevant examples.
[Embed the canonical IC rubric from A.1.2, with source link/date/status.]

## 3.1.2 Directly Responsible Individual
Explanation; embed the canonical DRI rubric.

## 3.1.3 Player-Coach
Explanation; embed the canonical PC rubric.

## Further Reading
[Generated recommended resources associated with this section/subsections.]

## Citations
[Generated links for claims and influences actually cited on this page.]
```

- Summary, metadata, Further Reading, and Citations are unnumbered page furniture. Content headings carry textbook numbers and names.
- Embed reference material next to the relevant explanation; an optional Reference materials list provides direct links. Avoid repeating whole policies in a generic block at the bottom.
- Chapter landings and appendix indexes use the same Summary/date conventions, with navigational lists as their content. Empty reading/citation areas should say there are no assigned entries, or be omitted under an approved consistent rule.
- Existing “In brief,” ledes, “When to use this,” and Related blocks are content to evaluate. The old template is not an additional mandatory layer over the new one.
- Show open content gaps visibly in draft pages. Do not mark a page adopted merely because surrounding sections are adopted.

### 3.3 Single-source policy embedding

Recommended: build-time inclusion of explicitly identified blocks from the canonical Appendix A Markdown page. VitePress supports Markdown inclusion; a small extension may be needed for source metadata, stable fragment selection, and export handling. Verify against the project's pinned version before choosing an implementation. [Official Markdown inclusion documentation](https://vitepress.dev/guide/markdown#markdown-file-inclusion).

Required behavior:

- Authors reference a stable policy/block ID, never copy the policy into a chapter.
- The embedded block shows its canonical title/link, status, and source date. The surrounding chapter retains its own editorial date.
- Only the intended policy body is included; exclude the source page's frontmatter, H1, Summary, and navigation.
- Links inside an embed resolve relative to the source page, then adapt correctly to the receiving page and `/docs/` base. Give embedded headings unique local anchors; avoid duplicate IDs and avoid treating Appendix numbering as host subsection numbering.
- Prevent circular inclusion and nested reference loops. A missing or ambiguous block is an explicit build failure, not an empty rubric.
- The HTML, raw-Markdown twins, and combined LLM exports present the same resolved policy body and source attribution. Search can index canonical content without multiplying indistinguishable results.
- Rendered repetition is allowed; separately authored policy copies are not. Updating one rubric must update all its uses at the next build without editing those chapters.
- If the source is an external live system, link to that system or an approved authoritative endpoint. Do not maintain an unofficial handbook copy of changing records.

### 3.4 Further Reading and citations

Recommended: one human-editable YAML resource catalog outside the published page tree, with two distinct kinds of relationship. Build-time data loading can support generated lists. [Official VitePress data-loading documentation](https://vitepress.dev/guide/data-loading).

Directional data model:

```yaml
id: holacracy-introduction
title: [verified title]
url: [verified canonical URL]
author: [verified author or organization]
description: [why this is useful]
subjects: [holacracy]
tags: [governance, facilitation]
recommended_for: [dna-structure, leadership-facilitation]
verified_on: [actual verification date]
```

Citation uses refer to the same resource ID and record the target section/claim anchor, locator (page, chapter, or timestamp if applicable), and how it supports the text. A resource may be recommended, cited, both, or neither pending review. Never assume citation means recommendation.

- Appendix B groups recommended resources by subject and offers tag browsing. Section pages show resources assigned to that section and its subsections, deduplicated by ID.
- Explicit associations govern inclusion by default. A Holacracy resource can be assigned to both 1.4 and 2.4; tags make it discoverable under facilitation. If automatic tag-based inclusion is preferred, the user must approve its rule and exclusions first.
- Appendix C groups citation uses by the referenced handbook section and links back to claim anchors. Keep one bibliographic record even if it has many uses.
- Put AI-2040 on the unresolved list until the user identifies it. Keep Netflix and Amazon performance-management sources citation-only unless specifically approved for recommendation.
- Do not invent exact passages, authors, editions, or links. Distinguish checked links from claims whose support has been verified.

### 3.5 Generated glossary

Recommended: authors define terms in structured metadata alongside their canonical explanatory section. A definition record has a stable term ID, label, aliases, short definition, and explicit canonical anchor. Render that definition from the same record on the owning page and in Appendix D.

- Generate one alphabetized glossary, preserving aliases and separate meanings where needed.
- Use existing glossary wording as migration input, review each definition, then remove its hand-maintained duplicate after the generated replacement works.
- Validate unique IDs, ambiguous aliases, missing anchors, and multiple purported canonical definitions.
- A term's definition is human-authored/reviewed; automatic generation assembles the index. Do not use runtime LLM extraction to decide what terms mean.
- Update D's visible content date when its inputs change; do not treat every build as a content update.

### 3.6 Last-updated dates

- Keep `last_updated: "YYYY-MM-DD"` as the source for each authored page's visible date. Record the actual editorial change date; do not bulk reset dates just because files moved.
- Include homepage, chapter landings, appendix indexes, and reference pages. Extend validation to cover the pages currently excluded.
- Display embedded references' source dates independently, so a fresh rubric is visible even if the host explanation is older. An optional “included material updated” date can be derived from dependencies if approved.
- Generated reading/citation/glossary pages derive their dates from their content inputs, with a documented rule. Store input update dates and calculate the latest contributing date; never use build time as a freshness claim.
- Distinguish `last_updated` from a resource's link-verification date or a policy's effective date. Confirm an effective-date field only where the user needs one.
- Dates are calendar dates; preserve them across reader time zones. The default theme's date behavior should be checked alongside the existing custom renderer. [Official last-updated documentation](https://vitepress.dev/reference/default-theme-last-updated).

### 3.7 Proposed repository layout

```text
README.md                         Setup and a map of the repository
CONTRIBUTING.md                    Authoring and maintenance rules
HANDBOOK-OUTLINE.md                 Editable editorial source of truth
HANDBOOK-IMPLEMENTATION-PLAN.md     Execution and structural proposals
docs/                             Published handbook
  index.md                        Handbook entry and complete contents
  introduction/                   Chapter 0
  dna/                            Chapter 1
  leadership/                     Chapter 2
  staff/                          Chapter 3
  appendices/
    reference/                    A: canonical reusable materials
    further-reading/              B: generated catalog views
    citations/                    C: generated citation views
    glossary/                     D: generated definitions index
  public/                         Shared assets
  .vitepress/                     Site configuration and theme
handbook-data/                    Authoritative TOC and resource catalog
scripts/                          Generation and validation tools
maintenance/
  content-map.md                  Complete old-to-new disposition ledger
  research-notes.md               Verified sources and unresolved research
  decisions.md                    User-approved structural decisions
archive/
  README.md                       Historical index and archive boundaries
  sources/                        Preserve original source documents
  previous-plans/                 Superseded planning/review files
.github/workflows/                Existing deployment configuration
```

The two new review documents stay at the root for easy editing. If they later move, add one pointer and update links; avoid two editable copies. Generate B/C/D views at build time or mark generated source files clearly and exclude them from manual editing; choose the exact approach in the pilot. Do not publish research notes or execution plans as handbook pages.

Approve URL migration together with this directory layout. Recommended: descriptive new chapter URLs, plus a complete old-path mapping and compatibility pages/redirects. Preserve old fragment destinations too. GitHub Pages does not provide arbitrary server-side redirect rules; select a tested static-compatible mechanism in the pilot. A canonical tag alone does not redirect readers.

## 4. Execution stages and review checkpoints

### 4.1 Inventory and reconciliation

Owner responsibility: content inventory and migration ledger. Inputs: every Markdown page in `docs/`, original source documents, existing archive map, root planning/review files, configuration, theme, scripts, and deployment workflow.

- Compare the deployed handbook with this checkout when access is available; record the ref/date used. Investigate differences before treating either as the complete old inventory.
- Create `maintenance/content-map.md` with one row per current page and additional rows for independently movable blocks: old path/anchor, topic, destination section ID, disposition, rationale, status, unresolved issue, and date provenance.
- Use dispositions `retain`, `rewrite`, `merge`, `split`, `archive`, or `remove`. No old page receives a destination just to preserve the old structure.
- Record duplicate sources and select one authoritative version. Compare substantive disagreements rather than silently combining them.
- Classify root files including `REWRITE-PLAN.md`, `AI-READABILITY-PLAN.md`, `HANDBOOK-REVIEW.md`, `DESIGN-REVIEW.md`, `PROGRESS.md`, `STYLE-GUIDE.md`, `docs.md`, and `Fellowship Handbook [shared].md`. Root source filenames are currently pointers; avoid accidentally treating them as original full content.

Deliverable: complete ledger with no unclassified page and an explicit unresolved-content list. **Review checkpoint 1:** user reviews the outline, retention decisions, page template, canonical boundaries, numbering, directory/URL scheme, dates, and reading/glossary models before systematic migration.

### 4.2 Research and policy inputs

Owner responsibility: `maintenance/research-notes.md` and verified resource records. Depends on scope decisions from checkpoint 1; independent research may proceed while content answers are pending.

- Verify AI/power/surveillance/security claims, separating evidence, uncertainty, organizational beliefs, and strategic assumptions. Research the final chosen claims, not an assumed expansion of the story.
- Find official Holacracy constitution and meeting guidance; compare the selected version with local practices. Do not present the full external model as locally adopted without confirmation.
- Locate precise sources for proactive hiring, IC/DRI/PC, mastery/autonomy/purpose, Netflix keeper test, and any Amazon performance practices actually used. Record relevant passages and the intended application; paraphrase appropriately.
- Verify inherited reading links and editions; identify which resources are recommended versus merely cited. Ask the user for the intended AI-2040 source.
- Obtain user inputs for rubrics, compensation method, staff philosophy, conflict-resolution process, tech primer, and meeting agenda. Unanswered inputs remain draft gaps.
- Preserve agreement wording and review reuse/license provenance before republishing source assets. Source documents currently do not establish a unified site-wide license.

Deliverable: source-backed drafting notes and clear policy questions tied to numbered units. **Review checkpoint 2:** user supplies or approves organizational policy content; research does not authorize adopting external employer practices. Work can continue on independent approved sections while particular policies remain unresolved.

### 4.3 Small structural pilot

Owner responsibility: approved TOC/data design, theme/date handling, embedding, and generated reading/glossary proof. Depends on structural approval; use placeholder fixtures clearly labelled as fixtures when actual policies are still missing.

- Implement one example section with Summary, numbered named subsections, visible date, canonical reference embed, Further Reading, and Citations.
- Use one reference source in two receiving pages; demonstrate that one source edit updates both, with correct links, dates, statuses, and anchors.
- Demonstrate a shared reading entry under two sections and an Appendix B subject/tag view, plus citation-only placement in Appendix C.
- Demonstrate one definition rendered on its owning section and generated into D. Check that alias/search links reach the correct meaning.
- Inspect HTML and raw/combined Markdown outputs. Prove the integration in the installed VitePress version; avoid dependency upgrades unless necessary and separately reviewed.

Deliverable: local preview and a concise explanation of any departures from the approved proposal. **Review checkpoint 3:** user reviews the pilot's presentation and editing workflow before agents repeat it throughout the handbook.

### 4.4 Content migration and reformatting

Responsibilities can be handed to separate agents in later execution; this plan does not dispatch them. Assign exclusive ownership before starting. Suggested packages:

| Package | Ownership | Dependencies |
| --- | --- | --- |
| Introduction and DNA | `docs/introduction/`, `docs/dna/`; corresponding ledger rows | Approved scope; story/culture/governance research |
| Leadership | `docs/leadership/`; corresponding ledger rows | Approved practice/process inputs; shared templates |
| Staff | `docs/staff/`; corresponding ledger rows | User-supplied philosophy, rubrics, compensation, development, tech guidance |
| References | `docs/appendices/reference/` | Policy/text approval; selected original sources |
| Catalogs and glossary | `handbook-data/` resource entries; definition migration; B/C/D view inputs | Stable IDs, approved records and term ownership |
| Integration and cleanup | TOC/config, theme, scripts, exports, contributor docs, redirects, archive | Approved pilot and completed content mappings |

- Rewrite into the approved anatomy; use a modular section per topic with named, numbered subsections.
- Main chapters explain policy application; canonical policies stay in A. Integrate reference IDs and source citations rather than pasting policies or resource lists.
- Keep volunteers and Fellowship distinct from paid staff. Resolve old participation terminology explicitly.
- Do not reintroduce dated cohort schedules, live project lists, or current role assignments as general guidance.
- Record dispositions and provenance as material moves. Preserve removed historical material outside the published source tree; retain exact source archive originals.
- Every executor reads the current outline, this plan, approved decision log, and relevant ledger rows first. If they conflict, report the conflict rather than inventing an alternate structure.

Deliverable: approved chapters and canonical references, with visible gaps where inputs remain missing. Integration owner controls shared navigation/catalog schemas; agents must accommodate other edits and not revert one another's work.

### 4.5 Navigation, compatibility, and folder cleanup

- Replace audience-based primary navigation with numbered chapters and appendices. Optional audience reading paths contain links only.
- Update homepage, search routing, previous/next links, page metadata, canonical links, sitemap behavior, raw Markdown exports, and LLM indexes around the new hierarchy.
- Extend validators to the new chapter schema and shared registries; remove hard-coded old audience constraints and stale “In brief”/Related expectations where superseded.
- Keep `README.md` focused on repository navigation and commands. Update `CONTRIBUTING.md` to explain authoring, numbering, ownership, resource associations, glossary definitions, dates, and regeneration.
- Decide whether existing `STYLE-GUIDE.md` remains contributor guidance or supplies content to A.4. Maintain one authoritative home for each rule; use links for shared guidance.
- Move superseded plans/reviews to the archive with an index and clear historical labels. Preserve original source documents. Remove redundant root pointers only after updating references and recording their disposition.
- Add static-compatible redirects/compatibility pages and anchor mappings for all retained external entry points. Do not leave old full articles published alongside their replacements.
- Audit human navigation from the root README and chapter contents to every canonical page. Keep implementation internals out of public reader guidance.

Deliverable: clean, documented folder tree and a migration ledger whose destinations actually exist.

### 4.6 Verification and final review

Execution-stage checks; no production checks or migration were run during this planning task.

- Run `npm run docs:check` and `npm run docs:build` after the validators are updated. Inspect warnings as well as failures. Review whether `scripts/check-rewrite.py` still applies and adapt or retire it explicitly.
- Check TOC completeness, number uniqueness/order, stable IDs, heading names/levels, canonical uniqueness, broken internal/fragment links, and orphan pages.
- Verify every page—including home/chapter/appendix/generated pages—shows a valid date. Check calendar dates across time zones and date changes after a dependency update.
- Exercise embed failure cases: missing source/block, include cycle, duplicated heading anchors, relative source links, and inherited draft/proposal status. Verify one edit propagates to multiple hosts and all exports.
- Verify resource deduplication, explicit section/subsection association behavior, subject/tag browsing, and citation-only resources excluded from B. Check each citation's source supports the associated claim.
- Verify glossary generation, aliases, distinct meanings, canonical links, and no separately authored replacement glossary.
- Review old URL and anchor mappings under the `/docs/` base; check redirects without requiring a particular client-side navigation path.
- Inspect desktop/mobile navigation, keyboard navigation, policy embeds, source attribution, Further Reading, glossary lookup, and local Markdown readability. Add focused automated tests for generation/resolution logic where meaningful; do not test prose by reproducing its text.
- Reconcile every inventory row and missing-content marker. User-approved deferrals remain clearly labelled drafts; unresolved mandatory sections prevent claiming the full handbook complete.

**Review checkpoint 4:** user reviews the complete preview, unresolved deferrals, cleanup, and validation evidence before publication. Publishing or pushing to the deployment branch needs authorization; a push to `main` currently triggers GitHub Pages deployment. This plan does not authorize that push.

## 5. Completion criteria

- The approved hierarchy is reflected in content, navigation, source folders, and generated exports.
- Each section has a Summary, numbered named content subsections, a visible last-updated date, and associated Further Reading under the approved rule.
- Each policy/rubric, resource record, and term definition has one authoritative authoring location. Embeds and generated indexes are derived views.
- All old pages/blocks have recorded dispositions; relevant old URLs and fragments reach a useful new destination.
- Research claims have verified support; organizational policy gaps have user-approved content or explicit agreed deferrals. No invented rubrics, salaries, governance rights, or employment promises.
- The folder is navigable from the README, contributor rules describe the actual new model, and superseded materials are clearly historical.
- Build/validation and targeted rendering/export checks pass, and the final review occurs before deployment.

## 6. Handoff state

Incremental implementation has begun with user authorization. See [maintenance/decisions.md](decisions.md) and [maintenance/implementation-progress.md](implementation-progress.md) for completed units, provisional choices, and pending decisions. Confidence is high that much of DNA and Leadership can reuse existing material, but low on the completeness of Staff policy inputs and exact Holacracy adoption. The embedding/export approach requires a pilot; it is a proposal grounded in the existing stack, not verified implementation.

Next actions follow the incremental progress record. Continue independent drafting and structural work from supplied inputs; leave unresolved policy visible as drafts. Do not infer policy adoption or publishing authorization from these editorial increments.
