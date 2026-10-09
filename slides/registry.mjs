import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SLIDES_ROOT = dirname(fileURLToPath(import.meta.url))
export const ORIGINS = {
  handcrafted: { emoji: '✋', label: 'Handcrafted' },
  generated: { emoji: '🤖', label: 'Auto-generated' },
}

const SLUG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Errors in a deck's publication metadata; empty when it is well formed. */
export function validateDeckMetadata(deck) {
  const errors = []
  if (typeof deck.slug !== 'string' || !SLUG.test(deck.slug)) errors.push('slug must be lowercase kebab-case text')
  if (!Object.hasOwn(ORIGINS, deck.origin)) errors.push(`origin must be one of ${Object.keys(ORIGINS).join(', ')}`)
  if (typeof deck.approved !== 'boolean') errors.push('approved must be true or false')
  if (!Array.isArray(deck.covers) || !deck.covers.length || !deck.covers.every(id => typeof id === 'string' && SLUG.test(id))) errors.push('covers must list one or more handbook page IDs')
  if (typeof deck.lastUpdated !== 'string' || !DATE.test(deck.lastUpdated)) errors.push('lastUpdated must be a YYYY-MM-DD date')
  return errors
}

/** Handcrafted decks wait for approval; generated decks always publish. */
export const isPublishable = deck => deck.origin === 'generated' || deck.approved === true

/** Every deck in `decks/` with its publication metadata, sorted by slug. */
export function loadDeckRegistry(root = SLIDES_ROOT) {
  const names = existsSync(join(root, 'decks')) ? readdirSync(join(root, 'decks')) : []
  return names.filter(name => name.endsWith('.deck.json')).map(name => {
    const path = join(root, 'decks', name)
    const deck = JSON.parse(readFileSync(path, 'utf8'))
    return {
      file: name,
      path,
      deck,
      slug: deck.slug,
      id: deck.id,
      title: deck.title,
      origin: deck.origin,
      approved: deck.approved,
      covers: deck.covers,
      lastUpdated: deck.lastUpdated,
      errors: validateDeckMetadata(deck).map(message => `${name}: ${message}`),
    }
  }).sort((a, b) => String(a.slug).localeCompare(String(b.slug)))
}

/**
 * Cross-checks decks against the `slides:` frontmatter of handbook pages.
 * `pages` is [{ path, id, slides }] for every numbered page. The deck's
 * `covers` list and the pages' `slides:` values must name each other.
 */
export function validateSlideMapping(pages, registry) {
  const errors = registry.flatMap(entry => entry.errors)
  const bySlug = new Map()
  for (const entry of registry) {
    if (bySlug.has(entry.slug)) errors.push(`${entry.file}: duplicate deck slug "${entry.slug}"`)
    bySlug.set(entry.slug, entry)
  }
  const ids = new Map(pages.map(page => [page.id, page]))
  for (const page of pages.filter(page => page.slides)) {
    const entry = bySlug.get(page.slides)
    if (!entry) errors.push(`${page.path}: slides "${page.slides}" has no deck in slides/decks/`)
    else if (!entry.covers?.includes(page.id)) errors.push(`${page.path}: deck "${entry.slug}" does not list ${page.id} in covers`)
  }
  for (const entry of registry) {
    for (const id of entry.covers ?? []) {
      const page = ids.get(id)
      if (!page) errors.push(`${entry.file}: covers unknown handbook page "${id}"`)
      else if (page.slides !== entry.slug) errors.push(`${page.path}: deck "${entry.slug}" covers ${id}, but the page does not declare slides: ${entry.slug}`)
    }
  }
  return errors
}

/** Decks the site publishes. `preview` also includes handcrafted decks still awaiting approval. */
export const publishedDecks = (registry, { preview = false } = {}) => registry.filter(entry => !entry.errors.length && (preview || isPublishable(entry)))
