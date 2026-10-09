import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const toc = JSON.parse(readFileSync(join(ROOT, 'handbook-data/toc.json'), 'utf8'))
const DOCS = join(ROOT, 'docs')

export const PAGE_STATUSES = {
  adopted: { emoji: '✅', label: 'Adopted' },
  reference: { emoji: '✅', label: 'Reference' },
  draft: { emoji: '📝', label: 'Draft' },
  'under-construction': { emoji: '🚧', label: 'Under construction' },
  planned: { emoji: '⬜', label: 'Planned' },
  proposal: { emoji: '📝', label: 'Proposal' },
  experimental: { emoji: '🧪', label: 'Experimental' },
}

export function getHandbookItems(entries = toc) {
  return entries.map(({ title, path }) => ({
    text: title,
    link: `/${path.replace(/index\.md$/, '').replace(/\.md$/, '')}`,
  }))
}

function markdownFiles(root, prefix = '') {
  return readdirSync(join(root, prefix), { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith('.')) return []
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    return entry.isDirectory() ? markdownFiles(root, path) : path.endsWith('.md') ? [path] : []
  })
}

function metadata(source) {
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] ?? ''
  return Object.fromEntries(frontmatter.split(/\r?\n/).flatMap(line => {
    const match = line.match(/^([\w_]+):\s*(.*?)\s*$/)
    return match ? [[match[1], match[2].replace(/^(["'])(.*)\1$/, '$2')]] : []
  }))
}

function pageStatus(entry, docsRoot) {
  const path = join(docsRoot, entry.path)
  let meta = {}
  try {
    meta = metadata(readFileSync(path, 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const info = PAGE_STATUSES[meta.status]
  return {
    status: meta.status,
    statusEmoji: info?.emoji,
    statusLabel: info?.label,
    constructionNote: meta.construction_note,
  }
}

export function validateHandbookToc(docsRoot = join(ROOT, 'docs'), entries = toc) {
  const errors = []
  const seen = { id: new Set(), number: new Set(), path: new Set() }
  const pages = new Map(markdownFiles(docsRoot).map(path => {
    const source = readFileSync(join(docsRoot, path), 'utf8')
    return [path, { source, meta: metadata(source) }]
  }))
  for (const entry of entries) {
    for (const field of ['id', 'number', 'title', 'path', 'section']) {
      if (typeof entry[field] !== 'string' || !entry[field].trim()) errors.push(`TOC entry missing ${field}`)
    }
    for (const field of Object.keys(seen)) {
      if (seen[field].has(entry[field])) errors.push(`Duplicate TOC ${field}: ${entry[field]}`)
      seen[field].add(entry[field])
    }
    const page = pages.get(entry.path)
    if (!page) {
      errors.push(`TOC page missing: ${entry.path}`)
      continue
    }
    for (const [field, key] of [['id', 'handbook_id'], ['number', 'handbook_number'], ['title', 'title'], ['section', 'section']]) {
      if (entry[field] !== page.meta[key]) errors.push(`${entry.path}: TOC ${field} differs from ${key}`)
    }
    if (entry.status !== undefined && entry.status !== page.meta.status) errors.push(`${entry.path}: TOC status differs from status`)
    if (!Object.hasOwn(PAGE_STATUSES, page.meta.status)) errors.push(`${entry.path}: missing or invalid page status`)
    const heading = page.source.match(/^#\s+(.+?)\s*$/m)?.[1]
    if (heading !== entry.title) errors.push(`${entry.path}: TOC title differs from H1`)
    if (!entry.title?.startsWith(`${entry.number} `)) errors.push(`${entry.path}: title must begin with number ${entry.number}`)
  }
  for (const [path, { meta }] of pages) {
    if (meta.handbook_number !== undefined && !seen.path.has(path)) errors.push(`Numbered page absent from TOC: ${path}`)
  }
  return errors
}

/** Sidebar groups in TOC order: one { text: section, items } per `section` value. */
export function getHandbookSections(entries = toc) {
  const groups = new Map()
  for (const entry of entries) {
    if (!groups.has(entry.section)) groups.set(entry.section, [])
    groups.get(entry.section).push(entry)
  }
  return [...groups].map(([text, items]) => ({ text, items: getHandbookItems(items) }))
}

/**
 * Reader-facing chapter labels, keyed by TOC `section`. The single source for
 * the short names used in the navbar, sidebar group headings and home page
 * chapter map ("Start here" → 0 Start here, "Lead" → 3 Lead, …).
 */
export const CHAPTER_LABELS = {
  Introduction: { label: 'Start here', blurb: 'Who we are, how this handbook works, and how to take a first step.' },
  DNA: { label: 'DNA', blurb: 'Our story, theory of change, values, and how we are organized.' },
  'Go deeper': { label: 'Go deeper', blurb: 'Explore nonviolence, movement strategy, AI safety, and organizing conversations.' },
  Leadership: { label: 'Lead', blurb: 'Leading well in any role: culture, planning, people, and facilitation.' },
  'Train others': { label: 'Train others', blurb: 'Plan and facilitate trainings that help people practice and organize.' },
  Staff: { label: 'Staff', blurb: 'Why we have staff, what we expect, and how we pay and develop people.' },
  Supplemental: { label: 'Supplemental', blurb: 'Practical topics beyond the core chapters, from fundraising to media.' },
  'Reference materials': {
    label: 'Reference',
    blurb: 'Policies, rubrics, templates, field guides, prompts, and style guides.',
    // Sub-group headings for three-part page numbers, keyed by their middle
    // part (x.1.1 … → 1), matching the headings and anchors on
    // docs/appendices/index.md. Keyed this way so they survive renumbering.
    groups: {
      1: { title: 'Policies and rubrics', anchor: 'policies-and-rubrics' },
      2: { title: 'Templates, agendas, and guides', anchor: 'templates-agendas-and-guides' },
      3: { title: 'Prompts', anchor: 'prompts' },
      4: { title: 'Style guides', anchor: 'style-guides' },
    },
  },
  'Further Reading': { label: 'Further reading', blurb: 'Books and resources to go deeper.' },
  Citations: { label: 'Citations', blurb: 'Sources behind each chapter.' },
  Glossary: { label: 'Glossary', blurb: 'Terms used across the handbook.' },
  Slides: { label: 'Slides', blurb: 'Every training deck, who made it, and which handbook pages it teaches.' },
}

/**
 * Navigation-only short titles, keyed by TOC `id`, for page titles too long to
 * sit on one line in the sidebar and chapter map. Page titles are unchanged.
 */
export const SHORT_TITLES = {
  'values-standards': 'Values, red lines & reporting',
  'fellowship-agreement': 'Fellowship agreement',
  'outreach-templates': 'Outreach templates',
  'field-guides-organizing-conversations': 'Organizing conversations',
  'further-reading-leadership-planning-development': 'Leadership & development',
}

const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const linkFor = entry => getHandbookItems([entry])[0].link

/** Split "2.1 Culture in leadership" into its number and (navigation) title. */
function splitTitle(entry) {
  return { number: entry.number, title: SHORT_TITLES[entry.id] ?? entry.title.slice(entry.number.length).trim() }
}

/** "A.2" for "A.2.10" (any prefix); undefined for two-part numbers such as "2.1". */
const groupNumber = number => number.split('.').length > 2 ? number.split('.').slice(0, 2).join('.') : undefined

/**
 * Pages whose numbers have three parts (A.1.1 …) are gathered under their
 * two-part prefix, e.g. { number: 'A.1', title: 'Policies and rubrics', pages }.
 * Returns undefined for chapters without such numbers.
 */
function pageGroups(section, pages, landing) {
  if (!pages.some(page => groupNumber(page.number))) return undefined
  const names = CHAPTER_LABELS[section]?.groups ?? {}
  const groups = new Map()
  for (const page of pages) {
    const number = groupNumber(page.number) ?? page.number
    if (!groups.has(number)) {
      const { title = number, anchor } = names[number.split('.')[1]] ?? {}
      groups.set(number, { number, title, link: anchor ? `${landing}#${anchor}` : landing, pages: [] })
    }
    groups.get(number).pages.push({ ...page, shortNumber: page.number.slice(number.length) || page.number })
  }
  return [...groups.values()]
}

/**
 * One record per chapter (TOC `section`), in TOC order: its friendly label,
 * chapter number and title, landing link, and pages. A chapter's root entry
 * (the one numbered without a dot, e.g. "2") is its landing page and is not
 * repeated in `pages`; a chapter without one lands on its first page.
 */
export function getHandbookChapters(entries = toc, docsRoot = DOCS) {
  const groups = new Map()
  for (const entry of entries) {
    if (!groups.has(entry.section)) groups.set(entry.section, [])
    groups.get(entry.section).push(entry)
  }
  return [...groups].map(([section, items]) => {
    const root = items.find(entry => !entry.number.includes('.'))
    const number = root?.number ?? items[0].number.split('.')[0]
    const title = root ? splitTitle(root).title : section
    const { label = title, blurb = '' } = CHAPTER_LABELS[section] ?? {}
    const link = linkFor(root ?? items[0])
    const pages = items.filter(entry => entry !== root).map(entry => ({ ...splitTitle(entry), link: linkFor(entry), ...pageStatus(entry, docsRoot) }))
    return {
      section,
      label,
      number,
      title,
      blurb,
      // Appendices are numbered with letters or numerals rather than digits.
      appendix: !/^\d/.test(number),
      link,
      ...pageStatus(root ?? items[0], docsRoot),
      pages,
      groups: pageGroups(section, pages, link),
    }
  })
}

/**
 * Sidebar groups for VitePress. Each chapter heading reads "<number>. <Title>"
 * and links to the chapter's landing page, so the landing page is not repeated
 * as an item; a chapter without one has an unlinked heading and keeps
 * its first page as an item. A chapter with no other pages (Glossary) is a
 * plain heading link with no items. Headings and page titles are split into a
 * number column and a title so they align like a printed table of contents
 * (styled in docs/.vitepress/theme/nav.css); `plainText` keeps a tag-free
 * form for consumers such as scripts/build-book.mjs.
 */
export function getSidebarGroups(entries = toc, docsRoot = DOCS) {
  const cell = (number, body) => `<span class="sf-toc-num">${escapeHtml(number)}</span><span class="sf-toc-title">${body}</span>`
  const status = page => page.statusEmoji
    ? `<span class="sf-toc-status" role="img" aria-label="${escapeHtml(page.statusLabel)}" title="${escapeHtml([page.statusLabel, page.constructionNote].filter(Boolean).join(': '))}">${page.statusEmoji}</span> `
    : ''
  const pageItem = (page, number = page.number) => ({
    text: cell(number, `${status(page)}${escapeHtml(page.title)}`),
    plainText: `${page.number} ${page.title}`,
    link: page.link,
  })
  return getHandbookChapters(entries, docsRoot).map(chapter => {
    const hasLanding = entries.some(entry => entry.section === chapter.section && !entry.number.includes('.'))
    const items = chapter.groups
      ? chapter.groups.map(group => ({
          text: cell(group.number, escapeHtml(group.title)),
          plainText: `${group.number} ${group.title}`,
          collapsed: true,
          items: group.pages.map(page => pageItem(page, page.shortNumber)),
        }))
      : chapter.pages.map(page => pageItem(page))
    return {
      text: cell(`${chapter.number}.`, `${status(chapter)}<strong class="sf-toc-label">${escapeHtml(chapter.title)}</strong>`),
      plainText: `${chapter.number}. ${chapter.title}`,
      appendix: chapter.appendix,
      ...(hasLanding ? { link: chapter.link } : {}),
      // `items: []` keeps a page-less chapter its own top-level group (VitePress
      // folds item-less entries into the previous group) without a caret.
      ...(items.length ? { items, collapsed: true } : { items: [] }),
    }
  })
}
