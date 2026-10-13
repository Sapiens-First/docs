import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { audienceLines, renderDeck, renderNotes, validateDeck } from '../slides.mjs'
import { renderTree } from '../layouts/strategy-tree.mjs'

const deck = () => JSON.parse(readFileSync(new URL('../decks/10-6-dna.deck.json', import.meta.url)))
const slide = (data, id) => data.slides.find(item => item.id === id)

test('practical descriptions are authored audience text, escaped and validated', () => {
  const data = deck(), culture = slide(data, 'culture-values')
  culture.content.descriptions = ['Act without harming others', 'Care for each other', 'Focus on the mission', 'Help each other lead']
  assert.deepEqual(validateDeck(data).errors, [])
  for (const description of culture.content.descriptions) assert.ok(audienceLines(culture).some(line => line.text === description))
  culture.content.descriptions[0] = '<script>unsafe</script>'
  assert.match(renderDeck(data), /&lt;script&gt;unsafe&lt;\/script&gt;/)
  culture.content.descriptions.pop()
  assert.match(validateDeck(data).errors.join(' '), /descriptions/)
})

test('the full movement reference is embedded only in the presenter companion', () => {
  const data = deck(), movement = slide(data, 'movement-action-plan')
  movement.referenceImage = movement.image ?? movement.referenceImage
  delete movement.image
  delete movement.sectionLabel
  movement.layout = 'movement'
  movement.content = { stages: ['Business as usual', 'Normal channels fail', 'Conditions ripen', 'Take off', 'Activist failure', 'Win public support', 'Success', 'Moving on'], highlight: 3 }
  assert.deepEqual(validateDeck(data).errors, [])
  assert.equal(audienceLines(movement).length, 9)
  const html = renderDeck(data)
  assert.match(html, /movement-map/)
  assert.doesNotMatch(html, /user-supplied-graphic|"referenceImage"/)
  assert.match(renderNotes(data), /class="reference-image"/)
  movement.content.highlight = 8
  assert.match(validateDeck(data).errors.join(' '), /highlight/)
})

test('design changes keep the agreed slides, timings, and speech snapshot', () => {
  const data = deck()
  assert.equal(data.slides.length, 32)
  assert.deepEqual(data.slides.slice(0, 24).map(item => item.durationSeconds), [45,20,10,75,90,120,10,40,30,35,90,55,30,50,30,60,10,90,10,75,30,45,55,90])
  assert.equal(createHash('sha256').update(data.source.text.split('\n').slice(0, 101).join('\n')).digest('hex'), 'a23a8c3855415511f3a635f3975c9aff0890f017383d0f279303bed5bfd7f85e')
  assert.deepEqual(slide(data, 'opening').content.lines, ['Sapiens First: Our DNA', '10/09/26'])
})

test('deeper authored trees keep each generation in its own row', () => {
  const tree = { id: 'one', label: 'Goal', children: [{ id: 'two', label: 'Region', children: [{ id: 'three', label: 'City', children: [{ id: 'four', label: 'Chapter', children: [{ id: 'five', label: 'Team' }] }] }] }] }
  const html = renderTree({ tree, reveal: ['one', 'two', 'three', 'four', 'five'] }, 0)
  const boxes = [...html.matchAll(/<rect x="[^"]+" y="([^"]+)" width="[^"]+" height="([^"]+)"/g)].map(match => ({ top: Number(match[1]), height: Number(match[2]) }))
  assert.equal(boxes.length, 5)
  for (let i = 1; i < boxes.length; i++) assert.ok(boxes[i].top > boxes[i - 1].top + boxes[i - 1].height)
})
