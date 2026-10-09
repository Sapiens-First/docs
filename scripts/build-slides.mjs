#!/usr/bin/env node
/**
 * Builds every publishable deck into docs/public/slides/<slug>/ so VitePress
 * copies it to the site (/slides/<slug>/ and /slides/<slug>/index.notes.html).
 * Handcrafted decks publish only once approved; set SLIDES_PREVIEW=1 to
 * include unapproved ones for local review.
 */
import { rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadDeckRegistry, publishedDecks } from '../slides/registry.mjs'
import { validateDeck, writeDeckFiles } from '../slides/slides.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUTPUT = join(ROOT, 'docs/public/slides')

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
  if (report.errors.length || unresolved.length) {
    console.error(`${entry.slug}: ${[...report.errors, ...unresolved.map(f => f.message)].join('; ')}`)
    process.exit(1)
  }
  const folder = join(OUTPUT, entry.slug)
  writeDeckFiles(entry.deck, join(folder, 'index.html'), join(folder, 'index.notes.html'))
  console.log(`Built slides/${entry.slug}/`)
}
