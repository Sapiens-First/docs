import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Deterministic deck generator: the formula is written down in
// maintenance/generated-slides.md. Same page text in, same deck JSON out.
export const FORMULA_VERSION = 1
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MAX_LABEL_WORDS = 5
const words = text => text.split(/\s+/).filter(Boolean).length
const DURATION = { opening: 45, divider: 10, content: 30 }

const plain = value => value
  .replace(/\{#[\w-]+\}\s*$/, '')
  .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/(\*\*|__|\*|`)/g, '')
  .replace(/\s+/g, ' ').trim()

const frontmatter = lines => {
  if (lines[0] !== '---') return { data: {}, end: 0 }
  const close = lines.indexOf('---', 1)
  const data = {}
  for (const line of lines.slice(1, close)) {
    const match = line.match(/^([\w_]+):\s*(.*?)\s*$/)
    if (match) data[match[1]] = match[2].replace(/^(["'])(.*)\1$/, '$2')
  }
  return { data, end: close + 1 }
}

const LIST_ITEM = /^(?:[-*]|\d+[.)])\s+(.*)$/
const kindOf = line => {
  if (/^#{3,6}\s/.test(line)) return 'subheading'
  if (/^\s*```/.test(line)) return 'code'
  if (/^:::/.test(line)) return 'container'
  if (/^\s*<!--/.test(line)) return 'comment'
  if (/^\s*\|/.test(line)) return 'table'
  if (/^>/.test(line)) return 'quote'
  if (/^\s+(?:[-*]|\d+[.)])\s/.test(line)) return 'nested'
  if (LIST_ITEM.test(line)) return 'list'
  return 'paragraph'
}

/** Splits one section's lines (1-based `first`..`last`) into blocks of a single kind each. */
function blocksOf(lines, first, last) {
  const blocks = []
  let n = first
  while (n <= last) {
    const line = lines[n - 1]
    if (!line.trim()) { n++; continue }
    const kind = kindOf(line)
    let end = n
    if (kind === 'code') {
      end = n + 1
      while (end <= last && !/^\s*```/.test(lines[end - 1])) end++
    } else if (kind === 'container') {
      end = n
      if (!/^:::\s*$/.test(line)) { end = n + 1; while (end <= last && !/^:::\s*$/.test(lines[end - 1])) end++ }
    } else if (kind === 'comment') {
      while (end <= last && !/-->\s*$/.test(lines[end - 1])) end++
    } else if (kind === 'subheading') {
      end = n
    } else {
      const continues = next => next.trim() && (kindOf(next) === kind || (kind === 'list' && /^\s+\S/.test(next) && kindOf(next) !== 'nested'))
      while (end + 1 <= last && continues(lines[end])) end++
    }
    end = Math.min(end, last)
    blocks.push({ kind, start: n, end })
    n = end + 1
  }
  return blocks
}

export function generateDeck(pagePath, { slug } = {}) {
  const absolute = resolve(pagePath)
  const bytes = readFileSync(absolute)
  const source = bytes.toString('utf8')
  if (source.includes('\r')) throw new Error(`${pagePath}: convert CRLF line endings before generating`)
  const lines = source.split('\n')
  const { data: meta, end: metaEnd } = frontmatter(lines)
  const pageId = meta.handbook_id
  if (!pageId) throw new Error(`${pagePath}: handbook_id required`)
  const deckSlug = slug ?? meta.slides
  if (!deckSlug) throw new Error(`${pagePath}: no slides: mapping; generation never infers a deck`)
  const h1Line = lines.findIndex((line, i) => i >= metaEnd && /^# /.test(line)) + 1
  if (!h1Line) throw new Error(`${pagePath}: no H1`)
  const flags = []
  const flag = (kind, start, end, message) => flags.push({ kind, start, end, message })

  // Sections: every H2 starts one; the first (normally Summary) ends the opening.
  const h2 = lines.flatMap((line, i) => /^## /.test(line) ? [i + 1] : [])
  const bounds = h2.map((start, i) => ({ start, end: (h2[i + 1] ?? lines.length + 1) - 1, heading: plain(lines[start - 1].slice(3)) }))
  const lastNonblank = n => { while (n > 0 && !lines[n - 1].trim()) n--; return n }
  const slides = []
  const add = (layout, role, title, content, ranges, duration) => {
    const id = `${pageId}-${String(slides.length + 1).padStart(2, '0')}`
    slides.push({ id, layout, purpose: 'explain', role, title, content, durationSeconds: duration, notes: { sourceRanges: ranges } })
    return slides.at(-1)
  }
  const attach = (start, end) => slides.at(-1).notes.sourceRanges.push({ start, end })

  const summary = bounds.find(b => b.heading === 'Summary')
  const summaryEnd = summary ? lastNonblank(summary.end) : h1Line
  const summaryText = summary ? blocksOf(lines, summary.start + 1, summary.end).filter(b => b.kind === 'paragraph').map(b => plain(lines.slice(b.start - 1, b.end).join(' '))).join(' ') : ''
  const summaryWords = summaryText ? summaryText.split(' ').length : 0
  const openingLines = summaryWords && summaryWords <= MAX_LABEL_WORDS ? [summaryText] : []
  if (summaryWords > MAX_LABEL_WORDS) flag('long-summary', summary.start, summaryEnd, `Summary has ${summaryWords} words (limit ${MAX_LABEL_WORDS}) and stays in the notes only.`)
  add('statement', 'content', plain(lines[h1Line - 1].slice(2)), { lines: openingLines }, [{ start: 1, end: summaryEnd }], DURATION.opening)
  const divider = (bound) => add('divider', 'buffer', bound.heading, {}, [{ start: bound.start, end: bound.start }], DURATION.divider)
  if (summary) divider(summary)

  for (const bound of bounds) {
    if (bound === summary) continue
    divider(bound)
    for (const block of blocksOf(lines, bound.start + 1, bound.end)) {
      const text = lines.slice(block.start - 1, block.end)
      const range = [{ start: block.start, end: block.end }]
      if (block.kind === 'comment') { attach(block.start, block.end); continue }
      if (block.kind === 'subheading') {
        add('statement', 'content', plain(text[0].replace(/^#+\s*/, '')), { lines: [] }, range, DURATION.content)
        continue
      }
      if (block.kind === 'list') {
        const items = []
        for (const line of text) {
          const item = line.match(LIST_ITEM)
          if (item) items.push(item[1]); else items[items.length - 1] += ` ${line.trim()}`
        }
        // "[Label](link) — description": the link text is the label; the description stays in the notes.
        for (let i = 0; i < items.length; i++) items[i] = plain(items[i].match(/^\[([^\]]+)\]\([^)]*\)\s+[—–-]\s+/)?.[1] ?? items[i])
        const layout = { 1: 'statement', 2: 'pair', 3: 'triad', 4: 'steps' }[items.length]
        const tooLong = items.find(item => words(item) > MAX_LABEL_WORDS)
        if (layout && tooLong) {
          flag('long-label', block.start, block.end, `An item under "${bound.heading}" has more than ${MAX_LABEL_WORDS} words; the slide shows only its heading and the list stays in the notes.`)
          add('statement', 'content', bound.heading, { lines: [] }, range, DURATION.content)
        } else if (!layout) {
          flag('long-list', block.start, block.end, `${items.length} items under "${bound.heading}"; every item is kept in the notes. Split or handcraft.`)
          add('statement', 'content', bound.heading, { lines: [] }, range, DURATION.content)
        } else add(layout, 'content', bound.heading, layout === 'statement' ? { lines: items } : { labels: items }, range, DURATION.content)
        continue
      }
      if (block.kind === 'paragraph') {
        const joined = plain(text.join(' '))
        const definition = text.join(' ').match(/^\*\*([^*]+?):?\*\*:?\s+(.+)$/)
        if (definition) add('pair', 'content', bound.heading, { labels: [plain(definition[1]), plain(definition[2])] }, range, DURATION.content)
        else if (words(joined) > MAX_LABEL_WORDS) {
          flag('long-paragraph', block.start, block.end, `A paragraph under "${bound.heading}" has more than ${MAX_LABEL_WORDS} words; the slide shows only its heading and the paragraph stays in the notes.`)
          add('statement', 'content', bound.heading, { lines: [] }, range, DURATION.content)
        } else add('statement', 'content', bound.heading, { lines: [joined] }, range, DURATION.content)
        continue
      }
      flag(`unsupported-${block.kind}`, block.start, block.end, `${block.kind} under "${bound.heading}" has no slide layout; its source is kept in the notes.`)
      attach(block.start, block.end)
    }
  }
  // Text before the first H2 (after the H1) belongs to the opening notes.
  const first = h2[0] ?? lines.length + 1
  if (summary && summary.start !== first) throw new Error(`${pagePath}: Summary must be the first H2`)

  const total = slides.reduce((sum, slide) => sum + slide.durationSeconds, 0)
  const sorted = slides.map(slide => ({ ...slide, notes: { ...slide.notes, sourceRanges: mergeRanges(slide.notes.sourceRanges) } }))
  return {
    schemaVersion: 1,
    id: `${deckSlug}-generated`,
    title: plain(lines[h1Line - 1].slice(2)),
    slug: deckSlug,
    origin: 'generated',
    approved: false,
    lastUpdated: meta.last_updated,
    covers: [pageId],
    targetDurationSeconds: total,
    source: { path: relative(repoRoot, absolute).split('\\').join('/'), sha256: createHash('sha256').update(bytes).digest('hex'), text: source },
    sourceGaps: [],
    sourceClassifications: [],
    editorialReview: [],
    slides: sorted,
    ruleExceptions: slides.length > 10 ? [{ rule: '10-20-30', text: 'slide count', reason: 'Generated formula: one divider per H2 plus one slide per source block; review for splitting or handcrafting.' }] : [],
    sourceOrder: 'original',
    generation: { formulaVersion: FORMULA_VERSION, flags },
  }
}

function mergeRanges(ranges) {
  const out = []
  for (const range of ranges) {
    const previous = out.at(-1)
    if (previous && range.start <= previous.end + 1 && range.start >= previous.start) previous.end = Math.max(previous.end, range.end)
    else out.push({ ...range })
  }
  return out
}
