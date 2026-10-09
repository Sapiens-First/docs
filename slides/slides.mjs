import { createHash } from 'node:crypto'
import { readFileSync, mkdirSync, writeFileSync, renameSync, rmSync, realpathSync } from 'node:fs'
import { resolve, dirname, basename, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const layouts = ['statement', 'triad', 'cycle', 'question', 'steps', 'roles', 'divider', 'impact', 'values', 'pair', 'circles']
const purposes = ['explain', 'engage', 'empower']
const words = text => text.trim().split(/\s+/).filter(Boolean).length
const hash = text => createHash('sha256').update(text).digest('hex')
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = value => typeof value === 'string' && value.trim().length > 0
const validExceptions = entries => Array.isArray(entries) && entries.every(e => object(e) && ['1-6-6', '5-5-5', '10-20-30'].includes(e.rule) && text(e.reason) && text(e.text))
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const assetsRoot = resolve(dirname(fileURLToPath(import.meta.url)), 'assets')
const httpsURL = value => { try { return text(value) && new URL(value).protocol === 'https:' } catch { return false } }

function imageAsset(image) {
  if (!object(image) || !text(image.path) || !/^assets\/[\w./-]+\.(jpg|jpeg|png|webp)$/i.test(image.path) || image.path.split('/').includes('..')) throw new Error('image path must name a local JPEG, PNG or WebP in assets/')
  for (const key of ['alt', 'credit']) if (!text(image[key])) throw new Error(`image ${key} must be nonempty text`)
  for (const key of ['sourceUrl', 'licenseUrl']) if (!httpsURL(image[key])) throw new Error(`image ${key} must be an HTTPS URL`)
  if (image.position !== undefined && !['center', 'top', 'bottom'].includes(image.position)) throw new Error('image position must be center, top or bottom')
  const path = realpathSync(resolve(assetsRoot, image.path.slice(7)))
  if (!path.startsWith(realpathSync(assetsRoot) + sep)) throw new Error('image must remain inside assets/')
  const bytes = readFileSync(path), extension = extname(path).toLowerCase()
  const jpeg = bytes.length > 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  const webp = bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
  const type = ['.jpg', '.jpeg'].includes(extension) && jpeg ? 'jpeg' : extension === '.png' && png ? 'png' : extension === '.webp' && webp ? 'webp' : null
  if (!type) throw new Error('image bytes do not match its JPEG, PNG or WebP extension')
  return `data:image/${type};base64,${bytes.toString('base64')}`
}

// These are the authored audience lines; notes and presentation chrome are excluded.
export function audienceLines(slide) {
  const result = [{ kind: 'title', text: slide.title }]
  if (slide.sectionLabel) result.push({ kind: 'sectionLabel', text: slide.sectionLabel })
  const content = slide.content
  for (const value of content.lines ?? content.labels ?? []) result.push({ kind: 'point', text: value })
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
    if (slide.tone !== undefined && !['paper', 'dark', 'coral', 'yellow'].includes(slide.tone)) fail(`${owner}: unsupported tone`)
    if (slide.image !== undefined) { try { imageAsset(slide.image) } catch (error) { fail(`${owner}: ${error.message}`) } }
    if (slide.graphic !== undefined && !['contours', 'arcs'].includes(slide.graphic)) fail(`${owner}: unsupported graphic`)
    if (!Number.isInteger(slide.durationSeconds) || slide.durationSeconds <= 0) fail(`${owner}: durationSeconds must be a positive integer`)
    else report.durationSeconds += slide.durationSeconds
    if (!object(slide.content)) { fail(`${owner}: content must be an object`); continue }
    const c = slide.content
    const labelArray = (key, min, max) => {
      if (!Array.isArray(c[key]) || c[key].length < min || c[key].length > max || !c[key].every(text)) fail(`${owner}: ${key} requires ${min}–${max} nonempty strings`)
    }
    const allowedContent = { statement: ['lines'], triad: ['labels'], cycle: ['labels'], question: [], steps: ['labels', 'caption', 'mode'], roles: ['circle', 'roles', 'caption'], divider: [], impact: ['caption'], values: ['labels'], pair: ['labels'], circles: ['circle', 'labels'] }[slide.layout]
    if (allowedContent) for (const key of Object.keys(c)) if (!allowedContent.includes(key)) fail(`${owner}: unsupported content field ${key}`)
    if (slide.layout === 'statement') labelArray('lines', 0, 2)
    if (['triad', 'cycle'].includes(slide.layout)) labelArray('labels', 3, 3)
    if (['values', 'circles'].includes(slide.layout)) labelArray('labels', 4, 4)
    if (slide.layout === 'pair') labelArray('labels', 2, 2)
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
      if (range.start < lastSourceLine && !coverage[range.start - 1].length) fail(`${owner}: source ranges must follow original order`)
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
  if (deck.slides.length > 10) finding('10-20-30', `slide count ${deck.slides.length} exceeds ten`, null, 'deck')
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

const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]))
// JSON is inert even when source text contains a script-closing sequence.
const embeddedJSON = value => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, character => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`)

// Layouts use a logical presentation canvas, scaled only to fit the viewport.
const THEME_CSS = `
:root { color-scheme: light; --paper:#f8f3eb; --ink:#111; --coral:#ff7870; --yellow:#ffd60a; --sky:#bcd8ff; }
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
.slide[data-layout="divider"] h1 { font-size:200px; line-height:.95; max-width:1136px; margin:0; }
.slide[data-layout="divider"] h1::after { content:''; display:block; width:180px; height:14px; margin-top:36px; background:currentColor; }
.slide[data-layout="impact"] { display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; }
.slide[data-layout="impact"] h1 { font-size:300px; line-height:.95; margin:0 0 32px; }
.slide[data-layout="impact"] .caption { margin:0; max-width:1060px; }
.statement-lines,.triad { display:flex; gap:26px; margin:52px 0 0; padding:0; list-style:none; }
.statement-lines li,.triad li { flex:1; padding:30px 24px; border:2px solid var(--ink); box-shadow:4px 4px 0 var(--ink); font-size:44px; line-height:1.18; background:var(--coral); }
.triad { display:grid; gap:18px; margin-top:36px; }
.triad li { color:var(--ink); padding:18px 24px; }
.slide[data-tone="dark"] .triad li { background:transparent; color:var(--paper); border-color:#5f5a54; box-shadow:none; }
.slide[data-tone="coral"] .triad li:first-child { background:var(--paper); }
.statement-lines li:nth-child(2),.triad li:nth-child(2) { background:var(--yellow); }
.triad li:nth-child(3) { background:var(--sky); }
.triad li { display:flex; align-items:center; gap:26px; }
.point-icon { flex:none; width:54px; height:54px; stroke:currentColor; stroke-width:2; fill:none; }
.slide[data-tone="dark"] .point-icon { color:var(--coral); }
.slide[data-tone="paper"] .triad li { border-radius:20px; padding:20px 28px; box-shadow:3px 3px 0 var(--ink); }
.slide[data-tone="coral"] .triad li { border-radius:38px; }
.brand-art { position:absolute; pointer-events:none; inset:0; width:100%; height:100%; object-fit:cover; opacity:.45; }
.slide h1,.section-label,.statement-lines,.triad,.diagram,.caption { position:relative; z-index:1; }
.slide-photo { position:absolute; object-fit:cover; border:2px solid var(--ink); }
.slide[data-layout="statement"].with-photo:has(.statement-lines:empty) { display:block; }
.slide[data-layout="statement"].with-photo:has(.statement-lines:empty) h1 { margin-top:95px; max-width:720px; font-size:116px; }
.slide[data-layout="statement"].with-photo:has(.statement-lines:empty) .slide-photo { right:0; top:0; width:460px; height:720px; border-width:0 0 0 2px; }
.slide[data-layout="statement"].with-photo:not(:has(.statement-lines:empty)) h1 { font-size:96px; max-width:1136px; }
.slide[data-layout="statement"].with-photo:not(:has(.statement-lines:empty)) .statement-lines { width:640px; display:grid; gap:24px; margin-top:32px; }
.slide[data-layout="statement"].with-photo:not(:has(.statement-lines:empty)) .statement-lines li { padding:28px; }
.slide[data-layout="statement"].with-photo:not(:has(.statement-lines:empty)) .slide-photo { right:72px; top:302px; width:444px; height:306px; border-radius:20px; }
.slide[data-layout="triad"].with-photo .triad { width:640px; gap:22px; }
.slide[data-layout="triad"].with-photo .slide-photo { right:72px; top:228px; width:420px; height:354px; border-radius:24px; }
.values,.pair { position:relative; z-index:1; display:grid; grid-template-columns:1fr 1fr; gap:24px; margin:32px 0 0; padding:0; list-style:none; }
.values li { display:flex; flex-direction:column; justify-content:space-between; gap:18px; min-height:188px; padding:26px 28px; border:2px solid var(--ink); border-radius:20px; background:var(--paper); font-size:44px; line-height:1.15; }
.values li:nth-child(2) { background:var(--sky); }
.values li:nth-child(3) { background:var(--yellow); }
.values li:nth-child(4) { background:var(--coral); }
.pair { gap:40px; margin-top:50px; }
.pair li { display:flex; flex-direction:column; justify-content:center; gap:48px; padding:40px; min-height:330px; border:2px solid var(--ink); font-size:44px; line-height:1.15; background:var(--sky); }
.pair li:first-child { background:var(--yellow); border-radius:24px 24px 6px 6px; }
.pair li:last-child { background:var(--sky); border-radius:50px; }
.pair .point-icon { width:90px; height:90px; }
.diagram { display:block; width:1136px; height:390px; overflow:visible; }
.diagram.circle-map { height:480px; }
.circle-map .subcircle { stroke:var(--ink); stroke-width:2; }
.circle-map .role-pip { fill:var(--paper); stroke:var(--ink); stroke-width:2; }
.diagram text { font-family:'DM Sans',sans-serif; font-size:44px; fill:var(--ink); }
.diagram .node { stroke:var(--ink); stroke-width:2; fill:var(--coral); }
.diagram .edge { stroke:var(--ink); stroke-width:4; fill:none; }
.caption { font-size:40px; line-height:1.2; margin:14px 0 0; }
.slide-footer { position:absolute; bottom:24px; left:72px; right:72px; display:flex; justify-content:space-between; align-items:center; font-size:20px; }
.brand-logo { width:42px; height:42px; padding:4px; object-fit:contain; background:var(--paper); border-radius:6px; }
.slide.with-photo .slide-footer span { background:var(--paper); color:var(--ink); padding:3px 9px; border-radius:5px; }
#controls { height:48px; display:flex; align-items:center; justify-content:center; gap:12px; padding:4px 12px; background:var(--paper); border-top:2px solid var(--ink); }
button,#notes-link { font:700 16px 'DM Sans',sans-serif; color:var(--ink); background:var(--paper); border:2px solid var(--ink); padding:5px 12px; cursor:pointer; text-decoration:none; }
button:disabled { opacity:.45; cursor:default; }
button:focus-visible,a:focus-visible,select:focus-visible { outline:3px solid var(--coral); outline-offset:2px; }
#progress { min-width:56px; text-align:center; font-size:16px; }
@media (max-width:700px) { #controls { gap:6px; padding:4px; } button,#notes-link { padding:5px 8px; } }
`

const RUNTIME_JS = `
(() => {
  const slides = [...document.querySelectorAll('#stage .slide')];
  const previous = document.getElementById('previous');
  const next = document.getElementById('next');
  const link = document.getElementById('notes-link');
  const deckId = JSON.parse(document.getElementById('deck-data').textContent).id;
  let presenter = null;
  const viewport = document.getElementById('viewport');
  const stage = document.getElementById('stage');
  let index = 0;
  function fit() { stage.style.setProperty('--scale', Math.min(viewport.clientWidth / 1280, viewport.clientHeight / 720)); }
  function show(value) {
    index = Math.max(0, Math.min(slides.length - 1, value));
    slides.forEach((slide, i) => { slide.hidden = i !== index; });
    previous.disabled = index === 0;
    next.disabled = index === slides.length - 1;
    document.getElementById('progress').textContent = (index + 1) + ' / ' + slides.length;
    if (presenter && !presenter.closed) presenter.postMessage({ type:'sapiens-slide', deckId, index }, '*');
  }
  function openNotes(event) {
    if (event && (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)) return;
    if (presenter && !presenter.closed) { event?.preventDefault(); presenter.focus(); show(index); return; }
    const opened = window.open(link.href, '_blank', 'popup,width=900,height=900');
    if (opened) { presenter = opened; event?.preventDefault(); }
  }
  window.addEventListener('message', event => {
    if (!presenter || event.source !== presenter || event.data?.deckId !== deckId) return;
    if (event.data.type === 'sapiens-notes-ready') show(index);
    if (event.data.type === 'sapiens-navigate' && Number.isInteger(event.data.index) && event.data.index >= 0 && event.data.index < slides.length) show(event.data.index);
  });
  previous.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  link.addEventListener('click', openNotes);
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.isContentEditable || event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    if (event.key === ' ' && event.target.closest('button,a')) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey)) show(index + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp' || (event.key === ' ' && event.shiftKey)) show(index - 1);
    else if (event.key === 'Home') show(0);
    else if (event.key === 'End') show(slides.length - 1);
    else if (event.key.toLowerCase() === 'n') { link.click(); return; }
    else return;
    event.preventDefault();
  });
  window.addEventListener('resize', fit);
  show(0); fit();
})();
`

function person(x, y, size = 1) {
  return `<g aria-hidden="true" transform="translate(${x} ${y}) scale(${size})" fill="none" stroke="currentColor" stroke-width="3"><circle cy="-17" r="13"/><path d="M-27 30V15Q-27 0 0 0Q27 0 27 15V30"/></g>`
}

function pointIcon(index, hopeful) {
  const paths = hopeful
    ? ['<path d="M32 54S8 38 8 22C8 7 26 6 32 18C38 6 56 7 56 22C56 38 32 54 32 54Z"/>', '<path d="M8 25L32 9L56 25M13 54H51M18 28V47M32 28V47M46 28V47"/>', '<path d="M13 39H24V54H13ZM27 28H38V54H27ZM41 14H52V54H41ZM12 25L48 8M36 8H48V20"/>']
    : ['<path d="M12 48V35H22V48M28 48V23H38V48M44 48V10H54V48M8 54H58"/>', '<path d="M8 24L32 9L56 24M10 54H54M18 29V47M32 29V36M46 29V47M25 45L39 31"/>', '<path d="M32 8L58 54H6ZM32 24V38"/><circle cx="32" cy="46" r="1.5"/>']
  return `<svg class="point-icon" viewBox="0 0 64 64" aria-hidden="true">${paths[index % 3]}</svg>`
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
  const colors = ['var(--coral)', 'var(--yellow)', 'var(--sky)', 'var(--paper)']
  let body, description
  if (slide.layout === 'circles') {
    description = `${c.circle} contains the circles ${c.labels.join(', ')}. Nested circles show scopes of shared purpose and contain roles, without reporting arrows. This is an excerpt inspired by Sapiens First Atlas, not the complete roster. Small role dots are illustrative, not headcounts or organizational metrics.`
    const fills = ['#efe5d4', '#f4c9ad', '#d5e1bd', '#f4df9a']
    body = `<ellipse class="circle-parent" cx="568" cy="240" rx="550" ry="230" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/>${label(c.circle, 568, 65)}`
    body += c.labels.map((value, i) => {
      const x = [158, 432, 704, 978][i]
      return `<circle class="subcircle" cx="${x}" cy="240" r="126" fill="${fills[i]}"/>${label(value, x, 236, 40)}<g aria-hidden="true">${[-35, 0, 35].map(offset => `<circle class="role-pip" cx="${x + offset}" cy="300" r="13"/>`).join('')}</g>`
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
    body = `<ellipse class="node" cx="568" cy="195" rx="515" ry="185" style="fill:var(--sky)"/>${label(c.circle, 568, 55)}`
    for (const [i, value] of c.roles.entries()) {
      const y = (c.roles.length === 3 ? 120 : 150) + i * 82
      body += `<rect class="node" x="200" y="${y - 36}" width="736" height="72" rx="16" style="fill:${colors[i]}"/>${label(value, 568, y)}`
    }
  }
  return `<svg class="diagram${slide.layout === 'circles' ? ' circle-map' : ''}" viewBox="0 0 1136 ${slide.layout === 'circles' ? 480 : 390}" role="img" aria-labelledby="diagram-title-${index} diagram-desc-${index}"><title id="diagram-title-${index}">${escapeHTML(slide.title)}</title><desc id="diagram-desc-${index}">${escapeHTML(description)}</desc><defs><marker id="${marker}" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" refX="14" refY="7" orient="auto"><path d="M0 0 L14 7 L0 14 Z" fill="currentColor"/></marker></defs>${body}</svg>`
}

const asset = path => readFileSync(new URL(path, import.meta.url))
function embeddedFonts() {
  const fonts = [['barlow-condensed-800', 'Barlow Condensed', 800], ['dm-sans-400', 'DM Sans', 400], ['dm-sans-700', 'DM Sans', 700]]
  return fonts.map(([file, family, weight]) => `@font-face { font-family:'${family}'; font-style:normal; font-weight:${weight}; src:url(data:font/ttf;base64,${asset(`fonts/${file}.ttf`).toString('base64')}) format('truetype'); font-display:block; }`).join('\n')
}
const fontLicenses = () => ['Barlow-Condensed-OFL.txt', 'DM-Sans-OFL.txt'].map(file => asset(`fonts/${file}`).toString('utf8')).join('\n\n')

export function renderDeck(deck, { notesHref = `${encodeURIComponent(deck.id)}.notes.html` } = {}) {
  if (!text(notesHref) || /[\\/]/.test(notesHref) || /^[a-z][a-z\d+.-]*:/i.test(notesHref)) throw new Error('Notes link must be a sibling filename')
  const logo = asset('../../docs/public/logo.png').toString('base64')
  const slides = deck.slides.map((slide, index) => {
    let content = ''
    if (slide.layout === 'statement') content = `<ul class="statement-lines">${slide.content.lines.map(value => `<li class="audience-text">${escapeHTML(value)}</li>`).join('')}</ul>`
    if (slide.layout === 'triad') content = `<ul class="triad">${slide.content.labels.map((value, i) => `<li>${pointIcon(i, slide.tone !== 'dark')}<span class="audience-text">${escapeHTML(value)}</span></li>`).join('')}</ul>`
    if (slide.layout === 'values') content = `<ul class="values">${slide.content.labels.map((value, i) => `<li>${valueIcon(i)}<span class="audience-text">${escapeHTML(value)}</span></li>`).join('')}</ul>`
    if (slide.layout === 'pair') content = `<ul class="pair">${slide.content.labels.map((value, i) => `<li>${pairIcon(i)}<span class="audience-text">${escapeHTML(value)}</span></li>`).join('')}</ul>`
    if (['cycle', 'steps', 'roles', 'circles'].includes(slide.layout)) content = diagram(slide, index)
    const photo = slide.image ? `<img class="slide-photo" alt="${escapeHTML(slide.image.alt)}" src="${imageAsset(slide.image)}" style="object-position:${slide.image.position ?? 'center'}">` : ''
    if (slide.graphic !== undefined && !['contours', 'arcs'].includes(slide.graphic)) throw new Error('Unsupported graphic')
    const graphic = slide.graphic ? `<img class="brand-art" alt="" aria-hidden="true" src="data:image/svg+xml;base64,${asset(`assets/sapiens-${slide.graphic}.svg`).toString('base64')}">` : ''
    return `<section class="slide${slide.image ? ' with-photo' : ''}" data-slide-id="${escapeHTML(slide.id)}" data-layout="${slide.layout}" data-purpose="${slide.purpose}" data-tone="${slide.tone ?? 'paper'}" aria-labelledby="slide-title-${index}"${index ? ' hidden' : ''}>${graphic}${photo}${slide.sectionLabel ? `<p class="section-label audience-text">${escapeHTML(slide.sectionLabel)}</p>` : ''}<h1 class="audience-text" id="slide-title-${index}">${escapeHTML(slide.title)}</h1>${content}${slide.content.caption ? `<p class="caption audience-text">${escapeHTML(slide.content.caption)}</p>` : ''}<footer class="slide-footer"><img class="brand-logo" alt="Sapiens First" src="data:image/png;base64,${logo}"><span>${index + 1} / ${deck.slides.length}</span></footer></section>`
  }).join('\n')
  const audience = { id: deck.id, title: deck.title, slides: deck.slides.map(({ notes, ...slide }) => slide) }
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(deck.title)}</title><style>${embeddedFonts()}\n${THEME_CSS}</style></head>
<body><main id="presentation"><div id="viewport"><div id="stage" aria-label="Presentation slides">${slides}</div></div></main>
<nav id="controls" aria-label="Presentation controls"><button id="previous" type="button" disabled aria-label="Previous slide">Previous</button><span id="progress" role="status" aria-live="polite">1 / ${deck.slides.length}</span><button id="next" type="button"${deck.slides.length === 1 ? ' disabled' : ''} aria-label="Next slide">Next</button><a id="notes-link" href="${escapeHTML(notesHref)}" target="_blank">Presenter notes</a></nav>
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
    const slide = deck.slides[index], image = slide.image
    const credits = `${image ? `<p class="asset-credit">${escapeHTML(image.credit)} · <a href="${escapeHTML(image.sourceUrl)}">Photo source</a> · <a href="${escapeHTML(image.licenseUrl)}">License</a></p>` : ''}${slide.graphic ? `<p class="asset-credit">Sapiens First brand artwork · <a href="https://sapiensfirst.org/assets/homepage-${slide.graphic === 'contours' ? 'strategy-contours' : 'involved-arcs'}.svg">Artwork source</a></p>` : ''}`
    return `<article class="slide-notes" data-slide-id="${escapeHTML(note.slideId)}"${index ? ' hidden' : ''}><h2>${escapeHTML(slide.title)}</h2><h3>Original source passages</h3>${note.passages.map(passage => `<pre class="source-passage"><span>${escapeHTML(passage)}</span></pre>`).join('')}${note.cues.length ? `<h3>Editorial cues (added prompts)</h3><ul class="editorial-cues">${note.cues.map(cue => `<li>${escapeHTML(cue)}</li>`).join('')}</ul>` : ''}${credits ? `<h3>Image and artwork credits</h3>${credits}` : ''}</article>`
  }).join('\n')
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(deck.title)} — Presenter notes</title><style>${embeddedFonts()}\n${NOTES_CSS}</style></head>
<body><header><h1>${escapeHTML(deck.title)} — Presenter notes</h1><p>Move this window to your second screen. Open it from the slides to keep navigation in sync.</p><p id="connection-status" role="status">Standalone notes. Use the controls to choose a slide.</p></header>
<nav aria-label="Presenter controls"><button id="previous" type="button" disabled>Previous</button><span id="progress" role="status" aria-live="polite">1 / ${deck.slides.length}</span><button id="next" type="button"${deck.slides.length === 1 ? ' disabled' : ''}>Next</button><select id="slide-select" aria-label="Choose slide">${deck.slides.map((slide, i) => `<option value="${i}">${i + 1}. ${escapeHTML(slide.title)}</option>`).join('')}</select></nav>
<main aria-label="Speaker notes">${notesHTML}</main><script id="deck-data" type="application/json">${embeddedJSON({ ...deck, notes })}</script><pre id="font-licenses" hidden>${escapeHTML(fontLicenses())}</pre><script>${NOTES_RUNTIME_JS}</script></body></html>\n`
}

async function main(args) {
  const [operation, input, ...rest] = args
  const output = operation === 'build' ? rest[0] : undefined
  const flags = operation === 'build' ? rest.slice(1) : rest
  const json = flags.includes('--json')
  try {
    if (!['validate', 'build'].includes(operation) || !input || (operation === 'build' && (!output || output.startsWith('--'))) || flags.some(f => !(operation === 'validate' ? ['--json', '--strict'] : ['--strict']).includes(f))) throw new Error('Usage: node experiments/slides/slides.mjs validate DECK [--strict] [--json]\n       node experiments/slides/slides.mjs build DECK OUTPUT [--strict]')
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
      const html = renderDeck(deck, { notesHref: encodeURIComponent(basename(notesDestination)) })
      const notesHTML = renderNotes(deck)
      const files = [[destination, html], [notesDestination, notesHTML]]
      const temporary = files.map(([path]) => `${path}.tmp-${process.pid}`)
      mkdirSync(dirname(destination), { recursive: true })
      try {
        files.forEach(([, contents], index) => writeFileSync(temporary[index], contents))
        files.forEach(([path], index) => renameSync(temporary[index], path))
      } finally { temporary.forEach(path => rmSync(path, { force: true })) }
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
