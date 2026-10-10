import { createHash } from 'node:crypto'
import { readFileSync, mkdirSync, writeFileSync, renameSync, rmSync, realpathSync } from 'node:fs'
import { resolve, dirname, basename, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateDeck } from './generate.mjs'
import { escapeHTML } from './html.mjs'
import { renderTree, TREE_CSS } from './layouts/strategy-tree.mjs'
import { renderMovementPlan, MOVEMENT_CSS } from './layouts/movement-plan.mjs'

const layouts = ['statement', 'triad', 'cycle', 'question', 'steps', 'roles', 'divider', 'impact', 'values', 'pair', 'circles', 'choice', 'pyramid', 'montage', 'agenda', 'tree', 'photo', 'figure', 'movement', 'actions']
const sections = { story: 'Story', strategy: 'Strategy', culture: 'Culture', structure: 'Structure' }
const topicalGraphics = ['book', 'route', 'hands', 'nested', 'signpost']
const purposes = ['explain', 'engage', 'empower']
const words = text => text.trim().split(/\s+/).filter(Boolean).length
const hash = text => createHash('sha256').update(text).digest('hex')
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = value => typeof value === 'string' && value.trim().length > 0
const validExceptions = entries => Array.isArray(entries) && entries.every(e => object(e) && ['1-6-6', '5-5-5', '10-20-30'].includes(e.rule) && text(e.reason) && text(e.text))
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const assetsRoot = resolve(dirname(fileURLToPath(import.meta.url)), 'assets')
const httpsURL = value => { try { return text(value) && new URL(value).protocol === 'https:' } catch { return false } }

function imageAsset(image) {
  if (!object(image) || !text(image.path) || !/^assets\/[\w./-]+\.(jpg|jpeg|png|webp|svg)$/i.test(image.path) || image.path.split('/').includes('..')) throw new Error('image path must name a local JPEG, PNG, WebP or SVG in assets/')
  for (const key of ['alt', 'credit']) if (!text(image[key])) throw new Error(`image ${key} must be nonempty text`)
  for (const key of ['sourceUrl', 'licenseUrl']) if (!httpsURL(image[key])) throw new Error(`image ${key} must be an HTTPS URL`)
  if (image.position !== undefined && !['center', 'top', 'bottom'].includes(image.position)) throw new Error('image position must be center, top or bottom')
  if (image.treatment !== undefined && !['background', 'artistic'].includes(image.treatment)) throw new Error('image treatment must be background or artistic')
  const path = realpathSync(resolve(assetsRoot, image.path.slice(7)))
  if (!path.startsWith(realpathSync(assetsRoot) + sep)) throw new Error('image must remain inside assets/')
  const bytes = readFileSync(path), extension = extname(path).toLowerCase()
  const jpeg = bytes.length > 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  const webp = bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
  const svg = extension === '.svg' && /^\s*(?:<\?xml[^>]*>\s*)?<svg\b[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"[\s\S]*<\/svg>\s*$/.test(bytes.toString('utf8'))
  const type = ['.jpg', '.jpeg'].includes(extension) && jpeg ? 'jpeg' : extension === '.png' && png ? 'png' : extension === '.webp' && webp ? 'webp' : extension === '.svg' && svg ? 'svg+xml' : null
  if (!type) throw new Error('image bytes do not match its JPEG, PNG, WebP or SVG extension')
  return `data:image/${type};base64,${bytes.toString('base64')}`
}

function treeNodes(root, parent = null, depth = 0) {
  return [{ ...root, parent, depth }, ...(root.children ?? []).flatMap(child => treeNodes(child, root.id, depth + 1))]
}

// These are the authored audience lines; notes and presentation chrome are excluded.
export function audienceLines(slide) {
  const result = [{ kind: 'title', text: slide.title }]
  if (slide.sectionLabel) result.push({ kind: 'sectionLabel', text: slide.sectionLabel })
  const content = slide.content
  for (const value of content.lines ?? content.labels ?? []) result.push({ kind: 'point', text: value })
  for (const value of content.descriptions ?? content.stages ?? []) result.push({ kind: 'point', text: value })
  if (slide.layout === 'actions') for (const value of content.links ?? []) result.push({ kind: 'point', text: value })
  if (slide.layout === 'tree') for (const node of treeNodes(content.tree)) {
    if (content.reveal.includes(node.id)) result.push({ kind: 'point', text: node.label })
  }
  if (content.circle) result.push({ kind: 'point', text: content.circle })
  for (const value of content.roles ?? []) result.push({ kind: 'point', text: value })
  if (content.caption) result.push({ kind: 'caption', text: content.caption })
  return result
}

export function assembleNotes(deck, slide) {
  const lines = deck.source.text.split('\n')
  return {
    slideId: slide.id,
    passages: slide.notes.sourceRanges.map(({ start, end }) => lines.slice(start - 1, end).join('\n')),
    cues: slide.notes.cues ?? [],
  }
}

export function validateDeck(deck) {
  const report = { errors: [], findings: [], coverage: { uncovered: [], duplicated: [], classified: [] }, notes: [], slideCount: 0, durationSeconds: 0 }
  const fail = message => report.errors.push(message)
  if (!object(deck)) { fail('Deck must be an object'); return report }
  if (deck.schemaVersion !== 1) fail('Unsupported schema version; expected schemaVersion 1')
  if (deck.sourceOrder !== undefined && !['original', 'presentation'].includes(deck.sourceOrder)) fail('sourceOrder must be original or presentation')
  for (const key of ['id', 'title']) if (!text(deck[key])) fail(`Deck ${key} must be nonempty text`)
  if (!Number.isInteger(deck.targetDurationSeconds) || deck.targetDurationSeconds <= 0) fail('targetDurationSeconds must be a positive integer')
  if (deck.ruleExceptions !== undefined && !validExceptions(deck.ruleExceptions)) fail('Deck ruleExceptions require rule, reason and affected text')
  if (!object(deck.source) || !text(deck.source.text) || !text(deck.source.path) || !text(deck.source.sha256)) {
    fail('source requires path, sha256 and complete text'); return report
  }
  if (hash(deck.source.text) !== deck.source.sha256) fail('Source snapshot digest mismatch: refresh the source map and sha256 explicitly')
  const sourcePath = resolve(repoRoot, deck.source.path)
  try {
    if (hash(readFileSync(sourcePath)) !== deck.source.sha256) fail('Original source changed: refresh the source snapshot, digest and line mapping explicitly')
  } catch (error) { if (error.code !== 'ENOENT') throw error }
  if (!Array.isArray(deck.slides) || !deck.slides.length) { fail('slides must be a nonempty array'); return report }
  const lines = deck.source.text.split('\n')
  const coverage = Array.from(lines, () => [])
  const classified = new Map()
  const validRange = (range, owner) => {
    if (!object(range) || !Number.isInteger(range.start) || !Number.isInteger(range.end) || range.start < 1 || range.end < range.start || range.end > lines.length) {
      fail(`${owner}: invalid source range (expected inclusive 1–${lines.length})`); return false
    }
    return true
  }
  // Only literal headings and the original agenda may be excluded from spoken notes.
  const agendaLines = new Set()
  for (let i = 0; i < lines.length; i++) {
    if (/^This presentation aims to answer/.test(lines[i])) {
      agendaLines.add(i + 1)
      for (let j = i + 1; j < lines.length && /^\d+\. /.test(lines[j]); j++) agendaLines.add(j + 1)
    }
  }
  for (const [key, entries] of [['sourceClassifications', deck.sourceClassifications ?? []], ['sourceGaps', deck.sourceGaps ?? []]]) {
    if (!Array.isArray(entries)) { fail(`${key} must be an array`); continue }
    for (const entry of entries) {
      if (!validRange(entry, key)) continue
      if (!text(entry.reason ?? entry.explanation)) fail(`${key}: supply a reason or explanation`)
      if (key === 'sourceClassifications' && !['heading', 'agenda'].includes(entry.kind)) fail(`${key}: unsupported classification kind`)
      for (let n = entry.start; n <= entry.end; n++) {
        const value = lines[n - 1].trim()
        const isHeading = /^#{1,6}\s+/.test(value) || /^\*\*[^*]+\*\*$/.test(value)
        const allowed = !value || (key === 'sourceGaps' || entry.kind === 'heading' ? isHeading : agendaLines.has(n))
        if (!allowed) fail(`${key}: line ${n} is substantive and cannot be classified away`)
        else classified.set(n, entry.kind ?? 'gap')
      }
    }
  }
  const ids = new Set()
  let lastSourceLine = 0
  for (const [index, slide] of deck.slides.entries()) {
    const owner = text(slide?.id) ? slide.id : `slide ${index + 1}`
    if (!object(slide)) { fail(`${owner}: slide must be an object`); continue }
    if (!text(slide.id)) fail(`${owner}: id required`)
    else if (ids.has(slide.id)) fail(`${owner}: duplicate slide ID`)
    ids.add(slide.id)
    if (!layouts.includes(slide.layout)) fail(`${owner}: unsupported layout ${slide.layout}`)
    if (!purposes.includes(slide.purpose)) fail(`${owner}: purpose must be explain, engage or empower`)
    if (!['content', 'buffer'].includes(slide.role)) fail(`${owner}: role must be content or buffer`)
    if (!text(slide.title)) fail(`${owner}: title required`)
    if (slide.sectionLabel !== undefined && !text(slide.sectionLabel)) fail(`${owner}: sectionLabel must be text`)
    if (slide.section !== undefined && (!text(slide.section) || !Object.hasOwn(sections, slide.section))) fail(`${owner}: unsupported section`)
    if (slide.tone !== undefined && !['paper', 'dark', 'coral', 'yellow', 'sunrise', 'sage'].includes(slide.tone)) fail(`${owner}: unsupported tone`)
    if (slide.image !== undefined) { try { imageAsset(slide.image) } catch (error) { fail(`${owner}: ${error.message}`) } }
    if (slide.referenceImage !== undefined) { try { imageAsset(slide.referenceImage) } catch (error) { fail(`${owner}: ${error.message}`) } }
    if (slide.image?.treatment !== undefined && slide.layout !== 'statement') fail(`${owner}: image treatment is supported only for statement slides`)
    if (slide.images !== undefined) {
      if (slide.layout !== 'montage') fail(`${owner}: images are supported only for montage slides`)
      if (!Array.isArray(slide.images) || slide.images.length !== 2) fail(`${owner}: images requires exactly two images`)
      else for (const image of slide.images) {
        try { imageAsset(image) } catch (error) { fail(`${owner}: ${error.message}`) }
        if (image?.treatment !== undefined) fail(`${owner}: montage images do not support treatment`)
      }
    }
    if (slide.layout === 'montage' && slide.images === undefined) fail(`${owner}: montage requires two images`)
    if (slide.layout === 'montage' && slide.image !== undefined) fail(`${owner}: montage uses images, not image`)
    if (slide.graphic !== undefined && !['contours', 'arcs', ...topicalGraphics].includes(slide.graphic)) fail(`${owner}: unsupported graphic`)
    if (topicalGraphics.includes(slide.graphic) && slide.layout !== 'divider') fail(`${owner}: topical graphics require a divider`)
    if (!Number.isInteger(slide.durationSeconds) || slide.durationSeconds <= 0) fail(`${owner}: durationSeconds must be a positive integer`)
    else report.durationSeconds += slide.durationSeconds
    if (!object(slide.content)) { fail(`${owner}: content must be an object`); continue }
    const c = slide.content
    const labelArray = (key, min, max) => {
      if (!Array.isArray(c[key]) || c[key].length < min || c[key].length > max || !c[key].every(text)) fail(`${owner}: ${key} requires ${min}–${max} nonempty strings`)
    }
    const allowedContent = { statement: ['lines'], triad: ['labels', 'direction', 'highlight', 'highlightStep', 'links', 'caption'], cycle: ['labels'], question: [], steps: ['labels', 'caption', 'mode'], roles: ['circle', 'roles', 'caption'], divider: [], impact: ['caption'], values: ['labels', 'descriptions'], pair: ['labels', 'caption'], circles: ['circle', 'labels', 'link', 'caption'], choice: ['labels'], photo: ['caption'], figure: ['caption'], pyramid: ['labels', 'caption'], montage: [], agenda: ['labels'], tree: ['tree', 'reveal', 'focus'], movement: ['stages', 'highlight', 'caption'], actions: ['labels', 'descriptions', 'links', 'caption'] }[slide.layout]
    if (allowedContent) for (const key of Object.keys(c)) if (!allowedContent.includes(key)) fail(`${owner}: unsupported content field ${key}`)
    if (slide.layout === 'statement') labelArray('lines', 0, 2)
    if (['triad', 'cycle'].includes(slide.layout)) labelArray('labels', 3, 3)
    if (slide.layout === 'triad' && c.direction !== undefined && c.direction !== 'horizontal') fail(`${owner}: unsupported triad direction`)
    if (slide.layout === 'triad' && c.highlight !== undefined && (!Number.isInteger(c.highlight) || c.highlight < 0 || c.highlight >= (c.labels?.length ?? 0))) fail(`${owner}: highlight must index a triad label`)
    if (slide.layout === 'triad' && c.highlightStep !== undefined && (c.highlightStep !== true || c.highlight === undefined)) fail(`${owner}: highlightStep must be true and requires highlight`)
    if (['photo', 'figure'].includes(slide.layout) && slide.image === undefined) fail(`${owner}: ${slide.layout} requires an image`)
    if (c.links !== undefined && (!['triad', 'actions'].includes(slide.layout) || !Array.isArray(c.links) || c.links.length !== c.labels?.length || !c.links.every(text))) fail(`${owner}: links must be one nonempty string per action label`)
    if (c.descriptions !== undefined && (!['values', 'actions'].includes(slide.layout) || !Array.isArray(c.descriptions) || c.descriptions.length !== c.labels?.length || !c.descriptions.every(text))) fail(`${owner}: descriptions must be one nonempty string per label`)
    if (slide.layout === 'actions') { labelArray('labels', 3, 3); labelArray('links', 3, 3) }
    if (slide.layout === 'movement') {
      labelArray('stages', 8, 8)
      if (c.highlight !== undefined && (!Number.isInteger(c.highlight) || c.highlight < 0 || c.highlight > 7)) fail(`${owner}: highlight must index a movement stage`)
    }
    if (c.link !== undefined && (slide.layout !== 'circles' || !text(c.link))) fail(`${owner}: link must be nonempty text on a circles slide`)
    if (slide.layout === 'agenda') labelArray('labels', 3, 6)
    if (slide.layout === 'tree') {
      const nodes = new Map()
      let currentCount = 0
      const visit = (node, parent = null) => {
        if (!object(node) || !text(node.id) || !text(node.label)) { fail(`${owner}: tree nodes require id and label`); return }
        if (nodes.has(node.id)) { fail(`${owner}: duplicate tree node id ${node.id}`); return }
        nodes.set(node.id, { node, parent })
        for (const key of Object.keys(node)) if (!['id', 'label', 'children', 'current'].includes(key)) fail(`${owner}: unsupported tree node field ${key}`)
        if (node.current !== undefined && typeof node.current !== 'boolean') fail(`${owner}: current must be boolean`)
        if (node.current === true) currentCount++
        if (node.children !== undefined && !Array.isArray(node.children)) fail(`${owner}: tree children must be an array`)
        else for (const child of node.children ?? []) visit(child, node.id)
      }
      visit(c.tree)
      if (currentCount > 1) fail(`${owner}: tree allows only one current node`)
      if (!Array.isArray(c.reveal) || !c.reveal.length || !c.reveal.every(text)) fail(`${owner}: reveal must list node ids`)
      else {
        const revealed = new Set(c.reveal)
        if (revealed.size !== c.reveal.length) fail(`${owner}: reveal node ids must be unique`)
        for (const id of revealed) {
          if (!nodes.has(id)) fail(`${owner}: unknown reveal node ${id}`)
          else if (nodes.get(id).parent && !revealed.has(nodes.get(id).parent)) fail(`${owner}: revealed node ${id} requires its parent`)
        }
        if (c.focus !== undefined && (!text(c.focus) || !revealed.has(c.focus) || !nodes.has(c.focus))) fail(`${owner}: focus must name a revealed node`)
      }
    }
    if (['values', 'circles'].includes(slide.layout)) labelArray('labels', 4, 4)
    if (slide.layout === 'pair' || (slide.layout === 'choice' && c.labels !== undefined)) labelArray('labels', 2, 2)
    if (slide.layout === 'pyramid') labelArray('labels', 5, 5)
    if (slide.layout === 'circles' && !text(c.circle)) fail(`${owner}: circle label required`)
    if (slide.layout === 'steps') labelArray('labels', 3, 4)
    if (slide.layout === 'steps' && c.mode !== undefined && !['horizons', 'progression'].includes(c.mode)) fail(`${owner}: unsupported steps mode`)
    if (slide.layout === 'steps' && c.mode === 'horizons' && c.labels?.length !== 4) fail(`${owner}: horizons requires four labels`)
    if (slide.layout === 'roles') { labelArray('roles', 2, 3); if (!text(c.circle)) fail(`${owner}: circle label required`) }
    if (c.caption !== undefined && !text(c.caption)) fail(`${owner}: caption must be nonempty text`)
    if (!object(slide.notes) || !Array.isArray(slide.notes.sourceRanges)) { fail(`${owner}: notes.sourceRanges must be an array`); continue }
    if (slide.notes.cues !== undefined && (!Array.isArray(slide.notes.cues) || !slide.notes.cues.every(text))) fail(`${owner}: notes.cues must be text strings`)
    let rangesValid = true
    for (const range of slide.notes.sourceRanges) {
      if (!validRange(range, owner)) { rangesValid = false; continue }
      // Overlaps are reported rather than forbidden; new passages must follow source order.
      if (deck.sourceOrder !== 'presentation' && range.start < lastSourceLine && !coverage[range.start - 1].length) fail(`${owner}: source ranges must follow original order`)
      lastSourceLine = Math.max(lastSourceLine, range.end)
      for (let n = range.start; n <= range.end; n++) coverage[n - 1].push(owner)
    }
    if (rangesValid) report.notes.push(assembleNotes(deck, slide))
    if (slide.ruleExceptions !== undefined && !validExceptions(slide.ruleExceptions)) fail(`${owner}: ruleExceptions require rule, reason and affected text`)
  }
  report.slideCount = deck.slides.length
  for (const [index, line] of lines.entries()) {
    const n = index + 1
    if (coverage[index].length > 1) report.coverage.duplicated.push({ line: n, slideIds: coverage[index] })
    if (classified.has(n)) report.coverage.classified.push({ line: n, kind: classified.get(n) })
    if (line.trim() && !classified.has(n) && !coverage[index].length) report.coverage.uncovered.push(n)
  }
  if (report.coverage.uncovered.length) fail(`Uncovered source lines: ${report.coverage.uncovered.join(', ')}`)
  if (report.errors.length) return report
  const finding = (rule, message, slide, affected) => {
    const exception = (slide ? slide.ruleExceptions : deck.ruleExceptions)?.find(e => e.rule === rule && e.text === affected)
    report.findings.push({ rule, slideId: slide?.id ?? null, message, text: affected, justified: !!exception, ...(exception ? { reason: exception.reason } : {}) })
  }
  if (deck.slides.length > 10) finding('10-20-30', `slide count ${deck.slides.length} exceeds ten`, null, 'slide count')
  if (report.durationSeconds > 1200 || deck.targetDurationSeconds > 1200) finding('10-20-30', `duration ${report.durationSeconds}s exceeds twenty minutes`, null, 'deck')
  if (report.durationSeconds !== deck.targetDurationSeconds) finding('10-20-30', 'slide duration sum differs from targetDurationSeconds', null, 'deck')
  let run = 0
  for (const slide of deck.slides) {
    const authored = audienceLines(slide)
    if (authored.length > 6) finding('1-6-6', `${authored.length} authored lines exceeds six`, slide, slide.title)
    const points = authored.filter(line => line.kind === 'point')
    if (points.length > 5) finding('5-5-5', `${points.length} points exceeds five`, slide, slide.title)
    for (const line of authored) {
      if (words(line.text) > 6 || /[\r\n]/.test(line.text)) finding('1-6-6', `${line.kind} has ${words(line.text)} words or explicit line breaks; maximum six words per line`, slide, line.text)
      if (line.kind === 'point' && words(line.text) > 5) finding('5-5-5', `point has ${words(line.text)} words; maximum five`, slide, line.text)
    }
    run = slide.role === 'buffer' ? 0 : run + 1
    if (run > 5) finding('5-5-5', `${run} consecutive content slides; insert a buffer`, slide, slide.title)
  }
  return report
}

export function loadDeck(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')) }
  catch (error) { throw new Error(`Cannot read deck JSON: ${error.message}`) }
}

// JSON is inert even when source text contains a script-closing sequence.
const embeddedJSON = value => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, character => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`)

// Layouts use a logical presentation canvas, scaled only to fit the viewport.
const THEME_CSS = `
:root { color-scheme: light; --paper:#fbf1df; --ink:#241d18; --coral:#ed836b; --yellow:#efb94c; --sage:#b9c596; }
* { box-sizing:border-box; }
[hidden] { display:none !important; }
html,body { margin:0; width:100%; height:100%; }
body { height:100vh; height:100dvh; overflow:hidden; background:var(--ink); color:var(--ink); font-family:'DM Sans',sans-serif; }
#presentation { display:flex; height:calc(100% - 48px); }
#viewport { position:relative; flex:1; min-width:0; overflow:hidden; }
#stage { position:absolute; width:1280px; height:720px; left:50%; top:50%; transform:translate(-50%,-50%) scale(var(--scale,1)); }
.slide { position:absolute; inset:0; padding:56px 72px 66px; background:var(--paper); overflow:hidden; }
.slide[data-tone="dark"] { background:var(--ink); color:var(--paper); }
.slide[data-tone="coral"] { background:var(--coral); }
.slide[data-tone="yellow"] { background:var(--yellow); }
.slide h1 { font:800 80px/1.02 'Barlow Condensed',sans-serif; text-transform:uppercase; margin:0 0 30px; max-width:1136px; }
.section-label { font-size:40px; margin:0 0 16px; }
.slide[data-layout="statement"] h1,.slide[data-layout="question"] h1 { font-size:110px; max-width:1060px; }
.slide[data-layout="statement"]:has(.statement-lines:empty) { display:flex; align-items:center; }
.statement-lines:empty { display:none; }
.slide[data-layout="statement"]:has(.statement-lines:empty) h1 { position:relative; z-index:0; }
.slide[data-layout="statement"]:has(.statement-lines:empty) h1::after { content:''; position:absolute; left:0; bottom:-12px; width:44%; height:24px; background:var(--coral); transform:rotate(-1deg); clip-path:polygon(0 24%,8% 12%,26% 19%,48% 3%,72% 12%,100% 0,98% 66%,91% 83%,73% 74%,51% 100%,28% 83%,9% 94%,1% 73%); z-index:-1; }
.slide[data-layout="question"] { background:var(--yellow); display:flex; align-items:center; }
.slide[data-layout="divider"] { display:flex; align-items:center; }
.slide[data-layout="divider"] h1 { font-size:184px; line-height:.95; max-width:1020px; margin:0; }
.slide[data-layout="divider"] h1::after { content:''; display:block; width:300px; height:18px; margin-top:36px; background:var(--yellow); transform:rotate(-2deg); }
.divider-art { position:absolute; inset:0; width:1280px; height:720px; color:var(--coral); opacity:.45; }
.slide[data-tone="coral"] .divider-art { color:var(--paper); opacity:.65; }
.slide[data-tone="yellow"] .divider-art { color:var(--coral); }
.slide[data-purpose="empower"] .divider-art:not([data-graphic]) { transform:rotate(180deg); }
.divider-art[data-graphic] { opacity:.95; }
.slide[data-layout="divider"]:has(.divider-art[data-graphic]) h1 { max-width:720px; font-size:164px; }
.slide[data-layout="divider"][data-tone="dark"] .divider-art { color:var(--sage); }
.slide[data-layout="cycle"] h1,.slide[data-layout="pyramid"] h1,.slide[data-layout="montage"] h1 { border-bottom:8px solid var(--coral); padding-bottom:10px; margin-bottom:22px; }
.slide[data-layout="impact"] { display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; }
.slide[data-layout="impact"] h1 { font-size:300px; line-height:1.15; margin:0 0 48px; }
.slide[data-layout="impact"] .caption { margin:0; max-width:1060px; }
.statement-lines,.triad { display:flex; gap:26px; margin:52px 0 0; padding:0; list-style:none; }
.statement-lines li,.triad li { flex:1; padding:30px 24px; border:2px solid var(--ink); box-shadow:4px 4px 0 var(--ink); font-size:44px; line-height:1.18; background:var(--coral); }
.triad { display:grid; gap:18px; margin-top:36px; }
.triad li { color:var(--ink); padding:18px 24px; }
.slide[data-tone="dark"] .triad li { background:transparent; color:var(--paper); border-color:#5f5a54; box-shadow:none; }
.slide[data-tone="coral"] .triad li:first-child { background:var(--paper); }
.statement-lines li:nth-child(2),.triad li:nth-child(2) { background:var(--yellow); }
.triad li:nth-child(3) { background:var(--sage); }
.triad li { display:flex; align-items:center; gap:26px; }
.point-icon { flex:none; width:54px; height:54px; stroke:currentColor; stroke-width:2; fill:none; }
.slide[data-tone="dark"] .point-icon { color:var(--coral); }
.slide[data-tone="paper"] .triad li { border-radius:20px; padding:20px 28px; box-shadow:3px 3px 0 var(--ink); }
.slide[data-tone="coral"] .triad li { border-radius:38px; }
.triad.horizontal { grid-template-columns:repeat(3,minmax(0,1fr)); gap:24px; margin-top:62px; }
.slide .triad.horizontal li { flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:44px; min-height:320px; padding:34px 18px; font-size:44px; }
.triad.horizontal .point-icon { width:80px; height:80px; }
.triad li.is-dim { opacity:.35; }
.slide[data-tone="dark"] .triad li.is-lit { border-color:var(--coral); box-shadow:0 0 24px #ed836b55; background:#ed836b18; }
.triad li.is-lit .point-icon { width:66px; height:66px; }
.brand-art { position:absolute; pointer-events:none; inset:0; width:100%; height:100%; object-fit:cover; opacity:.45; }
.slide h1,.section-label,.statement-lines,.triad,.diagram,.caption { position:relative; z-index:1; }
.slide-photo { position:absolute; object-fit:cover; border:2px solid var(--ink); }
.slide[data-layout="statement"].with-photo:not([data-image-treatment]):has(.statement-lines:empty) { display:block; }
.slide[data-layout="statement"].with-photo:not([data-image-treatment]):has(.statement-lines:empty) h1 { margin-top:95px; max-width:720px; font-size:116px; }
.slide[data-layout="statement"].with-photo:not([data-image-treatment]):has(.statement-lines:empty) .slide-photo { right:0; top:0; width:460px; height:720px; border-width:0 0 0 2px; }
.slide[data-layout="statement"].with-photo:not([data-image-treatment]):not(:has(.statement-lines:empty)) h1 { font-size:96px; max-width:1136px; }
.slide[data-layout="statement"].with-photo:not([data-image-treatment]):not(:has(.statement-lines:empty)) .statement-lines { width:640px; display:grid; gap:24px; margin-top:32px; }
.slide[data-layout="statement"].with-photo:not([data-image-treatment]):not(:has(.statement-lines:empty)) .statement-lines li { padding:28px; }
.slide[data-layout="statement"].with-photo:not([data-image-treatment]):not(:has(.statement-lines:empty)) .slide-photo { right:72px; top:302px; width:444px; height:306px; border-radius:20px; }
.slide[data-layout="triad"].with-photo .triad { width:640px; gap:22px; }
.slide[data-layout="triad"].with-photo .slide-photo { right:72px; top:228px; width:420px; height:354px; border-radius:24px; }
.slide[data-layout="statement"][data-image-treatment="background"] { color:var(--paper); }
.slide[data-layout="statement"][data-image-treatment="background"] .slide-photo { inset:0; width:1280px; height:720px; border:0; border-radius:0; }
.photo-overlay { position:absolute; inset:0; background:linear-gradient(90deg,rgba(36,29,24,.92),rgba(36,29,24,.84) 55%,rgba(36,29,24,.25)); }
.slide[data-layout="statement"][data-image-treatment="background"] h1 { margin-top:96px; font-size:120px; max-width:950px; }
.slide[data-layout="statement"].with-photo .statement-meta { display:block; width:auto; margin-top:34px; }
.slide[data-layout="statement"].with-photo .statement-meta li { display:block; border:0; box-shadow:none; border-radius:0; background:transparent; padding:0; font-size:44px; line-height:1.25; }
.slide[data-layout="statement"].with-photo .statement-meta li + li { margin-top:18px; font-size:40px; }
.slide .statement-lines:has(.statement-badge) { display:block; }
.slide[data-layout="statement"] .statement-lines:has(.statement-badge) .statement-badge { display:inline-block; flex:none; padding:12px 24px; background:var(--coral); color:var(--ink); border:2px solid var(--ink); border-radius:50px; box-shadow:4px 4px 0 var(--ink); font-size:40px; line-height:1.25; letter-spacing:2px; text-transform:uppercase; transform:rotate(-2deg); }
.slide[data-layout="statement"] .statement-lines:has(.statement-date) .statement-date { position:absolute; top:140px; padding:0; background:transparent; border:0; box-shadow:none; font-size:22px; opacity:.8; }
.agenda { position:relative; z-index:1; list-style:none; counter-reset:agenda; margin:22px 0 0; padding:0; display:grid; gap:8px; }
.agenda li { counter-increment:agenda; display:flex; align-items:center; gap:24px; height:68px; font-size:44px; border-bottom:2px solid #241d1822; }
.agenda li::before { content:counter(agenda,decimal-leading-zero); display:grid; place-items:center; width:72px; height:60px; flex:none; border:2px solid var(--ink); border-radius:14px; background:var(--coral); font:800 44px 'Barlow Condensed',sans-serif; }
.agenda li:nth-child(2)::before { background:var(--sage); }
.agenda li:nth-child(3)::before { background:var(--yellow); }
.agenda li:nth-child(4)::before { background:var(--paper); }
.agenda li:nth-child(5)::before { background:var(--coral); }
${TREE_CSS}
${MOVEMENT_CSS}
.slide[data-layout="statement"][data-image-treatment="artistic"] .slide-photo { inset:0 0 0 auto; width:690px; height:720px; border:0; border-radius:0; opacity:.45; filter:sepia(1) contrast(.82); mix-blend-mode:multiply; object-fit:cover; }
.slide[data-layout="statement"][data-image-treatment="artistic"] h1 { margin-top:100px; max-width:1050px; font-size:102px; line-height:1.04; }
.slide[data-layout="statement"][data-image-treatment="artistic"]:has(.statement-lines:empty) { display:block; }
.slide[data-layout="statement"][data-image-treatment="artistic"]:has(.statement-lines:empty) h1::after { content:''; position:static; display:block; width:280px; height:14px; margin-top:36px; background:var(--coral); transform:none; clip-path:none; }
.slide[data-layout="impact"].with-photo { align-items:flex-start; text-align:left; }
.slide[data-layout="impact"].with-photo h1 { font-size:276px; line-height:1; margin-bottom:30px; }
.slide[data-layout="impact"].with-photo .caption { width:540px; }
.slide[data-layout="impact"].with-photo .slide-photo { right:0; top:0; width:590px; height:720px; border:0; border-radius:0; }
.slide[data-layout="choice"] .choice-map { width:650px; height:420px; }
.slide[data-layout="choice"] .slide-photo { right:72px; top:256px; width:420px; height:340px; border-radius:32px 32px 100px 32px; }
.choice-map .road { fill:none; stroke:var(--ink); stroke-width:56; }
.choice-map .road-center { fill:none; stroke:var(--paper); stroke-width:3; stroke-dasharray:13 13; }
.slide[data-layout="pyramid"] h1 { font-size:76px; }
.slide[data-layout="pyramid"] .pyramid-map { width:760px; height:404px; }
.slide[data-layout="pyramid"] .slide-photo { right:72px; top:246px; width:344px; height:366px; border-radius:24px; }
.pyramid-map .pyramid-tier { stroke:var(--ink); stroke-width:2; }
.slide[data-layout="pyramid"] .caption { max-width:760px; }
.montage-photos { position:relative; z-index:1; display:grid; grid-template-columns:1fr 1fr; gap:28px; margin-top:34px; }
.slide[data-layout="montage"] .montage-photo { position:static; width:100%; height:410px; border-radius:20px; }
.values,.pair { position:relative; z-index:1; display:grid; grid-template-columns:1fr 1fr; gap:24px; margin:32px 0 0; padding:0; list-style:none; }
.values li { display:flex; flex-direction:column; justify-content:space-between; gap:18px; min-height:188px; padding:26px 28px; border:2px solid var(--ink); border-radius:20px; color:var(--ink); background:var(--paper); font-size:44px; line-height:1.15; }
.values li:nth-child(2) { background:var(--sage); }
.values li:nth-child(3) { background:var(--yellow); }
.values li:nth-child(4) { background:var(--coral); }
.pair { gap:40px; margin-top:50px; }
.pair li { display:flex; flex-direction:column; justify-content:center; gap:48px; padding:40px; min-height:330px; border:2px solid var(--ink); color:var(--ink); font-size:44px; line-height:1.15; background:var(--sage); }
.pair li:first-child { background:var(--yellow); border-radius:24px 24px 6px 6px; }
.pair li:last-child { background:var(--sage); border-radius:50px; }
.pair .point-icon { width:90px; height:90px; }
.diagram { display:block; width:1136px; height:390px; overflow:visible; }
.diagram.circle-map { height:480px; }
.circle-map .subcircle { stroke:var(--ink); stroke-width:2; }
.circle-map .role-pip { fill:var(--paper); stroke:var(--ink); stroke-width:2; stroke-dasharray:4 3; }
.diagram text { font-family:'DM Sans',sans-serif; font-size:44px; fill:var(--ink); }
.diagram .node { stroke:var(--ink); stroke-width:2; fill:var(--coral); }
.diagram .edge { stroke:var(--ink); stroke-width:4; fill:none; }
.caption { font-size:40px; line-height:1.2; margin:14px 0 0; }
.generated-label { font-size:16px; font-weight:700; text-transform:uppercase; letter-spacing:1px; }
.slide-footer { position:absolute; bottom:24px; left:72px; right:72px; display:flex; justify-content:space-between; align-items:center; font-size:20px; }
.brand-logo { width:42px; height:42px; object-fit:contain; }
.slide.with-photo .slide-footer > span { background:var(--paper); color:var(--ink); padding:3px 9px; border-radius:5px; }
/* Quiet progress indicator: a thin line of section ticks and a small label, no panel. */
.section-progress { display:flex; gap:12px; align-items:center; width:520px; color:var(--ink); }
.slide[data-tone="dark"] .section-progress { color:var(--paper); }
.slide.with-photo .section-progress { padding:3px 9px; border-radius:5px; background:var(--paper); color:var(--ink); opacity:.9; }
.progress-label { flex:none; font-size:16px; font-weight:700; text-transform:uppercase; letter-spacing:1px; }
.progress-track { flex:1; display:flex; gap:6px; }
.progress-seg { flex:1; height:4px; border-radius:2px; background:color-mix(in srgb, currentColor 35%, transparent); overflow:hidden; position:relative; }
.progress-seg::before { content:''; position:absolute; inset:0 auto 0 0; width:var(--fill); background:currentColor; }
.progress-seg[aria-current="step"]::before { background:#b53236; }
#controls { height:48px; display:flex; align-items:center; justify-content:center; gap:12px; padding:4px 12px; background:var(--paper); border-top:2px solid var(--ink); }
button,#notes-link { font:700 16px 'DM Sans',sans-serif; color:var(--ink); background:var(--paper); border:2px solid var(--ink); padding:5px 12px; cursor:pointer; text-decoration:none; }
button:disabled { opacity:.45; cursor:default; }
button:focus-visible,a:focus-visible,select:focus-visible { outline:3px solid var(--coral); outline-offset:2px; }
#progress { min-width:56px; text-align:center; font-size:16px; }
body.presenting #presentation { height:100%; }
body.presenting #controls { display:none; }
@media (max-width:700px) { #controls { gap:6px; padding:4px; } button,#notes-link { padding:5px 8px; white-space:nowrap; } #controls #progress { display:none; } }

/* Revision 3: a warmer palette and bolder display type, in the sapiensfirst.org style. */
:root { --sage-light:#d8e8bd; }
.slide[data-tone="sunrise"] { background:linear-gradient(135deg,#ffe28a 0%,#ffc08a 55%,#ff9f8a 100%); }
.slide[data-tone="sunrise"] .divider-art { color:var(--paper); }
.slide[data-tone="sunrise"] h1::after { background:var(--ink); }
.slide[data-tone="sage"] { background:var(--sage-light); }
.slide[data-tone="sage"] .divider-art { color:var(--coral); }
.slide[data-layout="agenda"] h1 { margin-bottom:16px; }
.agenda { margin-top:12px; gap:10px; }
.agenda li { height:112px; gap:36px; font:800 92px/1 'Barlow Condensed',sans-serif; text-transform:uppercase; letter-spacing:.5px; border-bottom:3px solid #241d1830; }
.agenda:has(li:nth-child(5)) li { height:68px; font-size:56px; gap:24px; }
.agenda:has(li:nth-child(5)) li::before { width:72px; height:58px; font-size:44px; box-shadow:none; }
.agenda li::before { width:112px; height:96px; border-radius:18px; font-size:76px; box-shadow:4px 4px 0 var(--ink); }
.triad li,.values li,.pair li { font-family:'Barlow Condensed',sans-serif; font-weight:800; text-transform:uppercase; letter-spacing:.5px; }
.triad li { font-size:56px; line-height:1; }
.values:not(:has(.value-description)) { gap:16px; margin-top:16px; }
.values:not(:has(.value-description)) li { font-size:56px; line-height:1; height:228px; min-height:0; gap:12px; padding:10px 28px; align-items:center; justify-content:center; text-align:center; }
.values:not(:has(.value-description)) .point-icon { width:80px; height:80px; stroke-width:2.5; }
.values:not(:has(.value-description)) .value-title { display:flex; align-items:center; justify-content:center; min-height:112px; }
.pair li { font-size:60px; line-height:1.05; }
.slide .triad.horizontal li { font-size:64px; line-height:1.05; min-height:420px; gap:40px; }
.triad.horizontal .point-icon { width:96px; height:96px; stroke-width:2.5; }
.slide[data-layout="triad"]:not(.with-photo) .triad.horizontal { margin-top:46px; }
.triad li { transition:background .2s, box-shadow .2s; }
.focus-tag { position:absolute; top:-18px; left:50%; transform:translateX(-50%) rotate(-3deg); padding:4px 18px; background:var(--yellow); color:var(--ink); border:2px solid var(--ink); font:800 30px/1.1 'Barlow Condensed',sans-serif; text-transform:uppercase; letter-spacing:1.5px; opacity:0; transition:opacity .45s; white-space:nowrap; }
.triad.stepped li { position:relative; }
.slide[data-step="1"] .triad.stepped .focus-tag { opacity:1; }
.slide:not([data-step="1"]) .triad.stepped li.is-dim,.slide:not([data-step="1"]) .triad.stepped li.is-lit { opacity:1; }
.slide[data-step="1"] .triad.stepped li.is-lit { box-shadow:0 0 0 5px var(--ink),8px 8px 0 5px var(--coral); }
.slide[data-step="1"] .triad.stepped li.is-dim { opacity:1; background:var(--paper); border-color:#827569; box-shadow:none; }
/* Choice: the illustration carries the decision, so it fills the slide. */
.slide[data-layout="choice"] h1 { margin-bottom:18px; }
.slide[data-layout="choice"] .slide-photo { position:absolute; left:72px; right:72px; top:176px; width:1136px; height:470px; object-fit:cover; border-radius:36px; border:3px solid var(--ink); box-shadow:8px 8px 0 var(--ink); }
/* Opening: the hero treatment from sapiensfirst.org, on a light warm wash. */
.slide[data-layout="statement"][data-image-treatment="background"] { color:var(--ink); }
.photo-overlay { background:linear-gradient(90deg,rgba(251,241,223,.97),rgba(251,241,223,.9) 46%,rgba(251,241,223,.12)); }
.slide[data-slide-id="opening"] { display:block; }
.slide[data-slide-id="opening"][data-layout="statement"] h1 { margin:30px 0 0; max-width:960px; font-size:156px; line-height:.9; letter-spacing:-1.5px; }
.slide[data-slide-id="opening"] h1 .hl { display:inline-block; padding:0 .09em; margin-top:6px; background:var(--yellow); transform:rotate(-2deg); line-height:.95; }
.slide[data-slide-id="opening"] h1::after { display:none; }
.slide[data-slide-id="opening"][data-layout="statement"] .statement-meta { margin-top:54px; display:block; position:relative; z-index:1; }
.slide[data-slide-id="opening"] .statement-meta li { display:inline-block; }
.slide[data-slide-id="opening"][data-layout="statement"] .statement-lines:has(.statement-badge) .statement-badge { position:static; padding:0; background:transparent; color:var(--ink); border:0; border-radius:0; box-shadow:none; font:700 48px/1.2 'DM Sans',sans-serif; letter-spacing:0; text-transform:none; transform:none; }
.slide[data-slide-id="opening"][data-layout="statement"] .statement-lines:has(.statement-date) .statement-date { position:static; display:block; margin:34px 0 0 6px; padding:0; font:800 36px/1 'Barlow Condensed',sans-serif; letter-spacing:6px; opacity:1; }
.confetti { position:absolute; z-index:1; pointer-events:none; }
.confetti.c1 { top:26px; right:46px; width:300px; height:170px; transform:rotate(-8deg); }
.confetti.c2 { right:60px; bottom:70px; width:250px; height:140px; transform:rotate(14deg); }
.confetti.c3 { top:300px; left:640px; width:130px; height:75px; transform:rotate(12deg); }
/* Photographs and figures. */
.slide[data-layout="photo"] { display:block; }
.slide[data-layout="photo"] h1 { max-width:560px; font-size:118px; line-height:.95; margin:26px 0 24px; }
.slide[data-layout="photo"] .section-label { font:800 40px/1 'Barlow Condensed',sans-serif; text-transform:uppercase; letter-spacing:5px; margin:64px 0 0; color:#b53236; }
.slide[data-layout="photo"] .caption { width:540px; font:800 56px/1 'Barlow Condensed',sans-serif; text-transform:uppercase; }
.slide[data-layout="photo"] .caption::before { content:''; display:block; width:150px; height:14px; margin:0 0 26px; background:var(--yellow); transform:rotate(-2deg); }
.slide[data-layout="photo"] .slide-photo { right:64px; top:330px; width:auto; height:auto; max-width:620px; max-height:596px; transform:translateY(-50%) rotate(1.2deg); background:var(--paper); border:3px solid var(--ink); box-shadow:10px 10px 0 var(--coral); border-radius:6px; }
.slide[data-layout="figure"] { display:block; }
.slide[data-layout="figure"] h1 { max-width:340px; font-size:78px; line-height:.95; margin:22px 0 24px; }
.slide[data-layout="figure"] .section-label { font:800 40px/1 'Barlow Condensed',sans-serif; text-transform:uppercase; letter-spacing:5px; margin:80px 0 0; color:#b53236; }
.slide[data-layout="figure"] .caption { width:320px; font:800 40px/1.02 'Barlow Condensed',sans-serif; text-transform:uppercase; }
.slide[data-layout="figure"] .caption::before { content:''; display:block; width:130px; height:12px; margin:0 0 22px; background:var(--yellow); transform:rotate(-2deg); }
.slide[data-layout="figure"] .slide-photo { right:56px; top:330px; width:auto; height:auto; max-width:780px; max-height:590px; transform:translateY(-50%); background:#fff; border:3px solid var(--ink); box-shadow:8px 8px 0 var(--ink); border-radius:10px; }
/* Links to sapiensfirst.org pages. */
.action-text { display:flex; flex-direction:column; gap:10px; align-items:flex-start; text-align:left; }
.action-link { font:700 30px/1 'DM Sans',sans-serif; text-transform:none; letter-spacing:0; color:var(--ink); text-decoration:none; border-bottom:3px solid var(--ink); padding-bottom:2px; }
.slide[data-layout="triad"].with-photo .triad li { padding:14px 28px; }
.slide[data-layout="triad"].with-photo .triad:has(.action-link) { gap:16px; margin-top:30px; }
.slide[data-layout="triad"].with-photo .caption { position:absolute; right:72px; top:176px; width:420px; margin:0; font:800 54px/.98 'Barlow Condensed',sans-serif; text-transform:uppercase; letter-spacing:1px; }
.slide[data-layout="triad"].with-photo:has(.caption) .slide-photo { top:330px; height:290px; }
.atlas-link { position:absolute; z-index:2; right:72px; top:70px; padding:10px 26px 6px; background:var(--yellow); color:var(--ink); border:2px solid var(--ink); box-shadow:5px 5px 0 var(--ink); font:800 48px/1.05 'Barlow Condensed',sans-serif; letter-spacing:1.5px; text-decoration:none; transform:rotate(-2deg); }
.slide[data-layout="movement"] h1 { font-size:64px; margin-bottom:20px; }
/* Display type carries the key phrase; regular type explains it. */
.values:has(.value-description) { margin-top:24px; gap:20px; }
.values:has(.value-description) li { height:224px; min-height:0; padding:22px 26px; display:grid; grid-template-columns:44px 1fr; grid-template-rows:1fr auto; align-items:start; column-gap:18px; row-gap:16px; }
.values:has(.value-description) .point-icon { width:44px; height:44px; }
.values:has(.value-description) .value-title { font:800 48px/1.02 'Barlow Condensed',sans-serif; }
.values .value-description { grid-column:1 / -1; font:400 40px/1.15 'DM Sans',sans-serif; text-transform:none; letter-spacing:0; }
.slide[data-layout="pair"]:has(.caption) .pair { margin-top:36px; }
.slide[data-layout="pair"] .caption { margin-top:28px; }
.slide[data-layout="circles"]:has(.caption) h1 { margin-bottom:14px; }
.slide[data-layout="circles"]:has(.caption) .circle-map { height:430px; }
.slide[data-layout="circles"] .caption { margin-top:10px; }
.action-cards { position:relative; z-index:1; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:24px; list-style:none; margin:20px 0 0; padding:0; }
.action-cards li { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:24px; text-align:center; height:414px; padding:24px; background:var(--paper); border:2px solid var(--ink); border-radius:18px; }
.action-cards li:nth-child(2) { background:var(--yellow); }
.action-cards li:nth-child(3) { background:var(--sage); }
.action-heading { display:flex; flex-direction:column; align-items:center; gap:14px; }
.action-cards .point-icon { width:48px; height:48px; }
.action-title { font:800 64px/1 'Barlow Condensed',sans-serif; text-transform:uppercase; }
.action-description { font:400 40px/1.15 'DM Sans',sans-serif; margin:18px 0; }
.action-cards .action-link { font:700 40px/1.15 'DM Sans',sans-serif; max-width:100%; margin-top:0; border:0; text-decoration:underline; text-underline-offset:6px; overflow-wrap:anywhere; }
.slide[data-layout="actions"] h1 { font-size:64px; margin-bottom:20px; }
.slide[data-layout="actions"] .caption { margin-top:18px; }
@media (prefers-reduced-motion:reduce) { .triad li,.focus-tag { transition:none; } }
`

const RUNTIME_JS = `
(() => {
  const slides = [...document.querySelectorAll('#stage .slide')];
  const previous = document.getElementById('previous');
  const next = document.getElementById('next');
  const link = document.getElementById('notes-link');
  const present = document.getElementById('present');
  const deckId = JSON.parse(document.getElementById('deck-data').textContent).id;
  let presenter = null;
  const viewport = document.getElementById('viewport');
  const stage = document.getElementById('stage');
  let index = 0;
  let step = 0;
  const stepsOf = slide => Number(slide?.dataset.steps || 0);
  function fit() { stage.style.setProperty('--scale', Math.min(viewport.clientWidth / 1280, viewport.clientHeight / 720)); }
  function setPresenting(enabled) {
    if (enabled && document.activeElement?.closest('#controls')) document.activeElement.blur();
    document.body.classList.toggle('presenting', enabled);
    present.setAttribute('aria-pressed', String(enabled));
    fit();
    if (!enabled) present.focus();
  }
  function show(value, at = 0) {
    index = Math.max(0, Math.min(slides.length - 1, value));
    step = Math.min(at, stepsOf(slides[index]));
    slides.forEach((slide, i) => { slide.hidden = i !== index; });
    slides[index].dataset.step = step;
    previous.disabled = index === 0 && step === 0;
    next.disabled = index === slides.length - 1 && step === stepsOf(slides[index]);
    document.getElementById('progress').textContent = (index + 1) + ' / ' + slides.length;
    if (presenter && !presenter.closed) presenter.postMessage({ type:'sapiens-slide', deckId, index }, '*');
  }
  // Slides with steps reveal their next part before the deck moves on, and back up through it first.
  function advance(direction) {
    if (direction > 0 && step < stepsOf(slides[index])) show(index, step + 1);
    else if (direction > 0) show(index + 1);
    else if (step > 0) show(index, step - 1);
    else if (index > 0) show(index - 1, stepsOf(slides[index - 1]));
  }
  function openNotes(event) {
    if (event && (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)) return;
    if (presenter && !presenter.closed) { event?.preventDefault(); presenter.focus(); show(index, step); return; }
    const opened = window.open(link.href, '_blank', 'popup,width=900,height=900');
    if (opened) { presenter = opened; event?.preventDefault(); }
  }
  window.addEventListener('message', event => {
    if (!presenter || event.source !== presenter || event.data?.deckId !== deckId) return;
    if (event.data.type === 'sapiens-notes-ready') show(index, step);
    if (event.data.type === 'sapiens-navigate' && Number.isInteger(event.data.index) && event.data.index >= 0 && event.data.index < slides.length) show(event.data.index);
  });
  previous.addEventListener('click', () => advance(-1));
  next.addEventListener('click', () => advance(1));
  link.addEventListener('click', openNotes);
  present.addEventListener('click', () => setPresenting(true));
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.isContentEditable || event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    if (event.key === ' ' && event.target.closest('button,a')) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey)) advance(1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp' || (event.key === ' ' && event.shiftKey)) advance(-1);
    else if (event.key === 'Home') show(0);
    else if (event.key === 'End') show(slides.length - 1, stepsOf(slides[slides.length - 1]));
    else if (event.key.toLowerCase() === 'p') setPresenting(!document.body.classList.contains('presenting'));
    else if (event.key === 'Escape' && document.body.classList.contains('presenting')) setPresenting(false);
    else if (event.key.toLowerCase() === 'n') { link.click(); return; }
    else return;
    event.preventDefault();
  });
  window.addEventListener('resize', fit);
  show(0); fit();
})();
`

// Confetti pieces from the sapiensfirst.org hero, in its coral, blue and yellow.
const CONFETTI_PIECES = '<path fill="#ff7870" d="M8 35l6-3 8 17-6 3zM124 8l6 2-5 15-6-2z"/><path fill="#3a86ff" d="M58 4l7 1-2 17-7-1zM114 73l5-5 11 10-5 5z"/><path fill="#ffd60a" d="M37 72l13-7 4 6-13 7zM148 40l7 3-4 8-7-3z"/>'
const CONFETTI = `<svg class="confetti c1" viewBox="0 0 160 90" aria-hidden="true">${CONFETTI_PIECES}</svg><svg class="confetti c2" viewBox="0 0 160 90" aria-hidden="true">${CONFETTI_PIECES}</svg><svg class="confetti c3" viewBox="0 0 160 90" aria-hidden="true">${CONFETTI_PIECES}</svg>`

function person(x, y, size = 1) {
  return `<g aria-hidden="true" transform="translate(${x} ${y}) scale(${size})" fill="none" stroke="currentColor" stroke-width="3"><circle cy="-17" r="13"/><path d="M-27 30V15Q-27 0 0 0Q27 0 27 15V30"/></g>`
}

function pointIcon(index, hopeful) {
  const paths = hopeful
    ? ['<path d="M25 7H39M28 7V26L11 52Q9 57 14 57H50Q55 57 53 52L36 26V7M18 42H46M26 49H28M36 46H38"/>', '<path d="M8 25L32 9L56 25M13 54H51M18 28V47M32 28V47M46 28V47"/>', '<path d="M13 39H24V54H13ZM27 28H38V54H27ZM41 14H52V54H41ZM12 25L48 8M36 8H48V20"/>']
    : ['<path d="M18 7H46M18 57H46M21 7C21 27 32 28 32 32C32 36 21 37 21 57M43 7C43 27 32 28 32 32C32 36 43 37 43 57M26 50H38"/>', '<path d="M8 24L32 9L56 24M10 54H54M18 29V47M32 29V36M46 29V47M25 45L39 31"/>', '<path d="M32 8L58 54H6ZM32 24V38"/><circle cx="32" cy="46" r="1.5"/>']
  return `<svg class="point-icon" viewBox="0 0 64 64" aria-hidden="true">${paths[index % 3]}</svg>`
}

function actionIcon(index, label) {
  const paths = ['<path d="M32 54S8 38 8 22C8 7 26 6 32 18C38 6 56 7 56 22C56 38 32 54 32 54Z"/>', '<circle cx="23" cy="19" r="8"/><circle cx="44" cy="22" r="6"/><path d="M8 52V43Q8 31 23 31Q38 31 38 43V52M42 34Q56 34 56 44V52"/>', '<path d="M14 54V8M14 10H50L42 22L50 34H14"/>', '<circle cx="14" cy="32" r="7"/><circle cx="49" cy="13" r="7"/><circle cx="49" cy="51" r="7"/><path d="M20 28L43 16M20 36L43 48"/>']
  const iconIndex = { Donate: 0, Join: 1, Organize: 2, Share: 3 }[label] ?? index % 3
  return `<svg class="point-icon" viewBox="0 0 64 64" aria-hidden="true">${paths[iconIndex]}</svg>`
}

function valueIcon(index) {
  const paths = ['<path d="M32 6L53 15V32Q53 46 32 58Q11 46 11 32V15Z"/><path d="M22 32L29 39L43 24"/>', '<path d="M50 20A23 23 0 1 0 54 39M50 20V7M50 20H37"/><path d="M22 39Q22 24 40 21Q44 37 30 43Z"/>', '<circle cx="32" cy="32" r="23"/><path d="M21 32L29 40L44 24"/>', '<circle cx="23" cy="19" r="8"/><circle cx="44" cy="22" r="6"/><path d="M8 52V43Q8 31 23 31Q38 31 38 43V52M42 34Q56 34 56 44V52M23 9V2M12 12L6 7M34 12L40 7"/>']
  return `<svg class="point-icon" viewBox="0 0 64 64" aria-hidden="true">${paths[index]}</svg>`
}

function pairIcon(index) {
  const paths = ['<rect x="10" y="7" width="44" height="50" rx="5"/><path d="M20 21H44M20 32H44M20 43H35"/>', '<circle cx="32" cy="32" r="25"/><circle cx="23" cy="27" r="7"/><circle cx="42" cy="39" r="7"/><path d="M16 43H27M36 22H47"/>']
  return `<svg class="point-icon" viewBox="0 0 64 64" aria-hidden="true">${paths[index]}</svg>`
}

function diagram(slide, index) {
  const c = slide.content, marker = `arrow-${index}`
  const label = (value, x, y, size = 44) => `<text class="audience-text" x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" style="font-size:${size}px">${escapeHTML(value)}</text>`
  const colors = ['var(--coral)', 'var(--yellow)', 'var(--sage)', 'var(--paper)']
  let body, description
  if (slide.layout === 'choice') {
    if (!c.labels) return ''
    description = `Two futures to choose between: ${c.labels.join(' and ')}. They represent a choice, not measured outcomes.`
    body = `<rect class="node" x="25" y="70" width="600" height="110" rx="24" style="fill:var(--coral)"/>${label(c.labels[0], 325, 125, 48)}<rect class="node" x="25" y="230" width="600" height="110" rx="24" style="fill:var(--sage)"/>${label(c.labels[1], 325, 285, 48)}`
  } else if (slide.layout === 'pyramid') {
    description = `Horizons of focus, from the top to the base: ${c.labels.join('; ')}. This conceptual pyramid groups strategic focus; its tier areas do not represent quantities or progress.`
    body = `<polygon class="pyramid-tier" points="380,0 60,148 700,148" fill="var(--coral)"/>${label(c.labels[0], 380, 128, 40)}`
    body += c.labels.slice(1).map((value, i) => {
      const y = 148 + i * 64, left = 60 - i * 15, right = 700 + i * 15
      return `<polygon class="pyramid-tier" points="${left},${y} ${right},${y} ${right + 15},${y + 64} ${left - 15},${y + 64}" fill="${['var(--yellow)', 'var(--paper)', 'var(--sage)', 'var(--yellow)'][i]}"/>${label(value, 380, y + 34, 40)}`
    }).join('')
  } else if (slide.layout === 'circles') {
    description = `${c.circle} contains the circles ${c.labels.join(', ')}. Nested circles show scopes of shared purpose and contain roles, without reporting arrows. This is an excerpt inspired by Sapiens First Atlas, not the complete roster. Small role dots are illustrative, not headcounts or organizational metrics.`
    const fills = ['#efe5d4', '#f4c9ad', '#d5e1bd', '#f4df9a']
    body = `<ellipse class="circle-parent" cx="568" cy="240" rx="560" ry="236" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/>${label(c.circle, 568, 65, c.caption ? 50 : 44)}`
    body += c.labels.map((value, i) => {
      const x = [158, 432, 704, 978][i]
      return `<circle class="subcircle" cx="${x}" cy="240" r="132" fill="${fills[i]}"/>${label(value, x, 236, c.caption ? 45 : 40)}<g aria-hidden="true">${[-35, 0, 35].map(offset => `<circle class="role-pip" cx="${x + offset}" cy="300" r="13"/>`).join('')}</g>`
    }).join('')
  } else if (slide.layout === 'cycle') {
    description = `${c.labels.join(' → ')} → ${c.labels[0]}. Each stage leads to the next and repeats.`
    body = `<path class="edge" marker-end="url(#${marker})" d="M708 65 C920 65 850 150 850 260"/><path class="edge" marker-end="url(#${marker})" d="M710 305 L425 305"/><path class="edge" marker-end="url(#${marker})" d="M285 260 C285 150 220 65 428 65"/>`
    for (const [i, [x, y]] of [[568, 65], [850, 305], [285, 305]].entries()) body += `<rect class="node" x="${x - 140}" y="${y - 45}" width="280" height="90" rx="18" style="fill:${colors[i]}"/>${label(c.labels[i], x, y)}`
  } else if (slide.layout === 'steps' && c.mode === 'horizons') {
    description = `Nested horizons of strategic focus, from local action to broader policy scale: ${c.labels.join('; ')}. The bands show perspectives of focus, not literal geographic boundaries, dated phases or completion gates.`
    body = [[550, 370, 70], [460, 280, 160], [350, 190, 246], [220, 100, 336]].map(([rx, ry, y], i) => `<path class="horizon-band" d="M${568 - rx} 380 A${rx} ${ry} 0 0 1 ${568 + rx} 380 Z" fill="${colors[3 - i]}" stroke="var(--ink)" stroke-width="2"/>${label(c.labels[3 - i], 568, y)}`).join('')
  } else if (slide.layout === 'steps' && c.labels.length === 3) {
    description = `Participation progression: ${c.labels.join(' → ')}. People can grow through participation.`
    body = c.labels.map((value, i) => {
      const x = 20 + i * 384
      return `${i ? `<path class="edge" marker-end="url(#${marker})" d="M${x - 56} 208 L${x} 208"/>` : ''}<rect class="node" x="${x}" y="96" width="328" height="224" rx="22" style="fill:${colors[i]}"/>${person(x + 164, 160, 1.4)}${label(value, x + 164, 265)}`
    }).join('')
  } else if (slide.layout === 'steps') {
    description = `Ordered progression: ${c.labels.map((value, i) => `${i + 1}. ${value}`).join('; ')}.`
    body = c.labels.map((value, i) => {
      const y = 46 + i * 92
      return `${i ? `<path class="edge" marker-end="url(#${marker})" d="M568 ${y - 57} L568 ${y - 35}"/>` : ''}<rect class="node" x="158" y="${y - 35}" width="820" height="70" rx="12" style="fill:${colors[i]}"/><text x="211" y="${y}" text-anchor="middle" dominant-baseline="middle" aria-hidden="true">${i + 1}</text>${label(value, 603, y)}`
    }).join('')
  } else {
    description = `${c.circle} contains the roles ${c.roles.join(' and ')}. Roles have ownership within their circle.`
    body = `<ellipse class="node" cx="568" cy="195" rx="515" ry="185" style="fill:var(--sage)"/>${label(c.circle, 568, 55)}`
    for (const [i, value] of c.roles.entries()) {
      const y = (c.roles.length === 3 ? 120 : 150) + i * 82
      body += `<rect class="node" x="200" y="${y - 36}" width="736" height="72" rx="16" style="fill:${colors[i]}"/>${label(value, 568, y)}`
    }
  }
  const dimensions = { circles: [1136, 480, 'circle-map'], choice: [650, 420, 'choice-map'], pyramid: [760, 404, 'pyramid-map'] }[slide.layout] ?? [1136, 390, '']
  return `<svg class="diagram${dimensions[2] ? ` ${dimensions[2]}` : ''}" viewBox="0 0 ${dimensions[0]} ${dimensions[1]}" role="img" aria-labelledby="diagram-title-${index} diagram-desc-${index}"><title id="diagram-title-${index}">${escapeHTML(slide.title)}</title><desc id="diagram-desc-${index}">${escapeHTML(description)}</desc><defs><marker id="${marker}" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" refX="14" refY="7" orient="auto"><path d="M0 0 L14 7 L0 14 Z" fill="currentColor"/></marker></defs>${body}</svg>`
}

// The site's hero sets its last word on a tilted yellow highlight; the opening title does the same.
function highlightLastWord(title) {
  const match = title.match(/^(.*\s)(\S+)$/)
  return match ? `${escapeHTML(match[1])}<span class="hl">${escapeHTML(match[2])}</span>` : escapeHTML(title)
}


function dividerArt(index, graphic) {
  const topical = {
    book: '<path d="M830 285Q930 255 1040 305Q1150 255 1250 285V510Q1150 480 1040 530Q930 480 830 510Z" fill="var(--paper)" stroke="var(--ink)" stroke-width="6"/><path d="M1040 305V530M855 240Q965 225 1040 285Q1120 220 1225 240M875 195Q970 205 1040 265Q1110 200 1200 195" fill="none" stroke="currentColor" stroke-width="14"/><path d="M865 335Q940 320 1005 350M865 390Q940 375 1005 405M1080 350Q1150 320 1215 335M1080 405Q1150 375 1215 390" fill="none" stroke="var(--ink)" stroke-width="5"/>',
    route: '<path d="M850 580C1120 580 1210 445 1010 405S850 205 1160 205" fill="none" stroke="currentColor" stroke-width="60"/><path d="M850 580C1120 580 1210 445 1010 405S850 205 1160 205" fill="none" stroke="var(--ink)" stroke-dasharray="12 18" stroke-width="4"/><path d="M1155 210V90L1255 120L1155 155" fill="var(--yellow)" stroke="var(--paper)" stroke-width="6"/>',
    hands: '<path d="M1040 485S840 370 860 265C880 175 1000 175 1040 265C1080 175 1200 175 1220 265Q1240 370 1040 485Z" fill="var(--coral)" stroke="var(--ink)" stroke-width="6"/>',
    nested: '<circle cx="1060" cy="360" r="205" fill="var(--sage)" stroke="var(--ink)" stroke-width="6"/><circle cx="1000" cy="330" r="100" fill="var(--yellow)" stroke="var(--ink)" stroke-width="5"/><circle cx="1150" cy="420" r="70" fill="var(--coral)" stroke="var(--ink)" stroke-width="5"/><circle cx="980" cy="315" r="38" fill="var(--paper)" stroke="var(--ink)" stroke-width="4"/>',
    signpost: '<path d="M1050 185V590" stroke="var(--ink)" stroke-width="22"/><path d="M855 205H1170L1250 265L1170 325H855Z" fill="var(--paper)" stroke="var(--ink)" stroke-width="5"/><path d="M1210 350H900L825 405L900 460H1210Z" fill="var(--yellow)" stroke="var(--ink)" stroke-width="5"/><path d="M925 485H1180L1250 535L1180 585H925Z" fill="var(--sage)" stroke="var(--ink)" stroke-width="5"/>',
  }
  if (topical[graphic]) return `<svg class="divider-art" data-graphic="${graphic}" viewBox="0 0 1280 720" aria-hidden="true">${topical[graphic]}</svg>`
  const motifs = [
    '<circle cx="1130" cy="190" r="255" fill="none" stroke="currentColor" stroke-width="50"/><circle cx="1130" cy="190" r="145" fill="currentColor"/>',
    '<path d="M840 590L1080 120L1320 590Z" fill="currentColor"/><path d="M930 590L1080 295L1230 590" fill="none" stroke="var(--paper)" stroke-width="18"/>',
    '<path d="M910 90Q1330 190 1000 480Q820 655 1280 680" fill="none" stroke="currentColor" stroke-width="90"/>',
    '<rect x="1000" y="100" width="240" height="240" rx="55" fill="currentColor" transform="rotate(20 1120 220)"/><circle cx="1060" cy="520" r="155" fill="none" stroke="currentColor" stroke-width="45"/>',
    '<path d="M840 700Q820 400 1200 180M960 740Q940 430 1280 280" fill="none" stroke="currentColor" stroke-width="72"/>',
  ]
  return `<svg class="divider-art" viewBox="0 0 1280 720" aria-hidden="true">${motifs[index % motifs.length]}</svg>`
}

const asset = path => readFileSync(new URL(path, import.meta.url))
function embeddedFonts() {
  const fonts = [['barlow-condensed-800', 'Barlow Condensed', 800], ['dm-sans-400', 'DM Sans', 400], ['dm-sans-700', 'DM Sans', 700]]
  return fonts.map(([file, family, weight]) => `@font-face { font-family:'${family}'; font-style:normal; font-weight:${weight}; src:url(data:font/ttf;base64,${asset(`fonts/${file}.ttf`).toString('base64')}) format('truetype'); font-display:block; }`).join('\n')
}
// The Sapiens First logo, embedded so the browser tab shows it offline.
const faviconLink = () => `<link rel="icon" type="image/png" sizes="32x32" href="data:image/png;base64,${asset('../docs/public/favicon-32x32.png').toString('base64')}"><link rel="apple-touch-icon" href="data:image/png;base64,${asset('../docs/public/apple-touch-icon.png').toString('base64')}">`
const fontLicenses = () => ['Barlow-Condensed-OFL.txt', 'DM-Sans-OFL.txt'].map(file => asset(`fonts/${file}`).toString('utf8')).join('\n\n')

export function renderDeck(deck, { notesHref = `${encodeURIComponent(deck.id)}.notes.html` } = {}) {
  if (!text(notesHref) || /[\\/]/.test(notesHref) || /^[a-z][a-z\d+.-]*:/i.test(notesHref)) throw new Error('Notes link must be a sibling filename')
  const logo = asset('../docs/public/logo.png').toString('base64')
  const icon = faviconLink()
  const sectionOrder = [...new Set(deck.slides.map(slide => slide.section).filter(Boolean))]
  function progressStrip(slide, index) {
    if (!slide.section) return ''
    const members = deck.slides.filter(candidate => candidate.section === slide.section)
    const fill = Math.round((members.indexOf(slide) + 1) / members.length * 100)
    return `<div class="section-progress" role="group" aria-label="Section progress"><span class="progress-label">${sections[slide.section]}</span><div class="progress-track">${sectionOrder.map(section => `<div class="progress-seg" data-section="${section}"${section === slide.section ? ' aria-current="step"' : ''} style="--fill:${section === slide.section ? fill : deck.slides.findIndex(candidate => candidate.section === section) < index ? 100 : 0}%" aria-label="${sections[section]}${section === slide.section ? `, ${fill}%` : ''}"></div>`).join('')}</div></div>`
  }
  const slides = deck.slides.map((slide, index) => {
    let content = ''
    if (slide.layout === 'statement') content = `<ul class="statement-lines${slide.image?.treatment ? ' statement-meta' : ''}">${slide.content.lines.map((value, i) => `<li class="audience-text${slide.id === 'opening' && slide.content.lines.length === 2 ? ` statement-${i ? 'date' : 'badge'}` : ''}">${escapeHTML(value)}</li>`).join('')}</ul>`
    if (slide.layout === 'agenda') content = `<ol class="agenda">${slide.content.labels.map(value => `<li><span class="audience-text">${escapeHTML(value)}</span></li>`).join('')}</ol>`
    if (slide.layout === 'tree') content = renderTree(slide.content, index)
    if (slide.layout === 'movement') content = renderMovementPlan(slide.content, index)
    if (slide.layout === 'triad') content = `<ul class="triad${slide.content.direction === 'horizontal' ? ' horizontal' : ''}${slide.content.highlightStep ? ' stepped' : ''}">${slide.content.labels.map((value, i) => `<li${slide.content.highlight !== undefined ? ` class="${i === slide.content.highlight ? 'is-lit' : 'is-dim'}"` : ''}>${slide.content.links ? actionIcon(i, value) : pointIcon(i, slide.tone !== 'dark' && !slide.content.highlightStep)}${slide.content.links ? `<span class="action-text"><span class="audience-text">${escapeHTML(value)}</span><a class="action-link" href="https://${escapeHTML(slide.content.links[i])}" target="_blank" rel="noopener">${escapeHTML(slide.content.links[i])}</a></span>` : `<span class="audience-text">${escapeHTML(value)}</span>`}${slide.content.highlightStep && i === slide.content.highlight ? '<span class="focus-tag" aria-hidden="true">Our focus</span>' : ''}</li>`).join('')}</ul>`
    if (slide.layout === 'values') content = `<ul class="values">${slide.content.labels.map((value, i) => `<li>${valueIcon(i)}<span class="audience-text value-title">${escapeHTML(value)}</span>${slide.content.descriptions ? `<span class="audience-text value-description">${escapeHTML(slide.content.descriptions[i])}</span>` : ''}</li>`).join('')}</ul>`
    if (slide.layout === 'actions') content = `<ul class="action-cards">${slide.content.labels.map((value, i) => `<li><div class="action-heading">${actionIcon(i, value)}<span class="audience-text action-title">${escapeHTML(value)}</span></div>${slide.content.descriptions ? `<span class="audience-text action-description">${escapeHTML(slide.content.descriptions[i])}</span>` : ''}<a class="audience-text action-link" href="https://${escapeHTML(slide.content.links[i])}" target="_blank" rel="noopener">${escapeHTML(slide.content.links[i]).replace('/', '<wbr>/')}</a></li>`).join('')}</ul>`
    if (slide.layout === 'pair') content = `<ul class="pair">${slide.content.labels.map((value, i) => `<li>${pairIcon(i)}<span class="audience-text">${escapeHTML(value)}</span></li>`).join('')}</ul>`
    if (['cycle', 'steps', 'roles', 'circles', 'choice', 'pyramid'].includes(slide.layout)) content = diagram(slide, index) + (slide.content.link ? `<a class="atlas-link" href="https://${escapeHTML(slide.content.link)}" target="_blank" rel="noopener">${escapeHTML(slide.content.link)}</a>` : '')
    if (slide.layout === 'montage') content = `<div class="montage-photos">${slide.images.map(image => `<img class="slide-photo montage-photo" alt="${escapeHTML(image.alt)}" src="${imageAsset(image)}" style="object-position:${image.position ?? 'center'}">`).join('')}</div>`
    if (['photo', 'figure'].includes(slide.layout)) content = `<img class="slide-photo" alt="${escapeHTML(slide.image.alt)}" src="${imageAsset(slide.image)}" style="object-position:${slide.image.position ?? 'center'}">`
    const photo = !['photo', 'figure'].includes(slide.layout) && slide.image ? `<img class="slide-photo" alt="${escapeHTML(slide.image.alt)}" src="${imageAsset(slide.image)}" style="object-position:${slide.image.position ?? 'center'}">` : ''
    if (slide.graphic !== undefined && !['contours', 'arcs', ...topicalGraphics].includes(slide.graphic)) throw new Error('Unsupported graphic')
    const graphic = ['contours', 'arcs'].includes(slide.graphic) ? `<img class="brand-art" alt="" aria-hidden="true" src="data:image/svg+xml;base64,${asset(`assets/sapiens-${slide.graphic}.svg`).toString('base64')}">` : ''
    return `<section class="slide${slide.image || slide.images ? ' with-photo' : ''}" data-slide-id="${escapeHTML(slide.id)}" data-layout="${slide.layout}" data-purpose="${slide.purpose}" data-tone="${slide.tone ?? 'paper'}"${slide.content.highlightStep ? ' data-steps="1" data-step="0"' : ''}${slide.image?.treatment ? ` data-image-treatment="${slide.image.treatment}"` : ''} aria-labelledby="slide-title-${index}"${index ? ' hidden' : ''}>${graphic}${slide.layout === 'divider' ? dividerArt(index, slide.graphic) : ''}${photo}${slide.image?.treatment === 'background' ? `<div class="photo-overlay" aria-hidden="true"></div>${slide.id === 'opening' ? CONFETTI : ''}` : ''}${slide.sectionLabel ? `<p class="section-label audience-text">${escapeHTML(slide.sectionLabel)}</p>` : ''}<h1 class="audience-text" id="slide-title-${index}">${slide.id === 'opening' ? highlightLastWord(slide.title) : escapeHTML(slide.title)}</h1>${content}${slide.content.caption ? `<p class="caption audience-text">${escapeHTML(slide.content.caption)}</p>` : ''}<footer class="slide-footer"><img class="brand-logo" alt="Sapiens First" src="data:image/png;base64,${logo}">${progressStrip(slide, index)}${deck.origin === 'generated' ? '<span class="generated-label">Auto-generated from the handbook text</span>' : ''}<span>${index + 1} / ${deck.slides.length}</span></footer></section>`
  }).join('\n')
  const audience = { id: deck.id, title: deck.title, slides: deck.slides.map(({ notes, referenceImage, ...slide }) => slide) }
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(deck.title)}</title>${icon}<style>${embeddedFonts()}\n${THEME_CSS}</style></head>
<body><main id="presentation"><div id="viewport"><div id="stage" aria-label="Presentation slides">${slides}</div></div></main>
<nav id="controls" aria-label="Presentation controls"><button id="previous" type="button" disabled aria-label="Previous slide">Previous</button><span id="progress" role="status" aria-live="polite">1 / ${deck.slides.length}</span><button id="next" type="button"${deck.slides.length === 1 ? ' disabled' : ''} aria-label="Next slide">Next</button><a id="notes-link" href="${escapeHTML(notesHref)}" target="_blank">Presenter notes</a><button id="present" type="button" aria-pressed="false" title="Hide controls (P). Press Escape to return.">Present</button></nav>
<script id="deck-data" type="application/json">${embeddedJSON(audience)}</script><pre id="font-licenses" hidden>${escapeHTML(fontLicenses())}</pre><script>${RUNTIME_JS}</script></body></html>\n`
}

const NOTES_CSS = `
:root { color-scheme:light; }
* { box-sizing:border-box; }
[hidden] { display:none !important; }
body { margin:0; background:#f8f3eb; color:#111; font:400 22px/1.55 'DM Sans',sans-serif; }
header { padding:24px 32px 12px; border-bottom:2px solid #111; }
header p { margin:0 0 12px; }
#connection-status { font-size:16px; }
nav { position:sticky; top:0; z-index:1; display:flex; flex-wrap:wrap; gap:12px; align-items:center; padding:12px 32px; background:#f8f3eb; border-bottom:2px solid #111; }
button,select { font:700 18px 'DM Sans',sans-serif; background:#f8f3eb; color:#111; border:2px solid #111; padding:8px 12px; }
select { min-width:0; max-width:100%; flex:1; }
button { cursor:pointer; }
button:disabled { opacity:.45; cursor:default; }
button:focus-visible,a:focus-visible,select:focus-visible { outline:3px solid #ff7870; outline-offset:2px; }
main { max-width:1000px; padding:28px 32px 60px; margin:auto; }
h1,h2 { font:800 46px/1.1 'Barlow Condensed',sans-serif; margin:0 0 20px; }
h3 { font-size:20px; margin:28px 0 12px; }
.source-passage { white-space:pre-wrap; overflow-wrap:anywhere; font:inherit; margin:0 0 20px; }
.editorial-cues { padding-left:26px; }
.asset-credit { font-size:16px; overflow-wrap:anywhere; }
.reference-image { display:block; max-width:100%; height:auto; margin:20px 0; }
a { color:#111; }
@media(max-width:600px) { body { font-size:20px; } header,main { padding-left:20px; padding-right:20px; } nav { padding:12px 20px; gap:8px; } select { flex-basis:100%; } h1,h2 { font-size:36px; } }
`

const NOTES_RUNTIME_JS = `
(() => {
  const deck = JSON.parse(document.getElementById('deck-data').textContent);
  const notes = [...document.querySelectorAll('.slide-notes')];
  const previous = document.getElementById('previous');
  const next = document.getElementById('next');
  const select = document.getElementById('slide-select');
  const status = document.getElementById('connection-status');
  let index = -1;
  function connected() { return window.opener && !window.opener.closed; }
  function show(value, notify = false) {
    const current = Math.max(0, Math.min(notes.length - 1, value));
    if (current !== index) {
      index = current;
      notes.forEach((note, i) => { note.hidden = i !== index; });
      previous.disabled = index === 0;
      next.disabled = index === notes.length - 1;
      select.value = String(index);
      document.getElementById('progress').textContent = (index + 1) + ' / ' + notes.length;
      window.scrollTo(0, 0);
    }
    if (notify && connected()) window.opener.postMessage({ type:'sapiens-navigate', deckId:deck.id, index }, '*');
    else if (notify) status.textContent = 'Standalone notes. Use the controls to choose a slide.';
  }
  previous.addEventListener('click', () => show(index - 1, true));
  next.addEventListener('click', () => show(index + 1, true));
  select.addEventListener('change', () => show(Number(select.value), true));
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.isContentEditable || event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    if (event.key === 'ArrowRight') show(index + 1, true);
    else if (event.key === 'ArrowLeft') show(index - 1, true);
    else return;
    event.preventDefault();
  });
  window.addEventListener('message', event => {
    if (!connected() || event.source !== window.opener || event.data?.deckId !== deck.id || event.data.type !== 'sapiens-slide' || !Number.isInteger(event.data.index) || event.data.index < 0 || event.data.index >= notes.length) return;
    status.textContent = 'Connected to slides. Navigation stays in sync.';
    show(event.data.index);
  });
  show(0);
  if (connected()) window.opener.postMessage({ type:'sapiens-notes-ready', deckId:deck.id }, '*');
})();
`

export function renderNotes(deck) {
  const notes = deck.slides.map(slide => assembleNotes(deck, slide))
  const notesHTML = notes.map((note, index) => {
    const slide = deck.slides[index], images = [...(slide.image ? [slide.image] : slide.images ?? []), ...(slide.referenceImage ? [slide.referenceImage] : [])]
    const credits = `${images.map(image => `<p class="asset-credit">${escapeHTML(image.credit)} · <a href="${escapeHTML(image.sourceUrl)}">Photo source</a> · <a href="${escapeHTML(image.licenseUrl)}">License</a></p>`).join('')}${slide.graphic ? `<p class="asset-credit">Sapiens First brand artwork · <a href="https://sapiensfirst.org/assets/homepage-${slide.graphic === 'contours' ? 'strategy-contours' : 'involved-arcs'}.svg">Artwork source</a></p>` : ''}`
    return `<article class="slide-notes" data-slide-id="${escapeHTML(note.slideId)}"${index ? ' hidden' : ''}><h2>${escapeHTML(slide.title)}</h2><h3>Original source passages</h3>${note.passages.map(passage => `<pre class="source-passage"><span>${escapeHTML(passage)}</span></pre>`).join('')}${note.cues.length ? `<h3>Editorial cues (added prompts)</h3><ul class="editorial-cues">${note.cues.map(cue => `<li>${escapeHTML(cue)}</li>`).join('')}</ul>` : ''}${slide.referenceImage ? `<h3>Full reference figure</h3><img class="reference-image" src="${imageAsset(slide.referenceImage)}" alt="${escapeHTML(slide.referenceImage.alt)}">` : ''}${credits ? `<h3>Image and artwork credits</h3>${credits}` : ''}</article>`
  }).join('\n')
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(deck.title)} — Presenter notes</title>${faviconLink()}<style>${embeddedFonts()}\n${NOTES_CSS}</style></head>
<body><header><h1>${escapeHTML(deck.title)} — Presenter notes</h1><p>Move this window to your second screen. Open it from the slides to keep navigation in sync.</p><p id="connection-status" role="status">Standalone notes. Use the controls to choose a slide.</p></header>
<nav aria-label="Presenter controls"><button id="previous" type="button" disabled>Previous</button><span id="progress" role="status" aria-live="polite">1 / ${deck.slides.length}</span><button id="next" type="button"${deck.slides.length === 1 ? ' disabled' : ''}>Next</button><select id="slide-select" aria-label="Choose slide">${deck.slides.map((slide, i) => `<option value="${i}">${i + 1}. ${escapeHTML(slide.title)}</option>`).join('')}</select></nav>
<main aria-label="Speaker notes">${notesHTML}</main><script id="deck-data" type="application/json">${embeddedJSON({ ...deck, notes })}</script><pre id="font-licenses" hidden>${escapeHTML(fontLicenses())}</pre><script>${NOTES_RUNTIME_JS}</script></body></html>\n`
}

/** Writes the audience slides and presenter notes together, replacing both files only if both render. */
export function writeDeckFiles(deck, destination, notesDestination) {
  const html = renderDeck(deck, { notesHref: encodeURIComponent(basename(notesDestination)) })
  const notesHTML = renderNotes(deck)
  const files = [[destination, html], [notesDestination, notesHTML]]
  const temporary = files.map(([path]) => `${path}.tmp-${process.pid}`)
  mkdirSync(dirname(destination), { recursive: true })
  try {
    files.forEach(([, contents], index) => writeFileSync(temporary[index], contents))
    files.forEach(([path], index) => renameSync(temporary[index], path))
  } finally { temporary.forEach(path => rmSync(path, { force: true })) }
}

async function main(args) {
  const [operation, input, ...rest] = args
  if (operation === 'generate') {
    try {
      const deck = generateDeck(input, { slug: rest[0] })
      const destination = resolve(dirname(fileURLToPath(import.meta.url)), 'decks', `${deck.slug}.deck.json`)
      writeFileSync(destination, `${JSON.stringify(deck, null, 2)}\n`)
      console.log(`Generated ${destination} (${deck.slides.length} slides; ${deck.generation.flags.length} flagged blocks)`)
    } catch (error) { console.error(error.message); process.exitCode = 1 }
    return
  }
  const output = operation === 'build' ? rest[0] : undefined
  const flags = operation === 'build' ? rest.slice(1) : rest
  const json = flags.includes('--json')
  try {
    if (!['validate', 'build'].includes(operation) || !input || (operation === 'build' && (!output || output.startsWith('--'))) || flags.some(f => !(operation === 'validate' ? ['--json', '--strict'] : ['--strict']).includes(f))) throw new Error('Usage: node slides/slides.mjs validate DECK [--strict] [--json]\n       node slides/slides.mjs generate PAGE.md [SLUG]\n       node slides/slides.mjs build DECK OUTPUT [--strict]')
    const deck = loadDeck(input)
    const report = validateDeck(deck)
    const ok = !report.errors.length && (!flags.includes('--strict') || report.findings.every(f => f.justified))
    if (json) console.log(JSON.stringify(report, null, 2))
    else {
      console.log(`${report.slideCount} slides; ${report.durationSeconds}s; ${report.coverage.uncovered.length} uncovered lines`)
      for (const error of report.errors) console.error(`ERROR: ${error}`)
      for (const f of report.findings) console.log(`${f.rule} ${f.slideId ?? 'deck'}: ${f.message}${f.justified ? ` (exception: ${f.reason})` : ''}`)
      if (ok) console.log('Validation passed')
    }
    if (operation === 'build' && ok) {
      const destination = resolve(output)
      const extension = extname(destination)
      const notesDestination = `${destination.slice(0, extension ? -extension.length : undefined)}.notes.html`
      writeDeckFiles(deck, destination, notesDestination)
      console.log(`Built ${output}`)
      console.log(`Built ${notesDestination}`)
    }
    process.exitCode = ok ? 0 : 1
  } catch (error) {
    if (json) console.log(JSON.stringify({ errors: [error.message] }))
    else console.error(error.message)
    process.exitCode = 1
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2))
