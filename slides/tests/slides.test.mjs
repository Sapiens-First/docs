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
function byId(data, id) {
  const slide = data.slides.find(slide => slide.id === id)
  assert.ok(slide, `Missing acceptance slide: ${id}`)
  return slide
}
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
  assert.equal(result.report.durationSeconds, 1195)
  assert.equal(result.report.slideCount, 24)
  assert.equal(result.report.coverage.duplicated.length, 0)
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
  assert.ok(result.report.notes.find(note => note.slideId === 'culture-values').passages.join('\n').includes('Regenerative culture'))
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
  const data = deck(); byId(data, 'crisis').content.labels[0] = 'one two three four five six'
  for (const slide of data.slides) slide.role = 'content'
  data.slides.push({ ...structuredClone(byId(data, 'next-step')), id: 'twentieth' })
  data.slides[0].durationSeconds = 1500
  const result = check(t, data, '--strict')
  assert.notEqual(result.status, 0)
  for (const rule of ['5-5-5', '10-20-30']) assert.ok(result.report.findings.some(f => f.rule === rule))
  assert.ok(result.report.findings.some(f => f.slideId === 'crisis' && /words/.test(f.message)))
  assert.ok(result.report.findings.some(f => /consecutive/.test(f.message)))
  assert.ok(result.report.findings.some(f => /duration/.test(f.message)))
})

test('titles, section labels, captions and diagram labels count; long cues do not', t => {
  const data = deck(); byId(data, 'roles').sectionLabel = 'Roadmap'
  byId(data, 'roles').title = 'one two three four five six seven'
  byId(data, 'roles').content.caption = 'one two three four five six seven'
  byId(data, 'roles').notes.cues.push('cue '.repeat(200))
  byId(data, 'roles').content.roles.push('Another role')
  const result = check(t, data)
  assert.ok(result.report.findings.some(f => f.slideId === byId(data, 'roles').id && /lines/.test(f.message)))
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

function build(t, data = deck(), flags = []) {
  const dir = mkdtempSync(join(tmpdir(), 'dna-build-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const input = join(dir, 'deck.json'), output = join(dir, 'deck presentation.html'), notesOutput = join(dir, 'deck presentation.notes.html')
  const original = JSON.stringify(data)
  writeFileSync(input, original)
  const run = () => {
    const result = spawnSync(process.execPath, [fileURLToPath(tool), 'build', input, output, ...flags], { encoding: 'utf8' })
    assert.ifError(result.error)
    return result
  }
  return { input, output, notesOutput, original, run }
}

const embeddedDeck = html => JSON.parse(html.match(/<script id="deck-data" type="application\/json">([\s\S]*?)<\/script>/)[1])

test('private presenter cues are absent from audience HTML and preserved in separate notes', t => {
  const data = deck(), cue = 'Private presenter-only cue: pause for questions and explain assumptions.'
  data.slides[0].notes.cues.push(cue)
  const fixture = build(t, data)
  const result = fixture.run()
  assert.equal(result.status, 0, result.stdout + result.stderr)
  const audience = readFileSync(fixture.output, 'utf8'), presenter = readFileSync(fixture.notesOutput, 'utf8')
  assert.ok(!audience.includes(cue), 'private cue is not exposed to the audience file')
  assert.ok(presenter.includes(cue), 'private cue is present in presenter notes')
  assert.equal(embeddedDeck(audience).source, undefined)
  assert.equal(embeddedDeck(presenter).source.text, data.source.text)
})

test('build produces twenty-four slides and deterministic self-contained resources', t => {
  const fixture = build(t, deck(), ['--strict'])
  const first = fixture.run()
  assert.equal(first.status, 0, first.stdout + first.stderr)
  const html = readFileSync(fixture.output, 'utf8')
  const notesHTML = readFileSync(fixture.notesOutput, 'utf8')
  assert.ok(html.includes('href="deck%20presentation.notes.html"'), 'notes filename is URL-encoded for spaces')
  const audience = embeddedDeck(html)
  assert.equal(audience.source, undefined)
  assert.equal(audience.notes, undefined)
  assert.ok(audience.slides.every(slide => slide.notes === undefined))
  assert.doesNotMatch(html, /class="(?:source-passage|editorial-cues|slide-notes)"|id="notes-panel"/)
  const sections = html.match(/<section\b[^>]*>/g) ?? []
  assert.equal(sections.filter(tag => tag.match(/\bclass="([^"]*)"/)?.[1].split(/\s+/).includes('slide')).length, 24)
  for (const layout of ['statement', 'triad', 'cycle', 'question', 'steps', 'roles', 'divider', 'impact', 'values', 'pair', 'circles', 'choice', 'photo', 'figure', 'agenda', 'tree']) assert.ok(html.includes(`data-layout="${layout}"`))
  for (const page of [html, notesHTML]) assert.match(page, /<link rel="icon" type="image\/png"[^>]*href="data:image\/png;base64,/, 'self-contained favicon')
  assert.match(html, /data-steps="1"/, 'crisis exposes a click-to-reveal step')
  assert.match(html, /data:image\/png;base64,/)
  assert.equal((html.match(/data:font\/ttf;base64,/g) ?? []).length, 3)
  assert.match(html, /SIL OPEN FONT LICENSE/)
  assert.doesNotMatch(html, /<(?:script|link|img)[^>]*(?:src|href)="(?:https?:|\/|\.\.)/i)
  assert.doesNotMatch(html, /\bfetch\s*\(/)
  assert.equal(fixture.run().status, 0)
  assert.equal(readFileSync(fixture.output, 'utf8'), html)
  assert.equal(readFileSync(fixture.notesOutput, 'utf8'), notesHTML)
  assert.equal(readFileSync(fixture.input, 'utf8'), fixture.original)
})

test('changing JSON labels changes HTML while notes and full source remain exact', t => {
  const data = deck(); byId(data, 'momentum').content.labels[0] = 'Gather'
  const fixture = build(t, data)
  const result = fixture.run()
  assert.equal(result.status, 0, result.stdout + result.stderr)
  const html = readFileSync(fixture.output, 'utf8')
  assert.ok(html.includes('Gather</text>'))
  const embedded = embeddedDeck(readFileSync(fixture.notesOutput, 'utf8'))
  assert.equal(embedded.source.text, data.source.text)
  assert.equal(createHash('sha256').update(embedded.source.text).digest('hex'), data.source.sha256)
  const lines = data.source.text.split('\n')
  for (const [index, slide] of data.slides.entries()) {
    assert.equal(embedded.notes[index].slideId, slide.id)
    assert.deepEqual(embedded.notes[index].passages, slide.notes.sourceRanges.map(({ start, end }) => lines.slice(start - 1, end).join('\n')))
    assert.deepEqual(embedded.notes[index].cues, slide.notes.cues)
  }
})

test('all authored strings are escaped in HTML and inert embedded JSON', t => {
  const data = deck(), attack = '</script><img src=x onerror="alert(1)">&\' '
  data.title = attack; data.id = attack; data.slides[0].title = attack; data.slides[0].id = attack
  data.slides[0].sectionLabel = attack; data.slides[0].content.lines = [attack]; data.slides[0].notes.cues = [attack]
  byId(data, 'momentum').content.labels[0] = attack; byId(data, 'roles').content.circle = attack; byId(data, 'roles').content.caption = attack
  const photographed = data.slides.find(slide => slide.image)
  if (photographed) { photographed.image.alt = attack; photographed.image.credit = attack }
  data.source.path = attack; data.source.text = attack + '\n' + data.source.text
  data.source.sha256 = createHash('sha256').update(data.source.text).digest('hex')
  for (const slide of data.slides) for (const range of slide.notes.sourceRanges) { range.start++; range.end++ }
  data.slides[0].notes.sourceRanges.unshift({ start: 1, end: 1 })
  for (const range of data.sourceClassifications) { range.start++; range.end++ }
  const fixture = build(t, data)
  const result = fixture.run()
  assert.equal(result.status, 0, result.stdout + result.stderr)
  const html = readFileSync(fixture.output, 'utf8')
  const notesHTML = readFileSync(fixture.notesOutput, 'utf8')
  assert.doesNotMatch(html, /<img src=x/)
  assert.doesNotMatch(notesHTML, /<img src=x/)
  assert.match(html, /&lt;\/script&gt;&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;&amp;&#39;/)
  const embedded = embeddedDeck(notesHTML)
  assert.equal(embedded.source.text, data.source.text)
  assert.equal(embedded.notes[0].cues[0], attack)
  if (photographed) {
    assert.equal(embedded.slides.find(slide => slide.image).image.alt, attack)
    assert.equal(embedded.slides.find(slide => slide.image).image.credit, attack)
  }
})

test('photographs and Sapiens First artwork embed offline with source credits', t => {
  const data = deck(), photos = data.slides.filter(slide => slide.image)
  assert.ok(photos.length >= 2, 'acceptance deck uses downloaded stock photos')
  assert.ok(data.slides.some(slide => slide.graphic), 'acceptance deck uses website brand artwork')
  const fixture = build(t, data, ['--strict'])
  const result = fixture.run()
  assert.equal(result.status, 0, result.stdout + result.stderr)
  const html = readFileSync(fixture.output, 'utf8')
  const notesHTML = readFileSync(fixture.notesOutput, 'utf8')
  assert.ok(html.includes('data:image/jpeg;base64,'), 'JPEG photo bytes are embedded')
  assert.ok(html.includes('data:image/svg+xml;base64,'), 'website SVG art bytes are embedded')
  assert.doesNotMatch(html, /(?:src|srcset|poster)\s*=\s*["'](?:https?:|\/)/i)
  assert.doesNotMatch(html, /url\(\s*["']?https?:/i)
  for (const { image } of photos) {
    assert.ok(notesHTML.includes(image.sourceUrl), 'original photo page is attributed')
    assert.ok(notesHTML.includes(image.licenseUrl), 'stock license is attributed')
    assert.ok(notesHTML.includes(image.credit), 'photographer is attributed')
  }
})

test('invalid media never replaces an existing usable presentation', t => {
  const original = deck().slides.find(slide => slide.image)?.image
  assert.ok(original, 'photo fixture exists')
  for (const mutation of [
    { path: 'assets/missing-photo.jpg' },
    { path: 'assets/../fonts/dm-sans-400.ttf' },
    { path: '/tmp/external-photo.jpg' },
    { path: 'https://example.org/image.jpg' },
    { alt: '' }, { credit: '' }, { sourceUrl: 'javascript:alert(1)' },
    { licenseUrl: 'http://example.org/license' }, { position: 'arbitrary' },
  ]) {
    const data = deck(); data.slides[0].image = { ...original, ...mutation }
    const fixture = build(t, data)
    writeFileSync(fixture.output, 'existing usable presentation')
    writeFileSync(fixture.notesOutput, 'existing usable notes')
    const result = fixture.run()
    assert.notEqual(result.status, 0, JSON.stringify(mutation))
    assert.equal(readFileSync(fixture.output, 'utf8'), 'existing usable presentation')
    assert.equal(readFileSync(fixture.notesOutput, 'utf8'), 'existing usable notes')
    assert.match(result.stderr, /image|photo|media|asset/i)
  }
})

test('image signatures reject mislabeled nonimage bytes before replacing output', t => {
  const assetRoot = fileURLToPath(new URL('../assets/', import.meta.url))
  const dir = mkdtempSync(join(assetRoot, 'test-invalid-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  writeFileSync(join(dir, 'invalid.jpg'), 'This is not a JPEG image')
  const data = deck(), original = data.slides.find(slide => slide.image).image
  data.slides[0].image = { ...original, path: `assets/${dir.split('/').at(-1)}/invalid.jpg` }
  const fixture = build(t, data)
  writeFileSync(fixture.output, 'existing usable presentation')
  writeFileSync(fixture.notesOutput, 'existing usable notes')
  const result = fixture.run()
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /signature|JPEG|image bytes|image format/i)
  assert.equal(readFileSync(fixture.output, 'utf8'), 'existing usable presentation')
  assert.equal(readFileSync(fixture.notesOutput, 'utf8'), 'existing usable notes')
})

test('reusable steps horizons retain their four-level focus mode; unknown modes fail', t => {
  const data = deck(), slide = byId(data, 'tree-goal')
  slide.layout = 'steps'
  slide.content = { mode: 'horizons', labels: ['Seed cities', 'California', 'Red and blue states', 'Federal policy change'] }
  assert.equal(slide.content.labels.length, 4)
  const valid = check(t, data, '--strict')
  assert.equal(valid.status, 0, valid.stdout + valid.stderr)
  slide.content.mode = 'timeline'
  assert.match(check(t, data).report.errors.join(' '), /mode/i)
  slide.content.mode = 'horizons'; slide.content.labels.pop()
  assert.notEqual(check(t, data).status, 0, 'four nested focus levels are required')
})

test('four section dividers, the participation threshold and Culture have dedicated audience slides', () => {
  const data = deck()
  assert.deepEqual(data.slides.filter(slide => slide.layout === 'divider').map(slide => slide.id),
    ['story-section', 'strategy-section', 'culture-section', 'structure-section'])
  const threshold = byId(data, 'participation-threshold')
  assert.equal(threshold.layout, 'impact')
  assert.equal(threshold.title, '3.5%')
  assert.equal(threshold.content.caption, 'Sustained, organized participation')
  assert.ok(threshold.notes.sourceRanges.some(range => range.start <= 50 && range.end >= 50))
  const culture = byId(data, 'culture-values')
  assert.equal(culture.layout, 'values')
  const sourceValues = data.source.text.split('\n').slice(67, 71).map(line => line.replace(/^[-*] /, ''))
  assert.deepEqual(culture.content.labels, sourceValues)
  assert.deepEqual(culture.notes.sourceRanges, [{ start: 68, end: 71 }])
  const circles = byId(data, 'circles')
  assert.equal(circles.layout, 'circles')
  assert.equal(circles.content.circle, 'Sapiens First Global')
  assert.deepEqual(circles.content.labels, ['Media', 'Advocacy', 'Community', 'Tech'])
  assert.equal(byId(data, 'ownership-principles').layout, 'pair')
})

test('revision two preserves the revised narrative and source fidelity', () => {
  const data = deck()
  assert.equal(byId(data, 'opening').title, 'Revolt for our future')
  assert.deepEqual(byId(data, 'opening').content.lines, ['Sapiens First DNA', '10/09/26'])
  assert.equal(byId(data, 'technology').title, 'Humanity faces a choice')
  assert.deepEqual(byId(data, 'crisis').content.labels, ['Human extinction', 'Threats to democracy', 'Vast inequality'])
  assert.equal(byId(data, 'vision').content.direction, 'horizontal')
  assert.equal(byId(data, 'crisis').content.highlight, 0)
  assert.equal(byId(data, 'crisis').content.highlightStep, true)
  assert.ok(!data.slides.some(slide => ['extinction-focus', 'tree-berkeley', 'tree-full', 'trigger-moments'].includes(slide.id)))
  assert.deepEqual(data.slides.slice(6, 15).map(slide => slide.id), ['strategy-section', 'tree-goal', 'tree-california', 'tree-bay', 'momentum', 'trigger-birmingham', 'trigger-vietnam', 'movement-action-plan', 'participation-threshold'])
  assert.equal(byId(data, 'tree-goal').content.tree.label, 'AI treaty')
  const bay = byId(data, 'tree-bay').content.tree.children[0].children.find(node => node.id === 'bay')
  assert.equal(bay.label, 'Bay Area')
  assert.deepEqual(bay.children.map(node => node.label), ['Berkeley chapter', 'Policy creation', 'Protests', 'Statewide strategy'])
  assert.equal(byId(data, 'trigger-birmingham').layout, 'photo')
  assert.equal(byId(data, 'trigger-vietnam').layout, 'photo')
  assert.ok(byId(data, 'trigger-birmingham').image && byId(data, 'trigger-vietnam').image)
  assert.equal(byId(data, 'movement-action-plan').layout, 'figure')
  assert.equal(byId(data, 'movement-action-plan').image.path, 'assets/movement-action-plan.png')
  assert.deepEqual(byId(data, 'technology').content, {})
  assert.deepEqual(byId(data, 'vision').content.labels, ['Scientific progress', 'Radical democracy', 'Common prosperity'])
  assert.equal(byId(data, 'momentum').title, 'A cycle of engagement')
  assert.equal(data.sourceOrder, 'presentation')
})

test('new layout contracts reject unsupported content and invalid label counts', t => {
  for (const [id, content] of [
    ['story-section', { labels: ['Unexpected'] }],
    ['participation-threshold', { caption: 3.5 }],
    ['culture-values', { labels: ['One', 'Two', 'Three'] }],
    ['ownership-principles', { labels: ['One', 'Two', 'Three'] }],
    ['circles', { circle: '', labels: ['Media', 'Advocacy', 'Community'] }],
  ]) {
    const data = deck(); byId(data, id).content = content
    const result = check(t, data)
    assert.notEqual(result.status, 0, id)
    assert.ok(result.report.errors.some(error => error.includes(id)), `${id}: useful validation error`)
  }
})

test('twenty-four slides require an explicit exception that cannot waive the twenty-minute limit', t => {
  const data = deck(), accepted = check(t, data, '--strict')
  assert.ok(accepted.report.findings.some(finding => /slide count/.test(finding.message) && finding.justified))
  delete data.ruleExceptions
  const ordinary = check(t, data, '--strict')
  assert.notEqual(ordinary.status, 0)
  assert.ok(ordinary.report.findings.some(finding => /slide count/.test(finding.message) && !finding.justified))
  for (const value of ['waive limits', [{ rule: '10-20-30', text: 'deck' }], [{ rule: 'unknown', text: 'deck', reason: 'Requested' }]]) {
    const invalid = deck(); invalid.ruleExceptions = value
    assert.notEqual(check(t, invalid).status, 0)
  }
  const tooLong = deck(); byId(tooLong, 'opening').durationSeconds = 1500
  const timing = check(t, tooLong, '--strict')
  assert.notEqual(timing.status, 0)
  assert.ok(timing.report.findings.some(finding => /duration.*exceeds/.test(finding.message) && !finding.justified))
})

test('invalid and strict-rule-failing inputs leave an existing output untouched', t => {
  const data = deck(); data.slides[0].layout = 'unsupported'
  const fixture = build(t, data, ['--strict'])
  writeFileSync(fixture.output, 'existing usable presentation')
  writeFileSync(fixture.notesOutput, 'existing usable notes')
  const result = fixture.run()
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /opening.*layout/)
  assert.equal(readFileSync(fixture.output, 'utf8'), 'existing usable presentation')
  assert.equal(readFileSync(fixture.notesOutput, 'utf8'), 'existing usable notes')
  data.slides[0].layout = 'statement'; data.slides[0].title = 'one two three four five six seven'
  writeFileSync(fixture.input, JSON.stringify(data))
  assert.notEqual(fixture.run().status, 0)
  assert.equal(readFileSync(fixture.output, 'utf8'), 'existing usable presentation')
  assert.equal(readFileSync(fixture.notesOutput, 'utf8'), 'existing usable notes')
})

test('Pathways to Action is a Structure slide title, not a section', () => {
  const data = deck()
  assert.equal(byId(data, 'next-step').title, 'Pathways to Action')
  assert.equal(byId(data, 'next-step').section, 'structure')
  assert.ok(data.slides.every(slide => slide.section !== 'pathways'))
  assert.deepEqual(byId(data, 'agenda').content.labels, ['Story', 'Strategy', 'Culture', 'Structure'])
})
