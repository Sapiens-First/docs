import { createHash } from 'node:crypto'
import { readFileSync, mkdirSync, writeFileSync, renameSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const layouts = ['statement', 'triad', 'cycle', 'question', 'steps', 'roles']
const purposes = ['explain', 'engage', 'empower']
const words = text => text.trim().split(/\s+/).filter(Boolean).length
const hash = text => createHash('sha256').update(text).digest('hex')
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = value => typeof value === 'string' && value.trim().length > 0
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

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
    if (!Number.isInteger(slide.durationSeconds) || slide.durationSeconds <= 0) fail(`${owner}: durationSeconds must be a positive integer`)
    else report.durationSeconds += slide.durationSeconds
    if (!object(slide.content)) { fail(`${owner}: content must be an object`); continue }
    const c = slide.content
    const labelArray = (key, min, max) => {
      if (!Array.isArray(c[key]) || c[key].length < min || c[key].length > max || !c[key].every(text)) fail(`${owner}: ${key} requires ${min}–${max} nonempty strings`)
    }
    const allowedContent = { statement: ['lines'], triad: ['labels'], cycle: ['labels'], question: [], steps: ['labels', 'caption'], roles: ['circle', 'roles', 'caption'] }[slide.layout]
    if (allowedContent) for (const key of Object.keys(c)) if (!allowedContent.includes(key)) fail(`${owner}: unsupported content field ${key}`)
    if (slide.layout === 'statement') labelArray('lines', 0, 2)
    if (['triad', 'cycle'].includes(slide.layout)) labelArray('labels', 3, 3)
    if (slide.layout === 'steps') labelArray('labels', 3, 4)
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
    if (slide.ruleExceptions !== undefined && (!Array.isArray(slide.ruleExceptions) || !slide.ruleExceptions.every(e => object(e) && ['1-6-6', '5-5-5', '10-20-30'].includes(e.rule) && text(e.reason) && text(e.text)))) fail(`${owner}: ruleExceptions require rule, reason and affected text`)
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
    const exception = slide?.ruleExceptions?.find(e => e.rule === rule && e.text === affected)
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
.statement-lines,.triad { display:flex; gap:26px; margin:52px 0 0; padding:0; list-style:none; }
.statement-lines li,.triad li { flex:1; padding:30px 24px; border:2px solid var(--ink); box-shadow:6px 6px 0 var(--ink); font-size:44px; line-height:1.18; background:var(--coral); }
.triad { display:grid; gap:18px; margin-top:36px; }
.triad li { color:var(--ink); padding:18px 24px; }
.slide[data-tone="dark"] .triad li { box-shadow:6px 6px 0 var(--paper); }
.slide[data-tone="coral"] .triad li:first-child { background:var(--paper); }
.statement-lines li:nth-child(2),.triad li:nth-child(2) { background:var(--yellow); }
.triad li:nth-child(3) { background:var(--sky); }
.diagram { display:block; width:1136px; height:390px; overflow:visible; }
.diagram text { font-family:'DM Sans',sans-serif; font-size:44px; fill:var(--ink); }
.diagram .node { stroke:var(--ink); stroke-width:2; fill:var(--coral); }
.diagram .edge { stroke:var(--ink); stroke-width:4; fill:none; }
.caption { font-size:40px; line-height:1.2; margin:14px 0 0; }
.slide-footer { position:absolute; bottom:24px; left:72px; right:72px; display:flex; justify-content:space-between; align-items:center; font-size:20px; }
.brand-logo { width:42px; height:42px; object-fit:contain; }
#controls { height:48px; display:flex; align-items:center; justify-content:center; gap:12px; padding:4px 12px; background:var(--paper); border-top:2px solid var(--ink); }
button { font:700 16px 'DM Sans',sans-serif; color:var(--ink); background:var(--paper); border:2px solid var(--ink); padding:5px 12px; cursor:pointer; }
button:disabled { opacity:.45; cursor:default; }
button:focus-visible { outline:3px solid var(--coral); outline-offset:2px; }
#progress { min-width:56px; text-align:center; font-size:16px; }
#notes-panel { width:min(440px,44vw); flex:none; padding:24px; overflow:auto; background:var(--paper); border-left:2px solid var(--ink); font-size:18px; }
#notes-panel h2 { font:800 36px 'Barlow Condensed',sans-serif; margin:0 0 16px; }
#notes-panel h3 { font-size:18px; }
.source-passage { font:400 18px/1.5 'DM Sans',sans-serif; white-space:pre-wrap; overflow-wrap:anywhere; }
.editorial-cues { padding-left:22px; line-height:1.5; }
@media (max-width:700px) { #presentation { flex-direction:column; } #notes-panel { width:100%; height:42%; border-left:0; border-top:2px solid var(--ink); padding:16px; } #controls { gap:6px; padding:4px; } button { padding:5px 8px; } }
`

const RUNTIME_JS = `
(() => {
  const slides = [...document.querySelectorAll('#stage .slide')];
  const notes = [...document.querySelectorAll('.slide-notes')];
  const previous = document.getElementById('previous');
  const next = document.getElementById('next');
  const toggle = document.getElementById('notes-toggle');
  const panel = document.getElementById('notes-panel');
  const viewport = document.getElementById('viewport');
  const stage = document.getElementById('stage');
  let index = 0;
  function fit() { stage.style.setProperty('--scale', Math.min(viewport.clientWidth / 1280, viewport.clientHeight / 720)); }
  function show(value) {
    index = Math.max(0, Math.min(slides.length - 1, value));
    slides.forEach((slide, i) => { slide.hidden = i !== index; });
    notes.forEach((note, i) => { note.hidden = i !== index; });
    previous.disabled = index === 0;
    next.disabled = index === slides.length - 1;
    document.getElementById('progress').textContent = (index + 1) + ' / ' + slides.length;
    panel.scrollTop = 0;
  }
  function toggleNotes() {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
    toggle.textContent = panel.hidden ? 'Notes' : 'Hide notes';
    fit();
  }
  previous.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  toggle.addEventListener('click', toggleNotes);
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.isContentEditable || event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    if (event.key === ' ' && event.target.closest('button')) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey)) show(index + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp' || (event.key === ' ' && event.shiftKey)) show(index - 1);
    else if (event.key === 'Home') show(0);
    else if (event.key === 'End') show(slides.length - 1);
    else if (event.key.toLowerCase() === 'n') toggleNotes();
    else return;
    event.preventDefault();
  });
  window.addEventListener('resize', fit);
  show(0); fit();
})();
`

function diagram(slide, index) {
  const c = slide.content, marker = `arrow-${index}`
  const label = (value, x, y) => `<text class="audience-text" x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${escapeHTML(value)}</text>`
  let body, description
  if (slide.layout === 'cycle') {
    description = `${c.labels.join(' → ')} → ${c.labels[0]}. Each stage leads to the next and repeats.`
    body = `<path class="edge" marker-end="url(#${marker})" d="M 700 60 Q 1050 75 895 235"/><path class="edge" marker-end="url(#${marker})" d="M 720 310 L 415 310"/><path class="edge" marker-end="url(#${marker})" d="M 260 235 Q 120 70 430 60"/>`
    for (const [i, [x, y]] of [[568, 65], [850, 305], [285, 305]].entries()) body += `<rect class="node" x="${x - 140}" y="${y - 45}" width="280" height="90"/>${label(c.labels[i], x, y)}`
  } else if (slide.layout === 'steps') {
    description = `Ordered progression: ${c.labels.map((value, i) => `${i + 1}. ${value}`).join('; ')}.`
    body = c.labels.map((value, i) => {
      const y = 46 + i * 92
      return `${i ? `<path class="edge" marker-end="url(#${marker})" d="M 170 ${y - 53} L 170 ${y - 36}"/>` : ''}<rect class="node" x="118" y="${y - 35}" width="100" height="70"/><text x="168" y="${y}" text-anchor="middle" dominant-baseline="middle" aria-hidden="true">${i + 1}</text>${label(value, 655, y)}`
    }).join('')
  } else {
    description = `${c.circle} contains the roles ${c.roles.join(' and ')}. Roles have ownership within their circle.`
    body = `<ellipse class="node" cx="568" cy="195" rx="515" ry="185" style="fill:var(--sky)"/>${label(c.circle, 568, 55)}`
    for (const [i, value] of c.roles.entries()) {
      const y = 140 + i * 82
      body += `<rect class="node" x="200" y="${y - 36}" width="736" height="72"/>${label(value, 568, y)}`
    }
  }
  return `<svg class="diagram" viewBox="0 0 1136 390" role="img" aria-labelledby="diagram-title-${index} diagram-desc-${index}"><title id="diagram-title-${index}">${escapeHTML(slide.title)}</title><desc id="diagram-desc-${index}">${escapeHTML(description)}</desc><defs><marker id="${marker}" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="currentColor"/></marker></defs>${body}</svg>`
}

export function renderDeck(deck) {
  const asset = path => readFileSync(new URL(path, import.meta.url))
  const fonts = [['barlow-condensed-800', 'Barlow Condensed', 800], ['dm-sans-400', 'DM Sans', 400], ['dm-sans-700', 'DM Sans', 700]]
  const fontCSS = fonts.map(([file, family, weight]) => `@font-face { font-family:'${family}'; font-style:normal; font-weight:${weight}; src:url(data:font/ttf;base64,${asset(`fonts/${file}.ttf`).toString('base64')}) format('truetype'); font-display:block; }`).join('\n')
  const logo = asset('../../docs/public/logo.png').toString('base64')
  const licenses = ['Barlow-Condensed-OFL.txt', 'DM-Sans-OFL.txt'].map(file => asset(`fonts/${file}`).toString('utf8')).join('\n\n')
  const notes = deck.slides.map(slide => assembleNotes(deck, slide))
  const slides = deck.slides.map((slide, index) => {
    let content = ''
    if (slide.layout === 'statement') content = `<ul class="statement-lines">${slide.content.lines.map(value => `<li class="audience-text">${escapeHTML(value)}</li>`).join('')}</ul>`
    if (slide.layout === 'triad') content = `<ul class="triad">${slide.content.labels.map(value => `<li class="audience-text">${escapeHTML(value)}</li>`).join('')}</ul>`
    if (['cycle', 'steps', 'roles'].includes(slide.layout)) content = diagram(slide, index)
    return `<section class="slide" data-slide-id="${escapeHTML(slide.id)}" data-layout="${slide.layout}" data-purpose="${slide.purpose}" data-tone="${slide.tone ?? 'paper'}" aria-labelledby="slide-title-${index}"${index ? ' hidden' : ''}>${slide.sectionLabel ? `<p class="section-label audience-text">${escapeHTML(slide.sectionLabel)}</p>` : ''}<h1 class="audience-text" id="slide-title-${index}">${escapeHTML(slide.title)}</h1>${content}${slide.content.caption ? `<p class="caption audience-text">${escapeHTML(slide.content.caption)}</p>` : ''}<footer class="slide-footer"><img class="brand-logo" alt="Sapiens First" src="data:image/png;base64,${logo}"><span>${index + 1} / ${deck.slides.length}</span></footer></section>`
  }).join('\n')
  const notesHTML = notes.map((note, index) => `<article class="slide-notes" data-slide-id="${escapeHTML(note.slideId)}"${index ? ' hidden' : ''}><h2>${escapeHTML(deck.slides[index].title)}</h2><h3>Original source passages</h3>${note.passages.map(passage => `<pre class="source-passage"><span>${escapeHTML(passage)}</span></pre>`).join('')}${note.cues.length ? `<h3>Editorial cues (added prompts)</h3><ul class="editorial-cues">${note.cues.map(cue => `<li>${escapeHTML(cue)}</li>`).join('')}</ul>` : ''}</article>`).join('\n')
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(deck.title)}</title><style>${fontCSS}\n${THEME_CSS}</style></head>
<body><main id="presentation"><div id="viewport"><div id="stage" aria-label="Presentation slides">${slides}</div></div><aside id="notes-panel" aria-label="Speaker notes" hidden>${notesHTML}</aside></main>
<nav id="controls" aria-label="Presentation controls"><button id="previous" type="button" disabled aria-label="Previous slide">Previous</button><span id="progress" role="status" aria-live="polite">1 / ${deck.slides.length}</span><button id="next" type="button"${deck.slides.length === 1 ? ' disabled' : ''} aria-label="Next slide">Next</button><button id="notes-toggle" type="button" aria-expanded="false" aria-controls="notes-panel">Notes</button></nav>
<script id="deck-data" type="application/json">${embeddedJSON({ ...deck, notes })}</script><pre id="font-licenses" hidden>${escapeHTML(licenses)}</pre><script>${RUNTIME_JS}</script></body></html>\n`
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
      const html = renderDeck(deck)
      const destination = resolve(output)
      const temporary = `${destination}.tmp-${process.pid}`
      mkdirSync(dirname(destination), { recursive: true })
      try {
        writeFileSync(temporary, html)
        renameSync(temporary, destination)
      } finally { rmSync(temporary, { force: true }) }
      console.log(`Built ${output}`)
    }
    process.exitCode = ok ? 0 : 1
  } catch (error) {
    if (json) console.log(JSON.stringify({ errors: [error.message] }))
    else console.error(error.message)
    process.exitCode = 1
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2))
