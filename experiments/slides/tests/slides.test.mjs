import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const tool = new URL('../slides.mjs', import.meta.url)
const deckPath = new URL('../decks/10-6-dna.deck.json', import.meta.url)
const deck = () => JSON.parse(readFileSync(deckPath, 'utf8'))
function check(t, value, ...flags) {
  const dir = mkdtempSync(join(tmpdir(), 'dna-validation-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const path = join(dir, 'deck.json')
  writeFileSync(path, typeof value === 'string' ? value : JSON.stringify(value))
  const result = spawnSync(process.execPath, [fileURLToPath(tool), 'validate', path, '--json', ...flags], { encoding: 'utf8' })
  assert.ifError(result.error)
  return { ...result, report: JSON.parse(result.stdout) }
}

test('DNA deck passes strict coverage and rule validation', t => {
  const result = check(t, deck(), '--strict')
  assert.equal(result.status, 0, result.stdout + result.stderr)
  assert.equal(result.report.errors.length, 0)
  assert.equal(result.report.coverage.uncovered.length, 0)
  assert.equal(result.report.durationSeconds, 840)
  assert.equal(result.report.slideCount, 10)
})

test('invalid JSON and unsupported deck structures have useful errors', t => {
  assert.match(check(t, '{').report.errors.join(' '), /JSON/)
  for (const [field, value, match] of [['schemaVersion', 2, /version/i], ['slides', [], /slides/i]]) {
    const data = deck(); data[field] = value
    const result = check(t, data)
    assert.notEqual(result.status, 0)
    assert.match(result.report.errors.join(' '), match)
  }
  const data = deck(); data.slides[1].layout = 'unknown'; data.slides[1].id = data.slides[0].id
  const result = check(t, data)
  assert.match(result.report.errors.join(' '), /layout/)
  assert.match(result.report.errors.join(' '), /duplicate/i)
})

test('missing substantive source and invalid ranges fail even with the full snapshot', t => {
  const data = deck(); data.slides[0].notes.sourceRanges = []
  const result = check(t, data)
  assert.notEqual(result.status, 0)
  assert.ok(result.report.coverage.uncovered.includes(3))
  data.slides[0].notes.sourceRanges = [{ start: 0, end: 9999 }]
  assert.match(check(t, data).report.errors.join(' '), /range/i)
})

test('notes preserve source slices exactly and label editorial cues separately', t => {
  const data = deck(); const result = check(t, data)
  const lines = data.source.text.split('\n')
  for (const [index, slide] of data.slides.entries()) {
    const expected = slide.notes.sourceRanges.map(({ start, end }) => lines.slice(start - 1, end).join('\n'))
    assert.deepEqual(result.report.notes[index].passages, expected)
    assert.deepEqual(result.report.notes[index].cues, slide.notes.cues)
  }
  assert.ok(result.report.notes[7].passages.join('\n').includes('Regenerative culture'))
})

test('changed original source requires a deliberate snapshot and digest refresh', t => {
  const dir = mkdtempSync(join(tmpdir(), 'dna-source-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const data = deck(); data.source.path = join(dir, 'source.txt')
  writeFileSync(data.source.path, data.source.text + '\n')
  assert.match(check(t, data).report.errors.join(' '), /refresh/i)
  data.source.text += '\n'
  data.source.sha256 = createHash('sha256').update(data.source.text).digest('hex')
  assert.equal(check(t, data).status, 0)
})

test('presentation findings identify point words, slide count, content run and timing', t => {
  const data = deck(); data.slides[2].content.labels[0] = 'one two three four five six'
  data.slides[5].role = 'content'; data.slides.push({ ...structuredClone(data.slides[9]), id: 'eleventh' })
  data.slides[0].durationSeconds = 1500
  const result = check(t, data, '--strict')
  assert.notEqual(result.status, 0)
  for (const rule of ['5-5-5', '10-20-30']) assert.ok(result.report.findings.some(f => f.rule === rule))
  assert.ok(result.report.findings.some(f => f.slideId === data.slides[2].id && /words/.test(f.message)))
  assert.ok(result.report.findings.some(f => /consecutive/.test(f.message)))
  assert.ok(result.report.findings.some(f => /duration/.test(f.message)))
})

test('titles, section labels, captions and diagram labels count; long cues do not', t => {
  const data = deck(); data.slides[6].sectionLabel = 'Roadmap'
  data.slides[6].title = 'one two three four five six seven'
  data.slides[6].content.caption = 'one two three four five six seven'
  data.slides[6].notes.cues.push('cue '.repeat(200))
  const result = check(t, data)
  assert.ok(result.report.findings.some(f => f.slideId === data.slides[6].id && /lines/.test(f.message)))
  assert.ok(result.report.findings.some(f => /title.*words/.test(f.message)))
  assert.ok(result.report.findings.some(f => /caption.*words/.test(f.message)))
  assert.ok(!result.report.findings.some(f => /cue/.test(f.message)))
})

test('a Culture gap can classify an empty heading, never substantive text', t => {
  const data = deck()
  data.sourceGaps = [{ start: 3, end: 3, heading: 'Culture', explanation: 'Missing' }]
  data.slides[0].notes.sourceRanges = []
  const result = check(t, data)
  assert.notEqual(result.status, 0)
  assert.ok(result.report.coverage.uncovered.includes(3))
})
