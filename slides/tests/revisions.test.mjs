import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { audienceLines, validateDeck, renderDeck, renderNotes } from '../slides.mjs'

const image = () => ({ path: 'assets/civic-park.jpg', alt: 'People in a park', credit: 'Photographer <One>', sourceUrl: 'https://example.org/photo', licenseUrl: 'https://example.org/license' })
function deck(layout, content, extra = {}) {
  const source = 'A source passage.'
  return { schemaVersion: 1, id: 'revisions', title: 'Revision fixtures', targetDurationSeconds: 60,
    source: { path: 'slides/tests/absent-revision-source.txt', text: source, sha256: createHash('sha256').update(source).digest('hex') },
    slides: [{ id: 'revision', title: 'A better future', layout, content, purpose: 'explain', role: 'content', durationSeconds: 60, notes: { sourceRanges: [{ start: 1, end: 1 }] }, ...extra }] }
}

test('choice, pyramid and montage enforce their authored content and image contracts', () => {
  for (const data of [deck('choice', { labels: ['One road', 'Another road'] }, { image: image() }), deck('pyramid', { labels: ['Policy', 'California', 'Three states', 'National movement', 'Next steps'] }), deck('montage', {}, { images: [image(), image()] })]) assert.deepEqual(validateDeck(data).errors, [])
  for (const data of [deck('choice', { labels: ['One'] }), deck('pyramid', { labels: ['One', 'Two'] }), deck('montage', { labels: ['Unexpected'] }, { images: [image(), image()] }), deck('montage', {}, { images: [image()] }), deck('statement', { lines: [] }, { images: [image(), image()] }), deck('montage', {}, { image: image(), images: [image(), image()] })]) assert.ok(validateDeck(data).errors.length, JSON.stringify(data.slides[0]))
  const data = deck('pyramid', { labels: ['Policy', 'California', 'Three states', 'National movement', 'Next steps'] }, { sectionLabel: 'Horizons of focus' })
  assert.equal(audienceLines(data.slides[0]).length, 7)
  assert.ok(validateDeck(data).findings.some(finding => /7 authored lines/.test(finding.message)))
})

test('montage embeds both original photos, escapes their text, and credits both', () => {
  const second = { ...image(), credit: 'Photographer Two', sourceUrl: 'https://example.org/second', alt: '<script>Second</script>' }
  const data = deck('montage', {}, { images: [image(), second] })
  const html = renderDeck(data), notes = renderNotes(data)
  assert.equal((html.match(/class="slide-photo montage-photo"/g) ?? []).length, 2)
  assert.match(html, /alt="&lt;script&gt;Second&lt;\/script&gt;"/)
  for (const photo of data.slides[0].images) {
    assert.ok(notes.includes(photo.sourceUrl))
    assert.ok(notes.includes(photo.licenseUrl))
  }
  assert.match(notes, /Photographer &lt;One&gt;/)
  assert.match(notes, /Photographer Two/)
  for (const mutation of [{ path: 'assets/../civic-park.jpg' }, { sourceUrl: 'javascript:alert(1)' }, { licenseUrl: 'http://example.org/license' }, { alt: '' }, { position: 'left' }, { treatment: 'background' }]) {
    const invalid = structuredClone(data); Object.assign(invalid.slides[0].images[1], mutation)
    assert.ok(validateDeck(invalid).errors.length, JSON.stringify(mutation))
  }
})

test('horizontal triads remain authored labels and reject unknown directions', () => {
  const data = deck('triad', { labels: ['Flourish', 'Democracy', 'Abundance'], direction: 'horizontal' })
  assert.deepEqual(validateDeck(data).errors, [])
  assert.match(renderDeck(data), /class="triad horizontal"/)
  assert.deepEqual(audienceLines(data.slides[0]).map(line => line.text), ['A better future', 'Flourish', 'Democracy', 'Abundance'])
  data.slides[0].content.direction = 'diagonal'
  assert.match(validateDeck(data).errors.join(' '), /direction/)
})

test('statement treatments keep subtitle/date as plain text and restrict treatment values', () => {
  const data = deck('statement', { lines: ['Sapiens First DNA', 'Last updated October 9, 2026'] }, { image: { ...image(), treatment: 'background' } })
  assert.deepEqual(validateDeck(data).errors, [])
  const html = renderDeck(data)
  assert.match(html, /data-image-treatment="background"/)
  assert.match(html, /class="statement-lines statement-meta"/)
  assert.match(html, /class="photo-overlay" aria-hidden="true"/)
  data.slides[0].image.treatment = 'artistic'
  assert.deepEqual(validateDeck(data).errors, [])
  assert.match(renderDeck(data), /data-image-treatment="artistic"/)
  data.slides[0].image.treatment = 'invented'
  assert.match(validateDeck(data).errors.join(' '), /treatment/)
  data.slides[0].image.treatment = 'background'; data.slides[0].layout = 'impact'; data.slides[0].content = {}
  assert.ok(validateDeck(data).errors.length, 'background treatment belongs to statements')
})

test('choice and pyramid use trusted SVG and preserve escaped audience labels', () => {
  const choice = deck('choice', { labels: ['Crisis <today>', 'Hope & action'] }, { image: image() })
  const choiceHTML = renderDeck(choice)
  assert.match(choiceHTML, /class="diagram choice-map"/)
  assert.doesNotMatch(choiceHTML, /class="road"/)
  assert.match(choiceHTML, /Crisis &lt;today&gt;/)
  const pyramid = deck('pyramid', { labels: ['Federal policy: AI treaty', 'Phase 1: California', 'New York, Florida, Texas', 'Phase 3: National movement', 'Steps to success — TBD'] }, { image: image() })
  const html = renderDeck(pyramid)
  assert.match(html, /class="diagram pyramid-map"/)
  assert.equal((html.match(/class="pyramid-tier"/g) ?? []).length, 5)
  assert.ok(html.includes('Federal policy: AI treaty'))
  assert.equal(audienceLines(pyramid.slides[0]).length, 6)
})

test('presentation source order permits requested reordering while retaining source coverage', () => {
  const data = deck('statement', { lines: [] })
  data.source.text = 'First original passage.\nSecond original passage.'
  data.source.sha256 = createHash('sha256').update(data.source.text).digest('hex')
  const first = data.slides[0]
  first.notes.sourceRanges = [{ start: 2, end: 2 }]
  data.slides.push({ ...structuredClone(first), id: 'earlier-passage', notes: { sourceRanges: [{ start: 1, end: 1 }] } })
  data.targetDurationSeconds = 120
  assert.match(validateDeck(data).errors.join(' '), /original order/)
  data.sourceOrder = 'presentation'
  const report = validateDeck(data)
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.coverage.uncovered, [])
  assert.deepEqual(report.notes.map(note => note.passages), [['Second original passage.'], ['First original passage.']])
  data.slides[1].notes.sourceRanges = []
  assert.match(validateDeck(data).errors.join(' '), /Uncovered source lines: 1/)
  data.sourceOrder = 'invented'
  assert.match(validateDeck(data).errors.join(' '), /sourceOrder/)
})

test('opening statement renders a badge and short date without restyling other statements', () => {
  const data = deck('statement', { lines: ['Sapiens First DNA', '10/09/26'] }, { id: 'opening', title: 'Revolt for our future' })
  assert.match(renderDeck(data), /<li class="audience-text statement-badge">Sapiens First DNA<\/li>/)
  assert.match(renderDeck(data), /<li class="audience-text statement-date">10\/09\/26<\/li>/)
  data.slides[0].id = 'another-statement'
  assert.doesNotMatch(renderDeck(data), /<li class="audience-text statement-badge">/)
})

test('agenda lists three to six escaped audience labels in order', () => {
  const data = deck('agenda', { labels: ['Story', 'Strategy', 'Culture', 'Structure', 'Pathways to Action'] })
  assert.deepEqual(validateDeck(data).errors, [])
  assert.match(renderDeck(data), /<ol class="agenda">/)
  assert.deepEqual(audienceLines(data.slides[0]).slice(1).map(line => line.text), data.slides[0].content.labels)
  for (const labels of [['One'], Array(7).fill('Many'), ['One', '', 'Three']]) assert.ok(validateDeck(deck('agenda', { labels })).errors.length)
})

test('footer progress marks each active section and its proportional progress', () => {
  const data = deck('statement', { lines: [] }, { section: 'story' })
  data.slides.push({ ...data.slides[0], id: 'second', section: 'story' }, { ...data.slides[0], id: 'third', section: 'strategy' }, { ...data.slides[0], id: 'unsectioned', section: undefined })
  const html = renderDeck(data)
  assert.equal((html.match(/class="progress-seg/g) ?? []).length, 6)
  assert.equal((html.match(/<div class="progress-seg"[^>]*aria-current="step"/g) ?? []).length, 3)
  assert.match(html, /data-section="story"[^>]*aria-current="step"[^>]*style="--fill:50%"/)
  assert.match(html, /data-section="story"[^>]*aria-current="step"[^>]*style="--fill:100%"/)
  data.slides[0].section = 'unknown'
  assert.match(validateDeck(data).errors.join(' '), /section/)
})

test('topical divider graphics are trusted inline SVG with explicit motif identifiers', () => {
  for (const graphic of ['book', 'route', 'hands', 'nested', 'signpost']) {
    const data = deck('divider', {}, { graphic })
    assert.deepEqual(validateDeck(data).errors, [])
    assert.match(renderDeck(data), new RegExp(`<svg[^>]*data-graphic="${graphic}"[^>]*aria-hidden="true"`))
  }
  assert.ok(validateDeck(deck('divider', {}, { graphic: 'unknown' })).errors.length)
  assert.ok(validateDeck(deck('statement', { lines: [] }, { graphic: 'book' })).errors.length)
})

test('triad highlight lights exactly one item and validates the label index', () => {
  const data = deck('triad', { labels: ['Human extinction', 'Threats to democracy', 'Vast inequality'], highlight: 0 })
  assert.deepEqual(validateDeck(data).errors, [])
  assert.match(renderDeck(data), /<li class="is-lit"/)
  assert.equal((renderDeck(data).match(/<li class="is-dim"/g) ?? []).length, 2)
  for (const highlight of [-1, 3, 1.5, '0']) assert.ok(validateDeck(deck('triad', { labels: ['A', 'B', 'C'], highlight })).errors.length)
})

const tree = () => ({ id: 'treaty', label: 'AI treaty', children: [{ id: 'ca', label: 'California', children: [{ id: 'berkeley', label: 'Berkeley', current: true }] }, { id: 'states', label: 'NY, FL, TX' }] })
test('tree validates unique ids, ancestor closure, focus and a single current node', () => {
  assert.deepEqual(validateDeck(deck('tree', { tree: tree(), reveal: ['treaty', 'ca'], focus: 'ca' })).errors, [])
  for (const bad of [{ reveal: ['ca'] }, { reveal: ['treaty', 'nope'] }, { reveal: ['treaty'], focus: 'berkeley' }, { reveal: ['treaty', 'treaty'] }, { tree: { id: 'treaty', label: '' } }, { tree: { id: 'treaty', label: 'Root', children: [{ id: 'treaty', label: 'Duplicate' }] } }, { tree: { ...tree(), current: true } }, { tree: { id: 'treaty', label: 'Root', children: 'invalid' } }]) {
    assert.ok(validateDeck(deck('tree', { tree: tree(), reveal: ['treaty'], ...bad })).errors.length, JSON.stringify(bad))
  }
})
test('tree renders revealed nodes only, marks current work, and counts visible audience copy', () => {
  const data = deck('tree', { tree: tree(), reveal: ['treaty', 'ca', 'berkeley', 'states'], focus: 'ca' })
  const html = renderDeck(data)
  assert.equal((html.match(/class="tree-node/g) ?? []).length, 4)
  assert.match(html, /data-node="berkeley"[^>]*data-current="true"/)
  assert.match(html, /data-node="states"[^>]*data-dim="true"/)
  assert.match(html, /You are here/)
  assert.deepEqual(audienceLines(data.slides[0]).slice(1).map(line => line.text), ['AI treaty', 'California', 'Berkeley', 'NY, FL, TX'])
  data.slides[0].content.reveal = ['treaty', 'states']
  delete data.slides[0].content.focus
  assert.doesNotMatch(renderDeck(data), /data-node="berkeley"/)
  data.slides[0].content.tree.label = '<script>Goal</script>'
  assert.match(renderDeck(data), /&lt;script&gt;Goal&lt;\/script&gt;/)
})

test('local crossroads SVG embeds offline and preserves source credit in notes', () => {
  const data = deck('choice', { labels: ['Crisis', 'Hope'] }, { image: { ...image(), path: 'assets/crossroads.svg' } })
  assert.deepEqual(validateDeck(data).errors, [])
  assert.match(renderDeck(data), /src="data:image\/svg\+xml;base64,/)
  assert.match(renderNotes(data), /Photographer &lt;One&gt;/)
})

test('revision two deck has the complete requested sequence and exact original source', () => {
  const data = JSON.parse(readFileSync(new URL('../decks/10-6-dna.deck.json', import.meta.url)))
  assert.deepEqual(data.slides.map(slide => slide.id), ['opening', 'agenda', 'story-section', 'technology', 'vision', 'crisis', 'strategy-section', 'tree-goal', 'tree-california', 'tree-bay', 'momentum', 'trigger-birmingham', 'trigger-vietnam', 'movement-action-plan', 'participation-threshold', 'chapter-question', 'culture-section', 'culture-values', 'structure-section', 'participation', 'ownership-principles', 'circles', 'roles', 'next-step'])
  const report = validateDeck(data)
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.coverage.uncovered, [])
  assert.deepEqual(report.coverage.duplicated, [])
  assert.ok(report.findings.every(finding => finding.justified), JSON.stringify(report.findings))
  assert.equal(data.source.sha256, 'a23a8c3855415511f3a635f3975c9aff0890f017383d0f279303bed5bfd7f85e')
  assert.equal(data.slides[3].image.path, 'assets/crossroads.svg')
  const trees = data.slides.filter(slide => slide.layout === 'tree')
  assert.equal(trees.length, 3)
  assert.ok(trees.every(slide => JSON.stringify(slide.content.tree) === JSON.stringify(trees[0].content.tree)))
})

test('triad highlightStep requires a highlight and is only true', () => {
  const labels = ['A', 'B', 'C']
  assert.deepEqual(validateDeck(deck('triad', { labels, highlight: 0, highlightStep: true })).errors, [])
  for (const content of [{ labels, highlightStep: true }, { labels, highlight: 0, highlightStep: false }, { labels, highlight: 0, highlightStep: 'yes' }]) {
    assert.match(validateDeck(deck('triad', content)).errors.join(' '), /highlightStep/, JSON.stringify(content))
  }
  assert.deepEqual(validateDeck(deck('choice', { highlightStep: true }, { image: image() })).errors.length > 0, true, 'highlightStep belongs to triads')
})

test('a stepped triad exposes one step; unstepped slides expose none', () => {
  const stepped = renderDeck(deck('triad', { labels: ['A', 'B', 'C'], highlight: 0, highlightStep: true }))
  assert.match(stepped, /data-steps="1"/)
  assert.match(stepped, /class="triad stepped"/)
  assert.doesNotMatch(renderDeck(deck('triad', { labels: ['A', 'B', 'C'], highlight: 0 })), /data-steps=/)
})

test('photo and figure layouts require exactly one image and accept only a caption', () => {
  for (const layout of ['photo', 'figure']) {
    assert.deepEqual(validateDeck(deck(layout, { caption: 'A caption' }, { image: image() })).errors, [], layout)
    assert.deepEqual(validateDeck(deck(layout, {}, { image: image() })).errors, [], layout)
    assert.ok(validateDeck(deck(layout, { caption: 'A caption' })).errors.length, `${layout} without an image`)
    assert.ok(validateDeck(deck(layout, {}, { images: [image(), image()] })).errors.length, `${layout} with two images`)
    assert.ok(validateDeck(deck(layout, { labels: ['Unexpected'] }, { image: image() })).errors.length, `${layout} with labels`)
    const html = renderDeck(deck(layout, { caption: 'A caption' }, { image: image() }))
    assert.match(html, new RegExp(`data-layout="${layout}"`))
    assert.match(html, /class="slide-photo/)
  }
})

test('choice accepts no labels and still renders its image', () => {
  const data = deck('choice', {}, { image: image() })
  assert.deepEqual(validateDeck(data).errors, [])
  const html = renderDeck(data)
  assert.match(html, /data-layout="choice"/)
  assert.match(html, /class="slide-photo/)
  assert.deepEqual(audienceLines(data.slides[0]).map(line => line.text), ['A better future'])
})

test('sunrise and sage tones are valid; unknown tones are rejected', () => {
  for (const tone of ['sunrise', 'sage', 'dark']) {
    const data = deck('statement', { lines: [] }, { tone })
    assert.deepEqual(validateDeck(data).errors, [], tone)
    assert.match(renderDeck(data), new RegExp(`data-tone="${tone}"`))
  }
  assert.match(validateDeck(deck('statement', { lines: [] }, { tone: 'neon' })).errors.join(' '), /tone/)
})

test('both built pages carry an inline favicon', () => {
  const data = deck('statement', { lines: [] })
  for (const page of [renderDeck(data), renderNotes(data)]) {
    assert.match(page, /<link rel="icon" type="image\/png"[^>]*href="data:image\/png;base64,/)
    assert.doesNotMatch(page, /<link[^>]*rel="icon"[^>]*href="(?!data:)/)
  }
})
