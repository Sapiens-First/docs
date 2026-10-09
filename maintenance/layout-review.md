# Handbook layout review

Reviewed 2026-10-09 against the built handbook. The existing warm paper, ink, coral and yellow palette also appears in the DNA slides, so the handbook keeps those shared colours.

| Finding | Change |
| --- | --- |
| The chapter map and sidebar gave no indication that a page was an outline or still incomplete. | Read statuses from frontmatter and show symbols on chapter and page links. The contents legend explains every status; hovering over a symbol exposes its construction note. |
| The handbook guide described the old five-chapter structure and had no complete contents view. | Explain the six training chapters and Appendix E; reuse the same contents component in a compact, single-column layout. |
| New outlines could look like ready-to-use training material. | Show a planned-module banner and the page's construction note before the content. |
| The mobile home title broke the word “Handbook” when web fonts were unavailable. | Reduce the minimum display size and wrap at word boundaries. Check the fallback fonts as well as the normal page layout. |
| The expanded chapter menu overflowed the tablet navbar at 768px. | Use the existing expandable navigation menu through 959px, where the desktop sidebar begins. Verify the menu opens and exposes the new chapters. |
| Long chapter labels exceeded their column at 320px. | Scale labels down on narrow screens, constrain their width, and start the two-column chapter layout at 960px. |
| Planned chapters did not explain how they relate to existing guidance. | Add purpose summaries, links to the existing organizer and training field guides, and explicit scope notes on the chapter landings. |

The layout uses flexible columns, wrapping legend items, visible keyboard focus, and the existing dark-mode colours. Browser evidence is kept under `/tmp/handbook-restructure-evidence/`; check results name each route, viewport and theme. Downloadable-book generation separately checks that chapter navigation still supplies the HTML, PDF and EPUB builders.

The next layout work depends on slide publication: add a Trainings view connecting each explicitly mapped module to its handbook pages, Present button and Presenter notes button. Keep handcrafted decks hidden until approved and label generated decks on every surface. Do this after the concurrent slide edits and metadata changes are integrated.
