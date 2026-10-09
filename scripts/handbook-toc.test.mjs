import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { getHandbookChapters, getHandbookItems, getSidebarGroups, validateHandbookToc } from './handbook-toc.mjs'

const first = { id: 'intro', number: '0', title: '0 Introduction', path: 'introduction/index.md', section: 'Introduction' }
const second = { id: 'welcome', number: '0.1', title: '0.1 Welcome', path: 'introduction/welcome.md', section: 'Introduction' }

function fixture(t, entries = [first, second]) {
  const root = mkdtempSync(join(tmpdir(), 'handbook-toc-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  for (const entry of entries) {
    const path = join(root, entry.path)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, `---\ntitle: "${entry.title}"\nsection: ${entry.section}\nstatus: draft\nhandbook_id: ${entry.id}\nhandbook_number: "${entry.number}"\n---\n\n# ${entry.title}\n`)
  }
  return root
}

test('current handbook registry matches all numbered pages', () => {
  assert.deepEqual(validateHandbookToc(), [])
  assert.equal(getHandbookItems().length, 75)
})

test('navigation follows registry order and handles landing paths', () => {
  assert.deepEqual(getHandbookItems([second, first]), [
    { text: second.title, link: '/introduction/welcome' },
    { text: first.title, link: '/introduction/' },
  ])
})

test('complete fixture validates and omitted numbered pages fail', t => {
  const root = fixture(t)
  assert.deepEqual(validateHandbookToc(root, [first, second]), [])
  assert.match(validateHandbookToc(root, [first]).join('\n'), /Numbered page absent from TOC: introduction\/welcome.md/)
})

test('duplicate identities, numbers and paths fail', t => {
  const errors = validateHandbookToc(fixture(t), [first, first, second]).join('\n')
  for (const field of ['id', 'number', 'path']) assert.match(errors, new RegExp(`Duplicate TOC ${field}:`))
})

test('missing file and required fields fail', t => {
  const errors = validateHandbookToc(fixture(t), [first, { ...second, path: 'missing.md', section: '' }]).join('\n')
  assert.match(errors, /TOC page missing: missing.md/)
  assert.match(errors, /TOC entry missing section/)
})

test('metadata and heading mismatches fail', t => {
  const root = fixture(t)
  const changed = { ...second, id: 'wrong', number: '7', title: '7 Wrong', section: 'DNA' }
  const errors = validateHandbookToc(root, [first, changed]).join('\n')
  for (const field of ['id', 'number', 'title', 'section']) assert.match(errors, new RegExp(`TOC ${field} differs`))
  assert.match(errors, /TOC title differs from H1/)
})

test('navigation reads status and construction notes from the page on every call', t => {
  const root = fixture(t)
  const path = join(root, second.path)
  assert.equal(getHandbookChapters([first, second], root)[0].pages[0].statusEmoji, '📝')
  writeFileSync(path, `---\ntitle: "${second.title}"\nsection: Introduction\nstatus: planned\nconstruction_note: "Outline awaiting review <&>"\nhandbook_id: ${second.id}\nhandbook_number: "0.1"\n---\n# ${second.title}\n`)
  const page = getHandbookChapters([first, second], root)[0].pages[0]
  assert.equal(page.status, 'planned')
  assert.equal(page.statusEmoji, '⬜')
  assert.equal(page.constructionNote, 'Outline awaiting review <&>')
  const item = getSidebarGroups([first, second], root)[0].items[0]
  assert.match(item.text, /⬜/)
  assert.match(item.text, /Outline awaiting review &lt;&amp;&gt;/)
  assert.equal(item.plainText, second.title)
  assert.deepEqual(validateHandbookToc(root, [first, second]), [])
})

test('TOC status cannot contradict page frontmatter', t => {
  const root = fixture(t)
  assert.match(validateHandbookToc(root, [first, { ...second, status: 'adopted' }]).join('\n'), /TOC status differs from status/)
})

test('heading drift fails even when frontmatter matches', t => {
  const root = fixture(t, [first])
  const path = join(root, first.path)
  writeFileSync(path, `---\ntitle: "${first.title}"\nsection: ${first.section}\nhandbook_id: ${first.id}\nhandbook_number: "${first.number}"\n---\n# Wrong\n`)
  assert.match(validateHandbookToc(root, [first]).join('\n'), /TOC title differs from H1/)
})

test('chapters carry reader-facing labels in registry order', () => {
  const chapters = getHandbookChapters()
  assert.deepEqual(chapters.slice(0, 6).map(c => [c.label, c.number, c.link]), [
    ['Start here', '0', '/introduction/'],
    ['DNA', '1', '/dna/'],
    ['Go deeper', '2', '/go-deeper/'],
    ['Lead', '3', '/leadership/'],
    ['Train others', '4', '/train-others/'],
    ['Supplemental', '5', '/supplemental/'],
  ])
  assert.ok(chapters.slice(0, 6).every(c => !c.appendix) && chapters.slice(6).every(c => c.appendix))
  assert.deepEqual(chapters.slice(6).map(c => [c.label, c.number]), [
    ['Reference', 'A'], ['Further reading', 'B'], ['Citations', 'C'], ['Glossary', 'D'], ['Staff', 'E'], ['Slides', 'F'],
  ])
  // every registry page appears exactly once, either as a landing or a page
  const linked = chapters.flatMap(c => [c.link, ...c.pages.map(p => p.link)])
  assert.equal(new Set(linked).size, getHandbookItems().length)
})

test('three-part numbers are grouped under their two-part prefix', () => {
  const root = { id: 'ref', number: 'IV', title: 'IV Ref', path: 'ref/index.md', section: 'Ref' }
  const pages = ['IV.1.1', 'IV.1.2', 'IV.2.10'].map(number => ({ id: number, number, title: `${number} Page ${number}`, path: `ref/${number}.md`, section: 'Ref' }))
  const [chapter] = getHandbookChapters([root, ...pages])
  assert.equal(chapter.appendix, true)
  assert.deepEqual(chapter.groups.map(g => [g.number, g.pages.map(p => p.shortNumber)]), [['IV.1', ['.1', '.2']], ['IV.2', ['.10']]])
  const [group] = getSidebarGroups([root, ...pages])
  assert.equal(group.plainText, 'IV. Ref')
  assert.equal(group.link, '/ref/')
  assert.deepEqual(group.items.map(i => i.plainText), ['IV.1 IV.1', 'IV.2 IV.2'])
  assert.equal(group.items[0].items.length, 2)
})

test('sidebar headings link to landing pages and never repeat them', () => {
  const groups = getSidebarGroups()
  assert.deepEqual(groups.slice(0, 4).map(g => [g.plainText, g.link]), [
    ['0. Start here', '/introduction/'],
    ['1. DNA', '/dna/'],
    ['2. Go deeper', '/go-deeper/'],
    ['3. Lead', '/leadership/'],
  ])
  assert.ok(groups.every(g => !g.items?.some(i => i.link === g.link)))
  assert.equal(groups.at(-1).link, '/appendices/staff/')
  assert.equal(groups.at(-1).items[0].link, '/appendices/staff/beliefs-about-staff')
  const glossary = groups.find(g => g.link === '/appendices/glossary')
  assert.deepEqual(glossary.items, [])
  assert.equal(glossary.collapsed, undefined)
})
