import test from 'node:test'
import assert from 'node:assert/strict'
import { generateDeck } from '../generate.mjs'
import { renderDeck, validateDeck } from '../slides.mjs'

const page = 'docs/leadership/index.md'

test('generation is deterministic', () => {
  assert.equal(JSON.stringify(generateDeck(page)), JSON.stringify(generateDeck(page)))
})

test('generated deck is valid, fully covered and labelled generated', () => {
  const deck = generateDeck(page)
  const report = validateDeck(deck)
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.coverage.uncovered, [])
  assert.equal(deck.origin, 'generated')
  assert.deepEqual(deck.covers, ['leadership'])
  assert.equal(deck.slides[0].layout, 'statement')
  assert.equal(deck.slides.filter(slide => slide.layout === 'divider').length, 2)
})

test('four list items become steps and every slide carries the generated footer', () => {
  const deck = generateDeck(page)
  assert.ok(deck.slides.some(slide => slide.layout === 'steps' && slide.content.labels.length === 4))
  const html = renderDeck(deck)
  assert.equal((html.match(/Auto-generated from the handbook text<\/span>/g) ?? []).length, deck.slides.length)
})

test('pages without a slides mapping are not generated', () => {
  assert.throws(() => generateDeck('docs/leadership/people.md'), /no slides: mapping/)
})
