import { escapeHTML } from '../html.mjs'

export const TREE_CSS = `
.slide[data-layout="tree"] { padding-top:40px; }
.slide[data-layout="tree"] h1 { font-size:64px; margin-bottom:26px; }
.diagram.tree-map { height:530px; }
.tree-node rect { stroke:var(--ink); stroke-width:3; }
.tree-map .tree-node .audience-text { font-family:'Barlow Condensed',sans-serif; font-weight:800; fill:var(--ink); }
.tree-node[data-dim="true"] rect { fill:var(--paper); stroke:#8d857a; stroke-width:2; }
.tree-node[data-ancestry="true"] rect { stroke:var(--ink); stroke-width:3; }
.tree-node[data-current="true"] rect { fill:var(--yellow); stroke:var(--coral); stroke-width:6; }
.tree-map .tree-node .current-tag { font:700 20px 'DM Sans',sans-serif; fill:var(--ink); }
.tree-edge { fill:none; stroke:var(--ink); stroke-width:4; stroke-linejoin:round; }
.tree-edge[data-dim="true"] { stroke:#8d857a; stroke-width:2; }
.tree-edge[data-ancestry="true"] { stroke:var(--ink); stroke-width:3; }
.tree-edge[data-current="true"] { stroke:var(--coral); stroke-width:5; }
`

export function renderTree(content, index) {
  const all = []
  function visit(node, parent = null, depth = 0, focused = !content.focus) {
    const active = focused || node.id === content.focus
    all.push({ ...node, parent, depth, active })
    for (const child of node.children ?? []) visit(child, node.id, depth + 1, active)
  }
  visit(content.tree)
  const byId = new Map(all.map(node => [node.id, node]))
  const revealed = new Set(content.reveal)
  const visible = all.filter(node => revealed.has(node.id))
  const ancestry = new Set()
  for (let node = byId.get(content.focus); node; node = byId.get(node.parent)) ancestry.add(node.id)
  const depth = Math.max(...visible.map(node => node.depth))
  // Each reveal uses the full canvas. New branches expand into the next row;
  // the previous goal and sibling branches remain as readable context.
  const rows = depth > 3 ? Array.from({ length: depth + 1 }, (_, level) => [(level + .5) * 530 / (depth + 1), 530 / (depth + 1) - 20])
    : depth <= 1 ? [[120, 112], [370, 148]]
    : depth === 2 ? [[58, 88], [218, 116], [422, 120]]
      : [[42, 68], [156, 110], [288, 80], [444, 136]]
  const positions = new Map()
  for (let level = 0; level <= depth; level++) {
    const nodes = visible.filter(node => node.depth === level)
    const [y, height] = rows[level]
    const weights = nodes.map(node => node.id === content.focus && nodes.length > 1 ? 1.4 : 1)
    const total = weights.reduce((sum, weight) => sum + weight, 0)
    let left = 8
    nodes.forEach((node, i) => {
      const slot = 1120 * weights[i] / total
      const width = level === 0 ? depth <= 1 ? 440 : 330 : slot - 24
      const fontSize = depth <= 1 ? level === 0 ? 60 : 48 : node.active ? 44 : 40
      positions.set(node.id, { x: left + slot / 2, y, width, height: height + (node.current ? 12 : 0), fontSize })
      left += slot
    })
  }
  const attributes = node => `${node.current ? ' data-current="true"' : ''}${!node.active ? ' data-dim="true"' : ''}${ancestry.has(node.id) ? ' data-ancestry="true"' : ''}`
  const edges = visible.filter(node => node.parent).map(node => {
    const parent = positions.get(node.parent), child = positions.get(node.id)
    const start = parent.y + parent.height / 2, end = child.y - child.height / 2
    const path = `M${parent.x} ${start}V${(start + end) / 2}H${child.x}V${end}`
    return `<path class="tree-edge" data-parent="${escapeHTML(node.parent)}" data-child="${escapeHTML(node.id)}"${attributes(node)} d="${path}"/>`
  }).join('')
  const nodes = visible.map(node => {
    const p = positions.get(node.id), lines = []
    const maxChars = Math.floor((p.width - 36) / (p.fontSize * .34))
    for (const word of node.label.split(/\s+/)) {
      if (lines.length && `${lines.at(-1)} ${word}`.length <= maxChars) lines[lines.length - 1] += ` ${word}`
      else lines.push(word)
    }
    const lineHeight = p.fontSize * 1.05
    const firstY = p.y + 5 - (lines.length - 1) * lineHeight / 2 - (node.current ? 14 : 0)
    const label = lines.map((line, i) => `<tspan x="${p.x}" dy="${i ? lineHeight : 0}">${escapeHTML(line)}${i < lines.length - 1 ? ' ' : ''}</tspan>`).join('')
    return `<g class="tree-node" data-node="${escapeHTML(node.id)}"${attributes(node)}><rect x="${p.x - p.width / 2}" y="${p.y - p.height / 2}" width="${p.width}" height="${p.height}" rx="14" fill="${['var(--coral)', 'var(--yellow)', 'var(--sage)', 'var(--paper)'][Math.min(node.depth, 3)]}"/><text class="audience-text" x="${p.x}" y="${firstY}" style="font-size:${p.fontSize}px" text-anchor="middle" dominant-baseline="middle">${label}</text>${node.current ? `<text class="current-tag" x="${p.x}" y="${p.y + p.height / 2 - 18}" text-anchor="middle" dominant-baseline="middle">You are here</text>` : ''}</g>`
  }).join('')
  const description = visible.map(node => `${node.label}${node.parent ? ` under ${byId.get(node.parent).label}` : ''}${node.current ? ' (You are here)' : ''}`).join('; ')
  return `<svg class="diagram tree-map" viewBox="0 0 1136 530" role="img" aria-labelledby="tree-title-${index} tree-desc-${index}"><title id="tree-title-${index}">Strategy tree</title><desc id="tree-desc-${index}">${escapeHTML(description)}</desc>${edges}${nodes}</svg>`
}
