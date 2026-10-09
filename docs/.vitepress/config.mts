import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import { handbookContainers } from './containers'
import { headingNumbers } from './heading-numbers'
import { generateLlmsFiles } from './llms'
import { getHandbookChapters, getSidebarGroups, PAGE_STATUSES, validateHandbookToc } from '../../scripts/handbook-toc.mjs'
import { resolveReferences } from '../../scripts/handbook-references.mjs'
import { loadRedirects, writeRedirects } from '../../scripts/handbook-redirects.mjs'
import { VERSION } from './version.mjs'
import { loadDeckRegistry, publishedDecks } from '../../slides/registry.mjs'

const base = '/docs/'

// Decks the site publishes (see scripts/build-slides.mjs); SLIDES_PREVIEW=1
// also lists handcrafted decks that are not yet approved.
const deckRegistry = loadDeckRegistry()
const published = new Set(publishedDecks(deckRegistry, { preview: process.env.SLIDES_PREVIEW === '1' }).map((deck) => deck.slug))
const tocEntries: { id: string; title: string; path: string }[] = JSON.parse(readFileSync(join(process.cwd(), 'handbook-data/toc.json'), 'utf8'))
const coveredPage = (id: string) => {
  const entry = tocEntries.find((e) => e.id === id)!
  return { title: entry.title, link: '/' + entry.path.replace(/index\.md$/, '').replace(/\.md$/, '') }
}
const slideDecks = deckRegistry.map(({ slug, title, origin, approved, covers, lastUpdated }) => ({
  slug, title, origin, approved, lastUpdated, covers: covers.map(coveredPage), published: published.has(slug)
}))
const siteHostname = 'https://sapiens-first.github.io/docs/'

// One ordered registry supplies navigation and checks authored numbering.
const tocErrors = validateHandbookToc()
if (tocErrors.length) throw new Error(tocErrors.join('\n'))
// Chapters carry the reader-facing labels ("Start here", "DNA", "Lead", …)
// from CHAPTER_LABELS in scripts/handbook-toc.mjs; nav, sidebar and the home
// page chapter map all read from here.
const handbookChapters = getHandbookChapters()
const chapter = (section: string) => handbookChapters.find((c) => c.section === section)!
const chapterLink = (section: string) => ({ text: chapter(section).label, link: chapter(section).link })
const activeMatch = (section: string) => `^/${chapter(section).link.split('/')[1]}/`
// Chapters with their own navbar link; the rest go under "More".
const navChapters = ['Introduction', 'DNA', 'Go deeper', 'Leadership', 'Train others']

// Retired legacy routes (handbook-data/redirects.json) still resolve through
// the redirect stubs written at buildEnd, so links to them (e.g. historic
// changelog entries) are not dead.
const redirectedRoutes = new Set(Object.keys(loadRedirects()).map((route) => route.replace(/\/$/, '/index')))
const isRedirectedLink = (url: string) => redirectedRoutes.has(url.split('#')[0].replace(/\.(?:md|html)$/, ''))

// https://vitepress.dev/reference/site-config
export default withMermaid(defineConfig({
  title: 'Sapiens First Handbook',
  description: 'The Sapiens First handbook: our story, how we lead, and how to get involved, chapter by chapter.',
  // Served from https://sapiens-first.github.io/docs/. When the site moves to
  // docs.sapiensfirst.org, set `base` to '/' and add docs/public/CNAME.
  base,
  cleanUrls: true,
  ignoreDeadLinks: [isRedirectedLink],
  lastUpdated: true,

  // Advisory until the site has its own domain: robots.txt only takes
  // effect at a host root, and GitHub Pages serves this site under /docs/.
  sitemap: { hostname: siteHostname },

  markdown: {
    config: (md) => {
      // Run before VitePress parses headers so embeds share HTML/export anchors.
      md.core.ruler.before('normalize', 'handbook-references', (state) => {
        if (state.env.relativePath) state.src = resolveReferences(state.src, state.env.relativePath, join(process.cwd(), 'docs'))
      })
      handbookContainers(md)
      headingNumbers(md)
    }
  },

  // Reading time for the page eyebrow, no "On this page" box on pages too
  // short to need one (fewer than three sections), and the page's own
  // `last_updated` frontmatter (not git history) driving the footer's
  // "Last updated" date.
  transformPageData(pageData, { siteConfig }) {
    if (pageData.frontmatter.layout === 'home') return
    const src = readFileSync(join(siteConfig.srcDir, pageData.relativePath), 'utf8')
    const words = src.replace(/^---[\s\S]*?---/, '').split(/\s+/).filter(Boolean).length
    pageData.frontmatter.readingTime ??= Math.max(1, Math.round(words / 220))
    if (pageData.frontmatter.outline === undefined && (src.match(/^## /gm)?.length ?? 0) < 3) {
      pageData.frontmatter.outline = false
    }
    // YAML parses an unquoted `YYYY-MM-DD` scalar as a Date, not a string,
    // so frontmatter `last_updated` can arrive as either depending on how
    // it was written; accept both.
    const lastUpdated = pageData.frontmatter.last_updated
    let time: number | undefined
    if (lastUpdated instanceof Date && !Number.isNaN(lastUpdated.getTime())) {
      time = lastUpdated.getTime()
    } else if (typeof lastUpdated === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(lastUpdated)) {
      const parsed = new Date(`${lastUpdated}T00:00:00Z`).getTime()
      if (!Number.isNaN(parsed)) time = parsed
    }
    if (time !== undefined) pageData.lastUpdated = time
  },

  // Canonical link tag per page, using frontmatter `canonical` when a page
  // has migrated to the new schema, falling back to its clean-URL path.
  transformHead({ pageData }) {
    if (pageData.frontmatter.layout === 'home') return
    const fallback = `/${pageData.relativePath}`
      .replace(/(^|\/)index\.md$/, '$1')
      .replace(/\.md$/, '')
    const canonical = pageData.frontmatter.canonical || fallback
    return [['link', { rel: 'canonical', href: `${siteHostname.replace(/\/$/, '')}${canonical}` }]]
  },

  // Writes llms.txt, llms-full.md, llms-full.txt, and a raw-Markdown twin of
  // every page (docs/.vitepress/llms.ts) once the static build has run.
  async buildEnd(config) {
    await generateLlmsFiles(config)
    // Static redirect stubs (and .md twins) for retired legacy routes.
    writeRedirects(config.outDir, loadRedirects(), { base, siteUrl: siteHostname })
  },

  head: [
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: `${base}favicon-32x32.png` }],
    ['link', { rel: 'apple-touch-icon', href: `${base}apple-touch-icon.png` }],
    ['meta', { name: 'theme-color', content: '#f8f3eb' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,900;1,9..40,400&display=swap'
    }]
  ],

  themeConfig: {
    slideDecks,
    logo: '/logo.png',
    siteTitle: 'Sapiens First',

    // Chapters by their short labels; everything else lives under "More".
    nav: [
      ...navChapters.map((section) => ({ ...chapterLink(section), activeMatch: activeMatch(section) })),
      {
        text: 'More',
        items: [
          {
            text: 'More chapters',
            items: handbookChapters
              .filter((c) => !navChapters.includes(c.section))
              .map((c) => ({ text: `${c.number} · ${c.label}`, link: c.link }))
          },
          {
            text: 'Download',
            items: [
              // VitePress adds the base to .html links itself; a ${base} prefix would double it.
              { text: 'HTML', link: '/downloads/sapiens-first-handbook.html', target: '_self', noIcon: true },
              { text: 'PDF', link: `${base}downloads/sapiens-first-handbook.pdf`, target: '_self', noIcon: true },
              { text: 'EPUB', link: `${base}downloads/sapiens-first-handbook.epub`, target: '_self', noIcon: true }
            ]
          },
          {
            text: 'About',
            items: [
              { text: `Version log (v${VERSION})`, link: '/changelog' },
              { text: 'Atlas', link: 'https://sapiensfirst.org/atlas' },
              { text: 'Website', link: 'https://sapiensfirst.org' }
            ]
          }
        ]
      }
    ],

    // Read by the home page chapter map (theme/components/ChapterMap.vue).
    handbookChapters,
    handbookStatuses: PAGE_STATUSES,

    // Numbered handbook chapters (from handbook-data/toc.json), headed
    // "1. DNA" and linked to their landing pages; the group holding the
    // current page opens automatically.
    // Retired legacy routes redirect via handbook-data/redirects.json.
    sidebar: [
      ...getSidebarGroups().flatMap(({ appendix, ...group }, i, groups) => [
        // a quiet "Appendices" divider above the first appendix
        ...(appendix && !groups[i - 1]?.appendix ? [{ text: '<span class="sf-toc-divider">Appendices</span>', plainText: 'Appendices', items: [] }] : []),
        group
      ]),
      {
        text: 'About',
        plainText: 'About',
        collapsed: true,
        items: [
          { text: 'Version log', link: '/changelog' },
        ]
      },
    ],

    search: {
      provider: 'local',
      options: {
        detailedView: true,
        miniSearch: {
          searchOptions: { fuzzy: 0.2, prefix: true, boost: { title: 4, titles: 2, text: 1 } }
        }
      }
    },

    externalLinkIcon: true,

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Sapiens-First/docs' }
    ],

    editLink: {
      pattern: 'https://github.com/Sapiens-First/docs/edit/main/docs/:path',
      text: 'Suggest an edit'
    },

    outline: { level: [2, 3], label: 'On this page' },

    // Rendered from frontmatter `last_updated` (set on pageData.lastUpdated
    // in transformPageData above), not from git history.
    lastUpdated: {
      text: 'Last updated',
      formatOptions: { dateStyle: 'long', timeZone: 'UTC' }
    },

    footer: {
      message: `Handbook v${VERSION} · <a href="${base}changelog">Version log</a>`,
      copyright: 'Sapiens First'
    }
  },

  // Flowcharts in ```mermaid blocks, drawn in the site's paper-and-ink palette
  mermaid: {
    theme: 'base',
    themeVariables: {
      fontFamily: 'DM Sans, sans-serif',
      fontSize: '15px',
      primaryColor: '#ffffff',
      primaryTextColor: '#111111',
      primaryBorderColor: '#111111',
      lineColor: '#111111',
      secondaryColor: '#ffd60a',
      tertiaryColor: '#f0e8dc',
      clusterBkg: '#f0e8dc',
      clusterBorder: '#111111',
      edgeLabelBackground: '#f8f3eb'
    },
    flowchart: { curve: 'basis', padding: 14, htmlLabels: true }
  },
  mermaidPlugin: { class: 'sf-diagram' }
}))
