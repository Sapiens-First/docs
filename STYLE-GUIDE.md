# Handbook style guide

People read this handbook between other things: on a phone before a gathering, or in a spare ten minutes after a meeting. Every page has to earn their attention fast.

This guide sets out how we do that. It covers **framing, wording, and visuals**, and it applies at every level, from the homepage down to a single paragraph. [CONTRIBUTING.md](CONTRIBUTING.md) covers the mechanics: where files go, which blocks exist, and how to build.

## Three principles

**Lead with the point.** Put the idea first, then the detail. A reader who stops after one sentence should still leave with something useful.

**Show the shape.** Group ideas in threes, mark each group with a bold lead-in, and draw the flow when there is one. Readers should see how a page is built before they read it.

**Make every word work.** Cut what the reader doesn't need. Vary the rhythm so the words that remain are a pleasure to read.

## Page structure and names

The handbook supports continuous training through **0 Start here, 1 DNA, 2 Go deeper, 3 Lead, 4 Train others, and 5 Supplemental**. Appendices keep **A Reference materials, B Further Reading, C Citations, and D Glossary**, with **E Staff** for employment-specific guidance. [TODO.md](TODO.md) records this restructuring; [HANDBOOK-OUTLINE.md](maintenance/HANDBOOK-OUTLINE.md) is the earlier outline. Retired audience and staff routes redirect to their current pages.

New section pages have a numbered, descriptive H1 matching frontmatter `title`, a `## Summary`, and numbered, named content subsections with explicit stable anchors. Use `handbook_id` for stable identity and `handbook_number` for the current display number. Summary, Further Reading, and Citations are unnumbered page furniture. Metadata supplies the visible status and calendar date. Omit empty reading/citation lists until the catalog pilot supplies assigned entries.

Keep sidebar labels short and include the display number. Follow the outline's actual structure rather than forcing every topic into three parts. Staff status is separate from volunteer pathways and governance roles; do not define staff as Leads.

Each reusable policy, rubric, agenda, or template has one canonical Appendix A home. Link to it beside the explanation until build-time embedding and export parity are verified. Keep missing approvals visible in drafts.

## The rule of three

Three is the smallest number that forms a pattern and the largest most people hold without effort. "Learn · Organize · Act" works for that reason.

**Group long lists into three.** Five or six items become three labelled groups. The Field guides, for example, sort into Act, Recruit, and Train.

**Write triads in openers and taglines.** "Democracy, prosperity, and security" lands harder than a long sentence that covers the same ground.

**Don't invent a third item.** Two real points beat three padded ones. If the third item is weaker than the others, cut it. If there are truly four steps, keep four and use a numbered list.

## Bold lead-ins

Start key paragraphs and list items with a short bold phrase that states the idea. Then explain it.

| Before | After |
| --- | --- |
| It's important to remember that you don't need to read the whole handbook before getting involved, as each page begins with the basics. | **Start with the basics.** Every page opens with what you need to act. Details are there when you want them. |

- **Make it a claim, not a label.** "Start small" tells the reader something. "Scope" does not.
- **Keep it to two to six words.** End it with a full stop, and put the rest in normal weight.
- **Pass the skim test.** Reading only the bold text should give the gist of the section.

Use at most one bold phrase per paragraph. Don't bold words mid-sentence for emphasis; if a sentence needs rescuing, rewrite it.

## Tight, musical sentences

Gary Provost's advice in *100 Ways to Improve Your Writing* is the model: vary sentence length. Several short sentences in a row sound choppy. Several long ones become a drone. Mix them. A short sentence lands a point. A longer one carries the reader through an explanation and gives them room to breathe before the next short one hits.

**Read it aloud.** If you stumble or run out of breath, rewrite the sentence.

**Keep it active and personal.** Write "you" for the reader and "we" for Sapiens First. Say who does what: "the circle reviews the metrics", not "metrics are reviewed".

**Cut to the bone.** Aim for sentences under 25 words and paragraphs of four sentences or fewer. One idea per sentence; one topic per paragraph.

| Instead of | Write |
| --- | --- |
| in order to | to |
| It is important to note that… | *(cut it and state the point)* |
| make a decision / provide support | decide / support |
| is able to, has the ability to | can |
| at this point in time | now |
| utilize, facilitate (as a verb for "help") | use, help |
| a number of | some, several, or the actual number |
| basically, really, very, just | *(cut)* |

## Framing that invites

**Open with the reader's why.** "Good work starts with a clear purpose" is better than "This section describes our work planning framework."

**Make headings promises or actions.** Prefer "Find your starting point" or "Choose a useful next step" to "Overview" or "Information". A reader scanning only the headings should know what they'll get.

**Be warm, not breathless.** Enticing means concrete and useful, not hyped. Avoid stacked exclamation marks, superlatives, and claims we can't support. Our tone is welcoming, direct, and honest about what isn't settled yet.

## Diagrams and visuals

**SVG is the standard published format for handbook diagrams.** It keeps lines and labels sharp when enlarged, can be edited as text, and can be reused outside the site. Use diagrams for cycles, branching workflows, systems, and hierarchies; use tables for comparisons and numbered lists for simple sequences. Photos and screenshots retain appropriate raster formats.

Store canonical diagram assets in `docs/public/diagrams/` with descriptive, lowercase, hyphenated names. Embed them with Markdown image syntax; VitePress adjusts the site's base path:

```md
![Act, Recruit, and Train form a repeating movement-building cycle.](/diagrams/movement-flywheel.svg)
```

- **Keep the SVG editable.** Include `xmlns`, a `viewBox`, a meaningful `<title>` and `<desc>`, and real `<text>` labels. Use local/system fonts, self-contained shapes, and no scripts, event handlers, external resources, embedded raster images, or `foreignObject` content.
- **Keep it readable.** Use a clear hierarchy, ample spacing, and contrasting text and arrows. The default handbook palette is yellow `#ffd60a`, dark ink `#111`, and white. Secondary colors can distinguish systems when labels also explain the distinction. Supplied diagrams retain their source palette until a visual redesign is reviewed. Do not rely on color alone. Check the rendered page at a narrow phone width; simplify or split a diagram whose labels require zooming, and provide a link to the full-size SVG.
- **Say it in words too.** Supply meaningful Markdown alt text and adjacent prose describing the relationships and any important limits. `<title>` and `<desc>` help when the SVG is opened directly; they do not replace the embedding image's alt text. Text equivalents also keep Markdown and LLM exports useful.

Mermaid may be used as an authoring tool. Export a reviewed SVG before publishing a new diagram; if retaining the Mermaid source, put it under `maintenance/diagram-sources/` and document the regeneration command beside it. The SVG is the published output, not a separately edited competing diagram. Existing Mermaid blocks remain supported and migrate incrementally when their pages are rewritten.

The imported `company-brain.svg` and `movement-flywheel.svg` come from `10-2 content additions/`. Originals stay intact as source inputs; published copies live in the asset directory. They illustrate a proposed systems model, not proof of exponential growth or approval of autonomous AI decisions.

Run `npm run diagrams:check` to validate the published SVG conventions, then inspect the diagram in the built page. Automated validation does not establish visual legibility or the accuracy of the model.

References: [VitePress asset handling](https://vitepress.dev/guide/asset-handling), [SVG title and description](https://www.w3.org/TR/SVG/struct.html).

## Page recipes

**Chapter overview.** A short Summary followed by links to numbered sections. Add a diagram only when it explains a useful relationship.

**Section page.** Summary, numbered named subsections, and links to canonical references beside their explanation. Keep essential expectations visible; use labelled blocks for optional depth or unresolved proposals.

**Glossary entry.** The term in bold, a one-sentence definition, and a link to where it's explained.

## Before you publish

Run three quick passes over your change:

1. **Skim.** Read only the headings and bold text. Do they tell the story?
2. **Tighten.** Read it aloud. Cut every word that doesn't change the meaning.
3. **Show.** Is there a flow, cycle, or hierarchy that a diagram or table would make obvious?

Then follow the build check in [CONTRIBUTING.md](CONTRIBUTING.md#check-before-publishing).
