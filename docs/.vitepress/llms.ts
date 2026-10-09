import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname, posix } from 'node:path'
import type { SiteConfig } from 'vitepress'
import { resolveReferences } from '../../scripts/handbook-references.mjs'
import { getHandbookItems, getHandbookSections, PAGE_STATUSES } from '../../scripts/handbook-toc.mjs'

// Generates /llms.txt, /llms-full.md, /llms-full.txt, and a raw-Markdown
// twin of every page (e.g. dist/leadership/strategic-planning.md next to strategic-planning.html),
// at buildEnd — see docs/.vitepress/config.mts. Reads source Markdown
// directly rather than depending on gray-matter (not installed here).

const SITE_ORIGIN = 'https://sapiens-first.github.io'
const BASE_PATH = '/docs'
const ATLAS_URL = 'https://sapiensfirst.org/atlas'

const SECTION_ORDER = [...getHandbookSections().map(section => section.text), 'For Supporters', 'For Members', 'For Organizers']

const STATUS_VALUES = new Set(Object.keys(PAGE_STATUSES))

// Handbook callout blocks (docs/.vitepress/containers.ts) rendered as plain
// Markdown for the full-text dump. `related` isn't in containers' `kinds`
// map (it has its own renderer) but gets the same treatment here.
const CONTAINER_LABELS: Record<string, string> = {
  proposal: 'Proposal',
  clarify: 'Under construction',
  example: 'Example',
  roles: 'For role holders',
  background: 'Background',
  optional: 'Optional',
  source: 'Source of truth',
  related: 'Related',
}

function toCanonicalPath(relMdPath: string): string {
  let p = relMdPath.replace(/\\/g, '/').replace(/\.md$/, '')
  if (p === 'index') return '/'
  if (p.endsWith('/index')) return '/' + p.slice(0, -'/index'.length) + '/'
  return '/' + p
}

function toAbsoluteUrl(canonicalPath: string): string {
  const p = canonicalPath.startsWith('/') ? canonicalPath : '/' + canonicalPath
  return `${SITE_ORIGIN}${BASE_PATH}${p}`
}

// Tiny frontmatter reader. This handbook's frontmatter is a flat set of
// string scalars (title, description, section, status, last_updated,
// canonical, owner) plus a couple of nested keys only the home page uses
// (`paths`, `features`) that this reader never needs to see, so a minimal
// line parser stands in for a real YAML parser rather than adding a
// dependency (gray-matter isn't installed in this project).
function readFrontmatter(src: string): { data: Record<string, string>; body: string } {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!m) return { data: {}, body: src }
  const data: Record<string, string> = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/)
    if (!kv) continue
    const key = kv[1]
    let value = kv[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    // Skip arrays/objects (tags, paths, features): unused by this module.
    if (value === '' || value.startsWith('[') || value.startsWith('{')) continue
    data[key] = value
  }
  return { data, body: src.slice(m[0].length) }
}

function firstH1(body: string): string | undefined {
  const m = body.match(/^#\s+(.+)$/m)
  return m?.[1].trim()
}

interface PageInfo {
  relPath: string // e.g. "leadership/strategic-planning.md", relative to srcDir
  canonicalPath: string // e.g. "/leadership/strategic-planning" or "/dna/"
  url: string
  title: string
  description?: string
  section: string
  status?: string
  lastUpdated?: string
  body: string // markdown after the frontmatter block
}

function collectPages(siteConfig: SiteConfig): PageInfo[] {
  const pages: PageInfo[] = []
  for (const relPath of siteConfig.pages) {
    if (relPath === 'index.md') continue // homepage: its own layout, excluded from the index and the full dump
    let src: string
    try {
      src = readFileSync(join(siteConfig.srcDir, relPath), 'utf8')
    } catch {
      continue
    }
    const { data, body: authoredBody } = readFrontmatter(src)
    const body = resolveReferences(authoredBody, relPath, siteConfig.srcDir)
    const canonicalPath = data.canonical || toCanonicalPath(relPath)
    const section = data.section && SECTION_ORDER.includes(data.section)
      ? data.section
      : 'For Organizers'
    const status = data.status && STATUS_VALUES.has(data.status) ? data.status : undefined
    pages.push({
      relPath,
      canonicalPath,
      url: toAbsoluteUrl(canonicalPath),
      title: data.title || firstH1(body) || relPath.replace(/\.md$/, ''),
      description: data.description,
      section,
      status,
      lastUpdated: data.last_updated,
      body,
    })
  }
  const sectionIndex = (s: string) => {
    const i = SECTION_ORDER.indexOf(s)
    return i === -1 ? SECTION_ORDER.length : i
  }
  const ordered = getHandbookItems().map((item) => item.link)
  const rank = (page: PageInfo) => {
    const index = ordered.indexOf(page.canonicalPath)
    return index < 0 ? ordered.length : index
  }
  return pages.sort(
    (a, b) => sectionIndex(a.section) - sectionIndex(b.section) || rank(a) - rank(b) || a.relPath.localeCompare(b.relPath)
  )
}

function resolveMdLink(sourceRelPath: string, target: string): string | undefined {
  if (/^https?:\/\//.test(target) || target.startsWith('mailto:') || target.startsWith('#') || !target) {
    return undefined
  }
  const [pathPart, hash] = target.split('#')
  if (!pathPart) return undefined
  // Public diagram assets must also resolve in downloaded Markdown exports.
  if (pathPart.startsWith('/diagrams/') && pathPart.endsWith('.svg')) {
    const url = toAbsoluteUrl(pathPart)
    return hash ? `${url}#${hash}` : url
  }
  const resolvedRel = pathPart.startsWith('/')
    ? pathPart.slice(1)
    : posix.normalize(posix.join(posix.dirname(sourceRelPath), pathPart))
  if (pathPart.startsWith('/') && !pathPart.startsWith('//') && !posix.extname(pathPart)) {
    const url = toAbsoluteUrl(pathPart)
    return hash ? `${url}#${hash}` : url
  }
  if (!resolvedRel.endsWith('.md')) return undefined
  const url = toAbsoluteUrl(toCanonicalPath(resolvedRel))
  return hash ? `${url}#${hash}` : url
}

// Turns one page's Markdown body into a section of llms-full.md: the H1 is
// dropped (the caller prints the title as its own `#` heading, so the page's
// `##` sections nest under it unchanged), relative .md links become absolute site URLs, `::: kind`
// container fences become bold labels, and mermaid diagrams are dropped
// (they restate nearby prose rather than adding information).
function cleanBodyForFullDump(sourceRelPath: string, body: string): string {
  const lines = body.split(/\r?\n/)
  const out: string[] = []
  let removedH1 = false
  let inFence = false
  let fenceIsMermaid = false

  for (const line of lines) {
    const fenceMatch = line.match(/^\s*```\s*([\w-]*)\s*$/)
    if (fenceMatch && !inFence) {
      inFence = true
      fenceIsMermaid = fenceMatch[1] === 'mermaid'
      if (!fenceIsMermaid) out.push(line)
      continue
    }
    if (fenceMatch && inFence) {
      inFence = false
      if (!fenceIsMermaid) out.push(line)
      fenceIsMermaid = false
      continue
    }
    if (inFence) {
      if (!fenceIsMermaid) out.push(line)
      continue
    }

    const containerOpen = line.match(/^:::\s*([\w-]+)(?:\s+(.*))?\s*$/)
    if (containerOpen) {
      // Unlisted kinds (VitePress's own tip, info, warning, details) still
      // need their fences removed, or the block reads as never closing.
      const kind = containerOpen[1]
      const label = CONTAINER_LABELS[kind] ?? kind.charAt(0).toUpperCase() + kind.slice(1)
      const title = (containerOpen[2] || '').trim()
      out.push(title ? `**${label} — ${title}:**` : `**${label}:**`)
      continue
    }
    if (line.trim() === ':::') {
      out.push('')
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      if (heading[1] === '#' && !removedH1) {
        removedH1 = true
        continue
      }
      out.push(line)
      continue
    }

    out.push(line)
  }

  const text = out
    .join('\n')
    .replace(/\]\(([^)\s]+)([^)]*)\)/g, (whole, target, rest) => {
      const resolved = resolveMdLink(sourceRelPath, target)
      return resolved ? `](${resolved}${rest})` : whole
    })

  return text.replace(/\n{3,}/g, '\n\n').trim()
}

function statusSuffix(status?: string): string {
  return status ? ` (${status})` : ''
}

function buildLlmsTxt(pages: PageInfo[]): string {
  const lines: string[] = []
  lines.push('# Sapiens First', '')
  lines.push(
    'Sapiens First is a movement building public participation and political power for democratic renewal, common prosperity, and a secure future in the age of AI.',
    ''
  )
  lines.push(`Canonical handbook: ${toAbsoluteUrl('/')}`)
  lines.push(`Full handbook, one file: ${toAbsoluteUrl('/llms-full.md')}`)
  lines.push(`Current organizational state (people, roles, projects, objectives, metrics): ${ATLAS_URL}`)
  lines.push('')
  lines.push('## How to interpret these sources', '')
  lines.push('- This handbook explains stable concepts, rules, and procedures: what things mean and how they work.')
  lines.push(`- Atlas (${ATLAS_URL}) holds current people, roles, projects, objectives, and metrics.`)
  lines.push('- Where the handbook and Atlas differ about current operational state, prefer Atlas.')
  lines.push(
    '- Pages marked "planned", "under-construction", "proposal" or "draft" below are unfinished or describe possible future practice, not current Sapiens First policy.'
  )
  lines.push(
    `- Each page listed below is also available as raw Markdown at the same path with a \`.md\` suffix, for example ${toAbsoluteUrl(
      '/leadership/strategic-planning'
    )}.md.`
  )
  lines.push('')

  for (const section of SECTION_ORDER) {
    const inSection = pages.filter((p) => p.section === section)
    if (!inSection.length) continue
    lines.push(`## ${section}`, '')
    for (const p of inSection) {
      const desc = p.description ? `: ${p.description}` : ''
      lines.push(`- [${p.title}](${p.url})${desc}${statusSuffix(p.status)}`)
    }
    lines.push('')
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
}

function buildLlmsFull(pages: PageInfo[]): string {
  const today = new Date().toISOString().slice(0, 10)
  const lines: string[] = []
  lines.push('# Sapiens First Handbook', '')
  lines.push('Generated from the canonical Sapiens First documentation.', '')
  lines.push(`Last generated: ${today}`, '')
  lines.push('## How to interpret these sources', '')
  lines.push('- This handbook explains stable concepts, rules, and procedures: what things mean and how they work.')
  lines.push(`- Atlas (${ATLAS_URL}) holds current people, roles, projects, objectives, and metrics.`)
  lines.push('- Where the handbook and Atlas differ about current operational state, prefer Atlas.')
  lines.push('- Pages marked "planned", "under-construction", "proposal" or "draft" are unfinished or describe possible future practice, not current Sapiens First policy.')
  lines.push('- Inside adopted pages, text labelled **Proposal** or **Under construction** is not current policy either.')
  lines.push('- On the website some labelled blocks are collapsible; here they are flattened into ordinary paragraphs.')
  lines.push('')

  for (const p of pages) {
    lines.push('---', '')
    lines.push(`# ${p.title}`, '')
    lines.push(`Source: ${p.url}`)
    if (p.status) lines.push(`Status: ${p.status}`)
    lines.push(`Section: ${p.section}`)
    if (p.lastUpdated) lines.push(`Last updated: ${p.lastUpdated}`)
    lines.push('')
    lines.push(cleanBodyForFullDump(p.relPath, p.body))
    lines.push('')
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
}

export async function generateLlmsFiles(siteConfig: SiteConfig): Promise<void> {
  const pages = collectPages(siteConfig)

  const llmsTxt = buildLlmsTxt(pages)
  const llmsFull = buildLlmsFull(pages)

  writeFileSync(join(siteConfig.outDir, 'llms.txt'), llmsTxt, 'utf8')
  writeFileSync(join(siteConfig.outDir, 'llms-full.md'), llmsFull, 'utf8')
  writeFileSync(join(siteConfig.outDir, 'llms-full.txt'), llmsFull, 'utf8')

  // A raw-Markdown twin of every page next to its HTML (e.g.
  // dist/leadership/strategic-planning.md beside strategic-planning.html): same clean-body pass as
  // llms-full's per-page text, so a fetcher gets exactly the prose.
  for (const p of pages) {
    const outPath = join(siteConfig.outDir, p.relPath)
    mkdirSync(dirname(outPath), { recursive: true })
    const metadata = [`Source: ${p.url}`, p.status && `Status: ${p.status}`, p.lastUpdated && `Last updated: ${p.lastUpdated}`].filter(Boolean).join('\n')
    writeFileSync(outPath, `# ${p.title}\n\n${metadata}\n\n${cleanBodyForFullDump(p.relPath, p.body)}\n`, 'utf8')
  }
}
