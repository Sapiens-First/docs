import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { validateRedirects, redirectFiles, loadRedirects } from './handbook-redirects.mjs'

const DOCS = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs')
const docsPages = (dir = DOCS) => readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.name.startsWith('.') || e.name === 'public' ? [] : e.isDirectory() ? docsPages(join(dir, e.name)) : e.name.endsWith('.md') ? [relative(DOCS, join(dir, e.name)).split('\\').join('/')] : [])

const pages = ['appendices/glossary.md', 'retired/index.md', 'introduction/index.md']

test('redirect map file loads as an object', () => {
  assert.equal(typeof loadRedirects(), 'object')
})

test('repository redirect map covers the retired legacy routes and validates', () => {
  const map = loadRedirects()
  assert.equal(Object.keys(map).length, 43)
  for (const route of ['/guide/', '/find', '/learning/metrics', '/practices/organizing-conversations']) assert.ok(map[route], route)
  assert.equal(map['/staff/'], '/appendices/staff/')
  for (const page of ['beliefs-about-staff', 'expectations', 'compensation', 'professional-development', 'department-specific-guidance']) {
    assert.equal(map[`/staff/${page}`], `/appendices/staff/${page}`)
  }
  assert.equal(map['/organizers/compensation'], '/appendices/staff/compensation')
  assert.deepEqual(validateRedirects(docsPages(), map), [])
})

test('valid map passes, in every route form', () => {
  assert.deepEqual(validateRedirects(pages, {
    '/retired/glossary': '/appendices/glossary#terms',
    '/old/page.html': '/appendices/glossary.html',
    '/old/section/': '/introduction/',
  }), [])
})

test('missing target fails', () => {
  assert.match(validateRedirects(pages, { '/old': '/nowhere' }).join('\n'), /target page does not exist: \/nowhere/)
})

test('source that still has a page fails, including directory index', () => {
  assert.match(validateRedirects(pages, { '/retired/': '/appendices/glossary' }).join('\n'), /source page still exists \(retired\/index.md\)/)
  assert.match(validateRedirects(pages, { '/retired': '/appendices/glossary' }).join('\n'), /source page still exists/)
})

test('chains, self-redirects and duplicates fail', () => {
  assert.match(validateRedirects(pages, { '/a': '/b', '/b': '/appendices/glossary' }).join('\n'), /chain/)
  assert.match(validateRedirects(pages, { '/a': '/a' }).join('\n'), /target page does not exist|itself/)
  assert.match(validateRedirects(pages, { '/a': '/introduction/', '/a/': '/introduction/' }).join('\n'), /Duplicate redirect source/)
})

test('stubs carry base, canonical, noindex and a markdown twin', () => {
  const files = redirectFiles({ '/old/x': '/appendices/glossary#t', '/old/dir/': '/introduction/' }, { base: '/docs/', siteUrl: 'https://example.org/docs/' })
  assert.deepEqual(files.map(f => f.path), ['old/x.html', 'old/x/index.html', 'old/x.md', 'old/dir/index.html', 'old/dir/index.md'])
  assert.match(files[0].content, /url=\/docs\/appendices\/glossary#t/)
  assert.match(files[0].content, /rel="canonical" href="https:\/\/example.org\/docs\/appendices\/glossary#t"/)
  assert.match(files[0].content, /noindex/)
  assert.equal(files[2].content, 'Moved to https://example.org/docs/appendices/glossary#t\n')
})

test('redirects preserve bookmarked subsections unless the mapping names a replacement anchor', () => {
  const files = redirectFiles({ '/staff/expectations': '/appendices/staff/expectations', '/old': '/appendices/glossary#terms' }, { base: '/docs/', siteUrl: 'https://example.org/docs/' })
  const stub = files.find(file => file.path === 'staff/expectations.html').content
  const script = stub.match(/<script>([\s\S]*?)<\/script>/)?.[1]
  assert.ok(script, 'Unfragmented redirect needs to preserve the incoming bookmark')
  let destination
  runInNewContext(script, { location: { hash: '#individual-contributor', replace: value => { destination = value } } })
  assert.equal(destination, '/docs/appendices/staff/expectations#individual-contributor')
  runInNewContext(script, { location: { hash: '', replace: value => { destination = value } } })
  assert.equal(destination, '/docs/appendices/staff/expectations')
  const mapped = files.find(file => file.path === 'old.html').content
  assert.match(mapped, /url=\/docs\/appendices\/glossary#terms/)
  assert.doesNotMatch(mapped, /location\.hash/)
})
