import { escapeHTML } from '../html.mjs'

export const ORGANIZER_CSS = `
.diagram.branching-map .shared-node { fill:var(--paper); }
.branching-map .branch-title { font:800 58px 'Barlow Condensed',sans-serif; text-transform:uppercase; }
.branching-map .branch-outcome { font:400 40px 'DM Sans',sans-serif; }
.slide[data-slide-id="meetings-system"] { display:flex; flex-direction:column; justify-content:center; }
.slide[data-slide-id="meetings-system"] h1 { font-size:128px; max-width:920px; margin-bottom:28px; }
.slide[data-slide-id="meetings-system"] .statement-lines { margin:0; }
.slide[data-slide-id="meetings-system"] .statement-lines li { padding:0; background:none; border:0; box-shadow:none; font-size:48px; }
.slide[data-slide-id="meetings-parts"] .triad li:first-child { background:var(--paper); }
.slide[data-slide-id="meetings-parts"] .triad li:nth-child(2) { background:var(--coral); }
.slide[data-slide-id="meetings-parts"] .triad li:nth-child(3) { background:var(--sage); }
.slide[data-slide-id="meetings-parts"] .triad li,.slide[data-slide-id="meetings-teams"] .triad li { border-radius:24px; box-shadow:4px 4px 0 var(--ink); gap:40px; min-height:320px; }
.slide[data-slide-id="meetings-tactical-question"] { background:var(--coral); }
.slide[data-slide-id="meetings-governance-question"] { background:var(--sage); }
.slide[data-slide-id="meetings-tactical-question"] h1,.slide[data-slide-id="meetings-governance-question"] h1 { font-size:124px; max-width:970px; }
.slide[data-slide-id="meetings-tactical-question"] h1::after,.slide[data-slide-id="meetings-governance-question"] h1::after { content:''; display:block; width:240px; height:12px; margin-top:32px; background:var(--ink); transform:rotate(-2deg); }
.slide[data-slide-id="meetings-teams"] .triad li { background:var(--paper); }
.slide[data-slide-id="meetings-culture"] .triad li { padding:18px 28px; gap:32px; }
.slide[data-slide-id="meetings-culture"] .triad li:first-child { background:var(--paper); }
.slide[data-slide-id="meetings-culture"] .triad li:nth-child(2) { background:var(--sage); }
.slide[data-slide-id="meetings-culture"] .triad li:nth-child(3) { background:var(--coral); }
.slide[data-slide-id="meetings-culture"] .point-icon { width:64px; height:64px; }
.slide[data-slide-id="meetings-culture"] .caption { margin:18px 0 0 124px; }
`

export function organizerIcon(label) {
  const paths = {
    'Check-ins': '<path d="M10 10H54V43H29L17 54V43H10Z"/><circle cx="21" cy="27" r="1.5"/><circle cx="32" cy="27" r="1.5"/><circle cx="43" cy="27" r="1.5"/>',
    Tactical: '<path d="M37 6L13 36H30L26 58L51 27H34Z"/>',
    Governance: '<circle cx="32" cy="14" r="9"/><circle cx="13" cy="49" r="9"/><circle cx="51" cy="49" r="9"/><path d="M27 22L17 41M37 22L47 41M22 49H42"/>',
    Community: '<circle cx="32" cy="17" r="8"/><circle cx="12" cy="23" r="6"/><circle cx="52" cy="23" r="6"/><path d="M19 55V43Q19 31 32 31Q45 31 45 43V55M4 52V42Q4 33 13 33M60 52V42Q60 33 51 33"/>',
    Actions: '<path d="M14 56V8M14 10H51L42 23L51 36H14"/>',
    Research: '<circle cx="27" cy="27" r="19"/><path d="M41 41L57 57M18 27H36M27 18V36"/>',
    Boundaries: '<path d="M32 6L53 15V32Q53 46 32 58Q11 46 11 32V15Z"/><path d="M21 32H43"/>',
  }
  const iconLabel = { 'Share the space.': 'Check-ins', 'Radical inclusivity.': 'Community', 'Clear red lines.': 'Boundaries' }[label] ?? label
  return `<svg class="point-icon" viewBox="0 0 64 64" aria-hidden="true">${paths[iconLabel] ?? ''}</svg>`
}

export function renderBranchingSteps(content, index) {
  const [agenda, items, ...outcomes] = content.labels
  const marker = `branch-arrow-${index}`
  const text = (value, x, y) => `<text class="audience-text" x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${escapeHTML(value)}</text>`
  const branches = outcomes.map((value, i) => {
    const separator = value.indexOf(': '), x = 16 + i * 576, center = x + 264
    return `<g class="outcome-node"><rect class="node" x="${x}" y="240" width="528" height="134" rx="22" style="fill:var(--${i ? 'sage' : 'coral'})"/><text class="audience-text" text-anchor="middle" dominant-baseline="middle"><tspan class="branch-title" x="${center}" y="290">${escapeHTML(value.slice(0, separator + 1))} </tspan><tspan class="branch-outcome" x="${center}" y="343">${escapeHTML(value.slice(separator + 2))}</tspan></text></g>`
  }).join('')
  const description = `Shared process: ${agenda}; ${items}. Outcomes: ${outcomes.join('; ')}. Both meeting formats follow the same process, then produce different outcomes.`
  return `<svg class="diagram branching-map" viewBox="0 0 1136 390" role="img" aria-labelledby="branch-title-${index} branch-desc-${index}"><title id="branch-title-${index}">Shared meeting process</title><desc id="branch-desc-${index}">${escapeHTML(description)}</desc><defs><marker id="${marker}" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" refX="12" refY="6" orient="auto"><path d="M0 0L12 6L0 12Z" fill="var(--ink)"/></marker></defs><path class="edge" marker-end="url(#${marker})" d="M568 78V112"/><path class="edge" marker-end="url(#${marker})" d="M568 182V211H280V240"/><path class="edge" marker-end="url(#${marker})" d="M568 211H856V240"/><rect class="node shared-node" x="250" y="8" width="636" height="70" rx="18" style="fill:var(--yellow)"/>${text(agenda, 568, 43)}<rect class="node shared-node" x="250" y="112" width="636" height="70" rx="18"/>${text(items, 568, 147)}${branches}</svg>`
}
