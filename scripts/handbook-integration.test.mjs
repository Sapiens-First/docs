import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

test('docs validator resolves included headings and links from both host and other pages', t => {
  const root = mkdtempSync(join(tmpdir(), 'handbook-validation-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  for (const dir of ['scripts', 'slides', 'docs', 'handbook-data']) mkdirSync(join(root, dir))
  for (const name of ['validate-docs.mjs', 'handbook-toc.mjs', 'handbook-references.mjs', 'handbook-redirects.mjs']) copyFileSync(new URL(name, import.meta.url), join(root, 'scripts', name))
  copyFileSync(new URL('../slides/registry.mjs', import.meta.url), join(root, 'slides/registry.mjs'))
  const pages = [
    { id: 'host', number: '3.1', title: '3.1 Host', path: 'host.md', section: 'Staff', body: '<!-- handbook:include source.md#pilot -->' },
    { id: 'source', number: 'A.1', title: 'A.1 Source', path: 'source.md', section: 'Reference materials', body: '<!-- handbook:block pilot -->\n### Shared {#shared}\n[Jump](#shared)\n<!-- /handbook:block -->' },
    { id: 'other', number: '3.2', title: '3.2 Other', path: 'other.md', section: 'Staff', body: '[Jump](host.md#ref-source-md-pilot-1-shared)' },
  ]
  writeFileSync(join(root, 'handbook-data/toc.json'), JSON.stringify(pages))
  writeFileSync(join(root, 'handbook-data/redirects.json'), '{}')
  for (const p of pages) writeFileSync(join(root, 'docs', p.path), `---\ntitle: "${p.title}"\ndescription: "Validation fixture"\nsection: ${p.section}\nstatus: draft\nlast_updated: 2026-10-02\nhandbook_id: ${p.id}\nhandbook_number: "${p.number}"\ncanonical: /${p.path.replace('.md', '')}\n---\n# ${p.title}\n\n## Summary\nFixture.\n\n${p.body}\n`)
  const result = spawnSync(process.execPath, [join(root, 'scripts/validate-docs.mjs')], { encoding: 'utf8' })
  assert.ifError(result.error)
  assert.equal(result.status, 0, result.stdout + result.stderr)
  assert.match(result.stdout, /0 error\(s\)/)
  writeFileSync(join(root, 'docs/source.md'), 'Missing canonical block')
  const broken = spawnSync(process.execPath, [join(root, 'scripts/validate-docs.mjs')], { encoding: 'utf8' })
  assert.ifError(broken.error)
  assert.notEqual(broken.status, 0)
  assert.match(broken.stdout, /Missing block pilot/)
})
