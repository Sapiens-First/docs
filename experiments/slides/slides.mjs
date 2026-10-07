import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
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
  if (existsSync(sourcePath)) {
    if (hash(readFileSync(sourcePath)) !== deck.source.sha256) fail('Original source changed: refresh the source snapshot, digest and line mapping explicitly')
  }
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

async function main(args) {
  const [operation, input, ...flags] = args
  const json = flags.includes('--json')
  try {
    if (operation !== 'validate' || !input || flags.some(f => !['--json', '--strict'].includes(f))) throw new Error('Usage: node experiments/slides/slides.mjs validate DECK [--strict] [--json]')
    const report = validateDeck(loadDeck(input))
    const ok = !report.errors.length && (!flags.includes('--strict') || report.findings.every(f => f.justified))
    if (json) console.log(JSON.stringify(report, null, 2))
    else {
      console.log(`${report.slideCount} slides; ${report.durationSeconds}s; ${report.coverage.uncovered.length} uncovered lines`)
      for (const error of report.errors) console.error(`ERROR: ${error}`)
      for (const f of report.findings) console.log(`${f.rule} ${f.slideId ?? 'deck'}: ${f.message}${f.justified ? ` (exception: ${f.reason})` : ''}`)
      if (ok) console.log('Validation passed')
    }
    process.exitCode = ok ? 0 : 1
  } catch (error) {
    if (json) console.log(JSON.stringify({ errors: [error.message] }))
    else console.error(error.message)
    process.exitCode = 1
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2))
