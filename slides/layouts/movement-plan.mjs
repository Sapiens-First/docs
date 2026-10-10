import { escapeHTML } from '../html.mjs'

export const MOVEMENT_CSS = `
.diagram.movement-map { height:430px; }
.movement-map .movement-stage .node { fill:var(--paper); stroke:var(--ink); stroke-width:2; }
.movement-map .movement-stage[data-highlight="true"] .node { fill:var(--coral); stroke-width:5; }
.movement-map .movement-stage text.audience-text { font:400 40px 'DM Sans',sans-serif; fill:var(--ink); }
.movement-map .stage-number { font:700 24px 'DM Sans',sans-serif; fill:var(--ink); }
.movement-map .stage-number-badge { fill:var(--sage); stroke:var(--ink); stroke-width:1.5; }
.movement-map .movement-stage[data-highlight="true"] .stage-number-badge { fill:var(--yellow); }
.movement-map .edge { stroke:var(--ink); stroke-width:3; fill:none; }
`

export function renderMovementPlan(content, index) {
  const marker = `movement-arrow-${index}`
  const positions = content.stages.map((_, i) => ({ x: 16 + (i < 4 ? i : 7 - i) * 284, y: i < 4 ? 10 : 235 }))
  const edges = positions.slice(1).map((position, i) => {
    const previous = positions[i]
    const path = i === 3 ? `M${previous.x + 124} ${previous.y + 185}V${position.y}`
      : i < 3 ? `M${previous.x + 248} ${previous.y + 92.5}H${position.x}`
      : `M${previous.x} ${previous.y + 92.5}H${position.x + 248}`
    return `<path class="edge" data-from="${i + 1}" data-to="${i + 2}" d="${path}" marker-end="url(#${marker})"/>`
  }).join('')
  const nodes = content.stages.map((stage, i) => {
    const { x, y } = positions[i]
    const lines = []
    for (const word of stage.split(/\s+/)) {
      if (lines.length && `${lines.at(-1)} ${word}`.length <= 10) lines[lines.length - 1] += ` ${word}`
      else lines.push(word)
    }
    const firstLine = y + 109 - (lines.length - 1) * 23
    const label = lines.map((line, lineIndex) => `<tspan x="${x + 124}" dy="${lineIndex ? 46 : 0}">${escapeHTML(line)}${lineIndex < lines.length - 1 ? ' ' : ''}</tspan>`).join('')
    return `<g class="movement-stage" data-stage="${i + 1}"${i === content.highlight ? ' data-highlight="true"' : ''}><rect class="node" x="${x}" y="${y}" width="248" height="185" rx="16"/><circle class="stage-number-badge" cx="${x + 26}" cy="${y + 24}" r="17"/><text class="stage-number" x="${x + 26}" y="${y + 24}" text-anchor="middle" dominant-baseline="middle" aria-hidden="true">${i + 1}</text><text class="audience-text" x="${x + 124}" y="${firstLine}" text-anchor="middle" dominant-baseline="middle">${label}</text></g>`
  }).join('')
  const description = `Bill Moyer’s eight-stage Movement Action Plan: ${content.stages.map((stage, i) => `${i + 1}. ${stage}`).join('; ')}. Read left to right across the top, then right to left across the bottom. Stage four, Take off, follows a trigger event. Stage five names activists’ perceived failure, not the end of the movement. This is an orientation to the model, not a prediction or a timetable.`
  return `<svg class="diagram movement-map" viewBox="0 0 1136 430" role="img" aria-labelledby="movement-title-${index} movement-desc-${index}"><title id="movement-title-${index}">Movement Action Plan</title><desc id="movement-desc-${index}">${escapeHTML(description)}</desc><defs><marker id="${marker}" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" refX="12" refY="6" orient="auto"><path d="M0 0L12 6L0 12Z" fill="var(--ink)"/></marker></defs>${edges}${nodes}</svg>`
}
