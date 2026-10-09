import test from 'node:test'
import assert from 'node:assert/strict'
import { loadDeckRegistry, validateDeckMetadata, validateSlideMapping, isPublishable } from '../registry.mjs'

const meta = { slug: 'demo', origin: 'handcrafted', approved: false, covers: ['demo-page'], lastUpdated: '2026-10-09' }
const entry = (over = {}) => ({ file: 'demo.deck.json', slug: 'demo', covers: ['demo-page'], errors: [], ...over })
const page = (over = {}) => ({ path: 'docs/demo.md', id: 'demo-page', slides: 'demo', ...over })

test('every shipped deck has valid publication metadata', () => {
  const registry = loadDeckRegistry()
  assert.ok(registry.length >= 1)
  for (const deck of registry) assert.deepEqual(deck.errors, [])
})

test('metadata errors name each bad field', () => {
  assert.deepEqual(validateDeckMetadata(meta), [])
  const bad = validateDeckMetadata({ slug: 'Bad Slug', origin: 'ai', approved: 'yes', covers: [], lastUpdated: 'today' })
  assert.equal(bad.length, 5)
})

test('only approved handcrafted decks and generated decks publish', () => {
  assert.equal(isPublishable({ ...meta }), false)
  assert.equal(isPublishable({ ...meta, approved: true }), true)
  assert.equal(isPublishable({ ...meta, origin: 'generated' }), true)
})

test('page and deck must agree in both directions', () => {
  assert.deepEqual(validateSlideMapping([page()], [entry()]), [])
  assert.match(validateSlideMapping([page({ slides: 'missing' })], [entry()]).join('\n'), /no deck/)
  assert.match(validateSlideMapping([page({ id: 'other' }), page({ path: 'docs/x.md' })], [entry()]).join('\n'), /does not list other/)
  assert.match(validateSlideMapping([page({ slides: undefined })], [entry()]).join('\n'), /does not declare slides: demo/)
  assert.match(validateSlideMapping([], [entry()]).join('\n'), /unknown handbook page/)
})
