#!/usr/bin/env node
/**
 * Validates handbook frontmatter and internal links against the schema in
 * maintenance/history/AI-READABILITY-PLAN.md.
 *
 *   node scripts/validate-docs.mjs               # strict: exits 1 on ERROR
 *   node scripts/validate-docs.mjs --warn-only    # prints everything, always exits 0
 *
 * Checks docs/**\/*.md, excluding docs/index.md (home page: a different
 * frontmatter shape) and docs/.vitepress (site source, not content).
 *
 * ERROR (fails the build in strict mode):
 *   - missing title / description / section / status / last_updated
 *   - status not in the controlled vocabulary
 *   - section not in the legacy or numbered handbook sections
 *   - last_updated not a real YYYY-MM-DD calendar date
 *   - numbered pages missing stable identity or matching display number
 *   - duplicate canonical path across pages
 *   - canonical not matching the file's own path
 *   - frontmatter title text differs from the page's H1 text
 *   - more than one H1
 *   - relative .md links or #fragments that don't resolve
 *   - handbook-data/redirects.json entries whose source page still exists,
 *     whose target is missing, or that chain or duplicate
 *
 * WARN (never fails the build):
 *   - no `::: related` block
 *   - no `## In brief` section
 *   - no one-sentence `>` summary directly under the H1
 *
 * Wording and link-text guardrails from the retired readability rewrite live
 * in git history; this script checks frontmatter and schema only.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname, relative, resolve, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CHAPTER_LABELS, PAGE_STATUSES, validateHandbookToc } from './handbook-toc.mjs'
import { loadRedirects, validateRedirects } from './handbook-redirects.mjs'
import { resolveReferences } from './handbook-references.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DOCS = join(ROOT, 'docs')
const warnOnly = process.argv.includes('--warn-only')

const ALLOWED_STATUS = Object.keys(PAGE_STATUSES)
const ALLOWED_SECTIONS = ['For Supporters', 'For Members', 'For Organizers']
const HANDBOOK_SECTIONS = Object.keys(CHAPTER_LABELS)
const HANDBOOK_NUMBER = /^(?:\d+|[A-E])(?:\.\d+)*$/

function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** Same slug algorithm as VitePress heading anchors. */
function slugify(s) {
  s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  s = s.replace(/[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'“”‘’<>,.?/]+/g, '-')
  s = s.replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '')
  s = s.replace(/^(\d)/, '_$1')
  return s.toLowerCase()
}

function listMarkdownFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (entry === '.vitepress' || entry === 'public') continue
      out.push(...listMarkdownFiles(full))
    } else if (entry.endsWith('.md')) {
      out.push(full)
    }
  }
  return out
}

function readFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!m) return { data: {}, body: src, raw: '' }
  const data = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/)
    if (!kv) continue
    const key = kv[1]
    let value = kv[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (value === '' || value.startsWith('[') || value.startsWith('{')) continue
    data[key] = value
  }
  return { data, body: src.slice(m[0].length), raw: m[1] }
}

function toCanonicalPath(relMdPath) {
  let p = relMdPath.replace(/\\/g, '/').replace(/\.md$/, '')
  if (p === 'index') return '/'
  if (p.endsWith('/index')) return '/' + p.slice(0, -'/index'.length) + '/'
  return '/' + p
}

function headings(body) {
  const out = []
  let inFence = false
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const m = line.match(/^(#{1,6})\s+(.*)$/)
    if (m) out.push({ level: m[1].length, text: m[2].trim() })
  }
  return out
}

function anchorsFor(cache, absPath) {
  if (cache.has(absPath)) return cache.get(absPath)
  let set = new Set()
  try {
    const { body } = readFrontmatter(readFileSync(absPath, 'utf8'))
    const expanded = resolveReferences(body, relative(DOCS, absPath), DOCS)
    for (const h of headings(expanded)) {
      const custom = h.text.match(/\{#([\w-]+)\}\s*$/)
      let text = custom ? h.text.slice(0, custom.index).trim() : h.text
      text = text.replace(/[*_`]|\[([^\]]*)\]\([^)]*\)/g, (whole, g1) => g1 ?? '')
      set.add(custom ? custom[1] : slugify(text))
    }
  } catch {
    set = null
  }
  cache.set(absPath, set)
  return set
}

function checkLinks(errors, file, body, anchorCache) {
  const stripped = body.replace(/```[\s\S]*?```/g, '')
  const linkRe = /\]\(([^)\s]+)\)/g
  let match
  while ((match = linkRe.exec(stripped))) {
    const target = match[1]
    if (/^https?:\/\//.test(target) || target.startsWith('mailto:')) continue
    const [pathPart, hash] = target.split('#')
    if (!pathPart) {
      // pure #fragment link: must resolve on this same page
      const anchors = anchorsFor(anchorCache, file)
      if (anchors && hash && !anchors.has(hash)) {
        errors.push(`${relative(ROOT, file)}: broken link to #${hash} (no matching heading on this page)`)
      }
      continue
    }
    if (!pathPart.endsWith('.md')) continue
    const destPath = pathPart.startsWith('/')
      ? join(DOCS, pathPart.slice(1))
      : resolve(dirname(file), pathPart)
    if (!existsSync(destPath)) {
      errors.push(`${relative(ROOT, file)}: broken link to ${pathPart}`)
      continue
    }
    if (hash) {
      const anchors = anchorsFor(anchorCache, destPath)
      if (anchors && !anchors.has(hash)) {
        errors.push(`${relative(ROOT, file)}: broken link to ${pathPart}#${hash}`)
      }
    }
  }
}

function main() {
  const files = listMarkdownFiles(DOCS).filter((f) => f !== join(DOCS, 'index.md'))
  const errors = validateHandbookToc(DOCS)
  errors.push(...validateRedirects(listMarkdownFiles(DOCS).map((f) => relative(DOCS, f).split('\\').join('/')), loadRedirects()))
  const home = join(DOCS, 'index.md')
  if (existsSync(home)) {
    const { data, body } = readFrontmatter(readFileSync(home, 'utf8'))
    if (!isCalendarDate(data.last_updated)) errors.push('docs/index.md: last_updated must be a real YYYY-MM-DD calendar date')
    checkLinks(errors, home, body, new Map())
  }
  const warnings = []
  const canonicalOwners = new Map() // canonical path -> [files]
  const handbookIds = new Map()
  const handbookNumbers = new Map()
  const anchorCache = new Map()

  for (const file of files) {
    const relPath = relative(ROOT, file)
    const relToDocs = posix.normalize(relative(DOCS, file).split('\\').join('/'))
    const src = readFileSync(file, 'utf8')
    const { data, body } = readFrontmatter(src)

    for (const key of ['title', 'description', 'section', 'status', 'last_updated']) {
      if (!data[key]) errors.push(`${relPath}: missing frontmatter \`${key}\``)
    }

    if (data.status && !ALLOWED_STATUS.includes(data.status)) {
      errors.push(`${relPath}: status "${data.status}" not in [${ALLOWED_STATUS.join(', ')}]`)
    }
    if (data.section && ![...ALLOWED_SECTIONS, ...HANDBOOK_SECTIONS].includes(data.section)) {
      errors.push(`${relPath}: section "${data.section}" is not an allowed handbook section`)
    }
    if (data.last_updated && !isCalendarDate(data.last_updated)) {
      errors.push(`${relPath}: last_updated "${data.last_updated}" is not a real YYYY-MM-DD calendar date`)
    }

    const expectedCanonical = toCanonicalPath(relToDocs)
    if (data.canonical) {
      if (data.canonical !== expectedCanonical) {
        errors.push(
          `${relPath}: canonical "${data.canonical}" does not match the file's path (expected "${expectedCanonical}")`
        )
      }
      if (!canonicalOwners.has(data.canonical)) canonicalOwners.set(data.canonical, [])
      canonicalOwners.get(data.canonical).push(relPath)
    }

    const h1s = headings(body).filter((h) => h.level === 1)
    const numbered = HANDBOOK_SECTIONS.includes(data.section) || Boolean(data.handbook_id || data.handbook_number)
    if (numbered) {
      if (!data.handbook_id || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(data.handbook_id)) {
        errors.push(`${relPath}: handbook_id must be a stable lowercase kebab-case string`)
      }
      if (!data.handbook_number || !HANDBOOK_NUMBER.test(data.handbook_number)) {
        errors.push(`${relPath}: handbook_number must be a chapter, section, or appendix number`)
      } else {
        const prefix = `${data.handbook_number} `
        if (!data.title?.startsWith(prefix) || h1s.length !== 1 || !h1s[0].text.startsWith(prefix)) {
          errors.push(`${relPath}: title and H1 must start with handbook_number "${data.handbook_number}" followed by a space`)
        }
      }
      for (const [key, owners] of [['handbook_id', handbookIds], ['handbook_number', handbookNumbers]]) {
        if (!data[key]) continue
        if (!owners.has(data[key])) owners.set(data[key], [])
        owners.get(data[key]).push(relPath)
      }
    }
    if (h1s.length > 1) errors.push(`${relPath}: more than one H1 (${h1s.length})`)
    if (data.title && h1s.length >= 1 && data.title.trim() !== h1s[0].text.trim()) {
      errors.push(`${relPath}: frontmatter title "${data.title}" does not match the H1 "${h1s[0].text}"`)
    }

    try {
      const expanded = resolveReferences(body, relative(DOCS, file), DOCS)
      checkLinks(errors, file, expanded, anchorCache)
    } catch (error) {
      errors.push(`${relPath}: ${error.message}`)
    }

    if (numbered) {
      if (!/^## Summary\s*$/m.test(body)) warnings.push(`${relPath}: no "## Summary" section`)
      continue
    }
    if (!/^::: ?related\b/m.test(body)) warnings.push(`${relPath}: no ::: related block`)
    if (!/^## In brief\s*$/m.test(body)) warnings.push(`${relPath}: no "## In brief" section`)
    const afterH1 = body.replace(/^[\s\S]*?^# .+$/m, '').trimStart()
    if (h1s.length && !/^>\s+\S/.test(afterH1)) {
      warnings.push(`${relPath}: no one-sentence "> summary" directly under the H1`)
    }
  }

  for (const [canonical, owners] of canonicalOwners) {
    if (owners.length > 1) {
      errors.push(`Duplicate canonical "${canonical}" used by: ${owners.join(', ')}`)
    }
  }
  for (const [key, values] of [['handbook_id', handbookIds], ['handbook_number', handbookNumbers]]) {
    for (const [value, owners] of values) {
      if (owners.length > 1) errors.push(`Duplicate ${key} "${value}" used by: ${owners.join(', ')}`)
    }
  }

  for (const w of warnings) console.log('WARN ', w)
  for (const e of errors) console.log(warnOnly ? 'WARN* ' : 'ERROR', e)

  console.log(
    `\n${files.length} page(s) checked. ${errors.length} error(s), ${warnings.length} warning(s).` +
      (warnOnly ? ' (--warn-only: not failing the build)' : '')
  )

  if (errors.length && !warnOnly) process.exit(1)
}

main()
