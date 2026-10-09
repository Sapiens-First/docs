#!/usr/bin/env node
/**
 * Builds every publishable deck into docs/public/slides/<slug>/ so VitePress
 * copies it to the site (/slides/<slug>/ and /slides/<slug>/index.notes.html).
 * Handcrafted decks publish only once approved; set SLIDES_PREVIEW=1 to
 * include unapproved ones for local review.
 */
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadDeckRegistry, publishedDecks } from '../slides/registry.mjs'
import { generateDeck } from '../slides/generate.mjs'
import { validateDeck, writeDeckFiles } from '../slides/slides.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUTPUT = join(ROOT, 'docs/public/slides')

/** Pages that name a deck: [{ path, slug }]. */
function mappedPages(dir = join(ROOT, 'docs')) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '.vitepress' || entry.name === 'public' ? [] : mappedPages(path)
    const slug = entry.name.endsWith('.md') && readFileSync(path, 'utf8').match(/^---\r?\n[\s\S]*?\r?\nslides:\s*(\S+)\s*\r?\n[\s\S]*?\r?\n---/)?.[1]
    return slug ? [{ path, slug }] : []
  })
}

// Regenerate a module's deck from its page text, unless a handcrafted deck
// exists for that module (approved or not): those are never overwritten.
const handcrafted = new Set(loadDeckRegistry().filter(entry => entry.origin === 'handcrafted').map(entry => entry.slug))
for (const { path, slug } of mappedPages()) {
  if (handcrafted.has(slug)) continue
  const deck = generateDeck(path)
  const destination = join(ROOT, 'slides/decks', `${slug}.deck.json`)
  const contents = `${JSON.stringify(deck, null, 2)}\n`
  if (!existsSync(destination) || readFileSync(destination, 'utf8') !== contents) {
    writeFileSync(destination, contents)
    console.log(`Regenerated slides/decks/${slug}.deck.json`)
  }
}

const registry = loadDeckRegistry()
const invalid = registry.flatMap(entry => entry.errors)
if (invalid.length) {
  console.error(invalid.join('\n'))
  process.exit(1)
}
rmSync(OUTPUT, { recursive: true, force: true })
const decks = publishedDecks(registry, { preview: process.env.SLIDES_PREVIEW === '1' })
for (const entry of registry.filter(entry => !decks.includes(entry))) console.log(`Skipped ${entry.slug}: awaiting approval`)
for (const entry of decks) {
  const report = validateDeck(entry.deck)
  const unresolved = report.findings.filter(finding => !finding.justified)
  if (entry.origin === 'generated' && !report.errors.length && unresolved.length) {
    console.log(`Withheld ${entry.slug}: ${unresolved.length} presentation findings need review (node slides/slides.mjs validate slides/decks/${entry.slug}.deck.json --strict)`)
    continue
  }
  if (report.errors.length || unresolved.length) {
    console.error(`${entry.slug}: ${[...report.errors, ...unresolved.map(f => f.message)].join('; ')}`)
    process.exit(1)
  }
  const folder = join(OUTPUT, entry.slug)
  writeDeckFiles(entry.deck, join(folder, 'index.html'), join(folder, 'index.notes.html'))
  console.log(`Built slides/${entry.slug}/`)
}
