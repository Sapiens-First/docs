// Build the downloadable handbook (PDF + EPUB) from the built site.
//
//   npm run docs:build && npm run book:build
//
// Output: docs/.vitepress/dist/downloads/sapiens-first-handbook.{html,pdf,epub}
// (served at /downloads/ on the handbook domain).
//
// How it works: page order comes from the VitePress sidebar (first occurrence
// of a page wins). dist/ is served locally, each page is opened in headless
// Chromium (so client-rendered Mermaid diagrams exist), the `.vp-doc` article
// is extracted, cleaned, and re-linked between pages. The same content becomes
// a print-styled book (PDF via Chromium) and an EPUB3 (written with jszip).
//
// Adding to CI (.github/workflows/deploy.yml), after "Build with VitePress":
//   - name: Install Chromium for the downloadable book
//     run: npx playwright-core install --with-deps chromium
//   - name: Build downloadable book
//     run: npm run book:build
// (the upload-pages-artifact step already publishes docs/.vitepress/dist).
// Set BOOK_CHROMIUM=/path/to/chrome to use an existing browser binary.

import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'
import JSZip from 'jszip'
import { resolveConfig } from 'vitepress'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DOCS = join(ROOT, 'docs')
const DIST = join(DOCS, '.vitepress/dist')
const OUT = join(DIST, 'downloads')
const FILE = 'sapiens-first-handbook'
const TITLE = 'Sapiens First Handbook'
const TAGLINE = 'Understand the AI crisis. Find your community. Learn to organize.'
const BUILT = new Date()
const BUILD_DATE = BUILT.toISOString().slice(0, 10)

// Version comes from docs/.vitepress/version.mjs (exports VERSION, RELEASE_DATE)
// when present; otherwise fall back to the build date.
let VERSION = ''
let DATE = BUILD_DATE
try {
  const v = await import(pathToFileURL(join(DOCS, '.vitepress/version.mjs')).href)
  if (v.VERSION) VERSION = String(v.VERSION)
  if (v.RELEASE_DATE) DATE = String(v.RELEASE_DATE).slice(0, 10)
} catch { /* no version file yet */ }
const BUILT_LINE = VERSION ? `Version ${VERSION} \u00b7 ${DATE}` : `Built ${DATE}`

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ─── page order from the sidebar ───────────────────────────────────────────
async function sidebarOrder() {
  const cfg = await resolveConfig(DOCS, 'build')
  const base = cfg.site.base
  const sidebar = cfg.userConfig.themeConfig?.sidebar ?? []
  const seen = new Set()
  const groups = []
  const walk = (items, group) => {
    for (const item of items ?? []) {
      if (item.link && !/^[a-z]+:/i.test(item.link)) {
        const path = item.link.replace(/\/index$/, '/').replace(/\.html$/, '')
        if (path !== '/' && !seen.has(path)) {
          seen.add(path)
          group.pages.push({ path, text: item.text })
        }
      }
      walk(item.items, group)
    }
  }
  for (const g of sidebar) {
    // Sidebar headings are HTML (number and label columns); `plainText` is
    // their tag-free form from scripts/handbook-toc.mjs.
    const group = { text: g.plainText ?? g.text, pages: [] }
    walk([g], group)
    if (group.pages.length) groups.push(group)
  }
  return { base, groups, site: cfg.userConfig.sitemap?.hostname ?? '' }
}

// ─── static server for dist (cleanUrls aware) ──────────────────────────────
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.json': 'application/json', '.ico': 'image/x-icon' }

function serve(base) {
  const server = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (!p.startsWith(base)) { res.writeHead(404).end(); return }
    p = p.slice(base.length - 1)
    const candidates = [p, `${p}.html`, join(p, 'index.html')]
    for (const c of candidates) {
      const f = join(DIST, c)
      if (f.startsWith(DIST) && existsSync(f) && statSync(f).isFile()) {
        res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' })
        res.end(readFileSync(f))
        return
      }
    }
    res.writeHead(404).end()
  })
  return new Promise(ok => server.listen(0, '127.0.0.1', () => ok(server)))
}

// ─── extract one page (runs in the browser) ────────────────────────────────
function extractInPage({ slug, origin, base, known, site }) {
  const doc = document.querySelector('.vp-doc')
  if (!doc) return null
  const el = doc.cloneNode(true)
  // Mermaid output was rendered in the live DOM; clone carries it along.
  el.querySelectorAll('.header-anchor, button.copy, span.lang, script, style, .vp-copy-ignore, noscript').forEach(n => n.remove())
  el.querySelectorAll('details').forEach(d => d.setAttribute('open', ''))
  const h1 = el.querySelector('h1')
  const title = (h1?.textContent ?? slug).replace(/​/g, '').replace(/\s+/g, ' ').trim()
  // Unique ids per page so merged pages cannot collide.
  el.querySelectorAll('[id]').forEach(n => { n.id = `${slug}--${n.id}` })
  el.querySelectorAll('a[href]').forEach(a => {
    const raw = a.getAttribute('href')
    if (raw.startsWith('#')) { a.setAttribute('href', `#${slug}--${raw.slice(1)}`); return }
    let u
    try { u = new URL(raw, location.href) } catch { return }
    if (u.origin === origin && u.pathname.startsWith(base)) {
      const path = ('/' + u.pathname.slice(base.length)).replace(/\.html$/, '').replace(/\/index$/, '/')
      const target = known[path] ?? known[path.replace(/\/$/, '')] ?? known[path + '/']
      if (target) a.setAttribute('href', u.hash ? `#${target}--${u.hash.slice(1)}` : `#${target}`)
      else a.setAttribute('href', new URL(`${u.pathname.slice(base.length)}${u.hash}`, site).href)
    } else a.setAttribute('href', u.href)
    a.removeAttribute('target'); a.removeAttribute('rel')
  })
  const imgs = []
  el.querySelectorAll('img').forEach(img => {
    const abs = new URL(img.getAttribute('src'), location.href).href
    img.setAttribute('src', abs); imgs.push(abs)
    img.removeAttribute('loading'); img.removeAttribute('srcset')
  })
  // Drop framework attributes that are noise (and invalid in XHTML).
  el.querySelectorAll('*').forEach(n => {
    for (const a of [...n.attributes]) {
      if (a.name === 'tabindex' || a.name.startsWith('data-v-') || a.name.startsWith('@') || a.name.startsWith(':') || a.name === 'data-allow-mismatch') n.removeAttribute(a.name)
    }
  })
  return { title, html: el.innerHTML, xhtml: [...el.childNodes].map(c => new XMLSerializer().serializeToString(c)).join(''), imgs: [...new Set(imgs)] }
}

// On-screen reading for the standalone HTML download; print rules above still win in print.
const SCREEN_CSS = `
@media screen {
  body { max-width: 46rem; margin: 0 auto; padding: 2rem 1.25rem 5rem; font-size: 17px; background: #f8f3eb; }
  .cover { height: auto; min-height: 70vh; border-bottom: 1px solid var(--line); margin-bottom: 2rem; }
  .toc, section.page { padding-top: 1rem; }
  section.page { border-top: 3px solid var(--ink); margin-top: 3rem; }
  .toc a:hover, a:hover { color: var(--ink); }
}
`

// ─── book HTML (for PDF) ───────────────────────────────────────────────────
const BOOK_CSS = `
@page { size: A4; margin: 22mm 20mm 24mm; }
:root { --ink:#111; --paper:#fff; --soft:#f0e8dc; --line:#c9c1b4; --red:#b53236; --coral:#ff7870; --yellow:#ffd60a; --sky:#bcd8ff; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font: 10.5pt/1.55 'DM Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif; color: var(--ink); margin: 0; }
h1, h2, h3, h4 { font-family: 'Barlow Condensed', 'Arial Narrow', 'DM Sans', sans-serif; line-height: 1.15; break-after: avoid; }
h1 { font-size: 30pt; margin: 0 0 14pt; padding-bottom: 6pt; border-bottom: 3pt solid var(--ink); }
h2 { font-size: 19pt; margin: 22pt 0 8pt; }
h3 { font-size: 14pt; margin: 16pt 0 6pt; }
h4 { font-size: 11.5pt; margin: 12pt 0 4pt; }
.sf-num { color: var(--red); margin-right: .25em; }
a { color: var(--red); text-decoration: underline; text-underline-offset: 2px; }
p, li { orphans: 3; widows: 3; }
img, svg { max-width: 100%; height: auto; }
figure, img, svg, pre, table, .custom-block { break-inside: avoid; }
code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: .88em; background: var(--soft); padding: 0 .25em; border-radius: 3px; }
pre { background: var(--soft); padding: 8pt; overflow-wrap: anywhere; white-space: pre-wrap; }
pre code { background: none; padding: 0; }
table { border-collapse: collapse; width: 100%; font-size: 9.5pt; }
th, td { border: 1px solid var(--line); padding: 4pt 6pt; text-align: left; vertical-align: top; }
th { background: var(--soft); }
blockquote { margin: 8pt 0; padding: 2pt 12pt; border-left: 4px solid var(--line); }
hr { border: 0; border-top: 1px solid var(--line); }
.custom-block, .sf-block { margin: 10pt 0; padding: 8pt 12pt; background: #f8f3eb; border-left: 6px solid var(--ink); }
.custom-block > :last-child { margin-bottom: 0; }
.sf-chip { display: inline-block; font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; padding: 1pt 6pt; border: 1.5px solid var(--ink); background: var(--ink); color: #fff; }
.sf-block-head { margin: 0 0 4pt; }
.sf-block summary { font-weight: 700; list-style: none; }
.sf-proposal { background: #fff6cc; border: 2px dashed var(--ink); } .sf-proposal .sf-chip { background: var(--yellow); color: #111; }
.sf-clarify { background: transparent; border: 1px dashed var(--ink); } .sf-clarify .sf-chip { background: var(--sky); color: #111; }
.sf-example { border-left-color: var(--coral); } .sf-example .sf-chip { background: var(--coral); color: #111; }
.sf-background .sf-chip, .sf-optional .sf-chip { background: transparent; color: var(--ink); }
.tip, .info { border-left-color: var(--sky); }
.warning, .danger { border-left-color: var(--yellow); }
.custom-block-title { font-weight: 700; margin: 0 0 4pt; }
.cover { height: 245mm; display: flex; flex-direction: column; justify-content: center; break-after: page; }
.cover h1 { font-size: 54pt; border: 0; margin: 0; }
.cover .tag { font-size: 16pt; margin: 10pt 0 0; }
.cover .date { margin-top: 40pt; color: #555; }
.cover .bar { width: 120pt; height: 10pt; background: var(--coral); border: 2pt solid var(--ink); margin-bottom: 24pt; }
.toc { break-after: page; }
.toc h1 { font-size: 30pt; }
.toc h2 { font-size: 13pt; margin: 14pt 0 4pt; text-transform: uppercase; letter-spacing: .04em; color: var(--red); }
.toc ol { list-style: none; margin: 0; padding: 0; }
.toc li { padding: 1.5pt 0; }
.toc a { color: var(--ink); text-decoration: none; }
section.page { break-before: page; }
`

function bookHtml(groups, pages, css) {
  css += SCREEN_CSS
  const toc = groups.map(g => `<h2>${esc(g.text)}</h2><ol>${g.pages.map(p => `<li><a href="#${p.slug}">${esc(pages.get(p.path).title)}</a></li>`).join('')}</ol>`).join('')
  const sections = groups.flatMap(g => g.pages).map(p => `<section class="page vp-doc" id="${p.slug}">${pages.get(p.path).html}</section>`).join('\n')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${TITLE}</title><style>${css}</style></head><body>
<div class="cover"><div class="bar"></div><h1>${TITLE}</h1><p class="tag">${TAGLINE}</p><p class="date">${BUILT_LINE}</p></div>
<nav class="toc"><h1>Contents</h1>${toc}</nav>
${sections}
</body></html>`
}

// ─── EPUB ──────────────────────────────────────────────────────────────────
const EPUB_CSS = BOOK_CSS.replace(/@page[^}]*}/, '').replace(/\.cover \{[^}]*\}/, '').replace(/body \{[^}]*\}/, 'body { font-family: serif; line-height: 1.5; margin: 0 4%; }')
  .replace(/h1 \{[^}]*\}/, 'h1 { font-size: 1.8em; margin: 1em 0 .6em; }')
const xhtml = (title, body, extra = '') => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en"><head><meta charset="utf-8"/><title>${esc(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body${extra}>${body}</body></html>`

async function buildEpub(groups, pages, images, file) {
  const zip = new JSZip()
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE', createFolders: false })
  zip.file('META-INF/container.xml', `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`)
  const list = groups.flatMap(g => g.pages)
  const fileOf = new Map(list.map(p => [p.slug, `${p.slug}.xhtml`]))
  const manifest = []
  const used = new Map() // image url -> epub path
  const imgPath = url => {
    if (used.has(url)) return used.get(url)
    const img = images.get(url)
    if (!img) return url
    const name = `images/${createHash('sha1').update(url).digest('hex').slice(0, 10)}${img.ext}`
    used.set(url, name)
    zip.file(`OEBPS/${name}`, img.buf)
    manifest.push(`<item id="img-${used.size}" href="${name}" media-type="${img.mime}"/>`)
    return name
  }
  // href="#slug--id" / "#slug" -> "slug.xhtml#slug--id"
  const relink = html => html.replace(/href="#([^"]+)"/g, (m, id) => {
    const slug = [...fileOf.keys()].find(s => id === s || id.startsWith(`${s}--`))
    return slug ? `href="${fileOf.get(slug)}#${id}"` : m
  })
  const rewriteImgs = html => html.replace(/(<img\b[^>]*?\bsrc=")([^"]+)"/g, (m, a, src) => `${a}${imgPath(src.replace(/&amp;/g, '&'))}"`)

  zip.file('OEBPS/style.css', EPUB_CSS)
  zip.file('OEBPS/cover.xhtml', xhtml(TITLE, `<div style="text-align:center;margin-top:30%"><h1>${TITLE}</h1><p>${TAGLINE}</p><p>${BUILT_LINE}</p></div>`))
  for (const p of list) {
    const pg = pages.get(p.path)
    const body = rewriteImgs(relink(pg.xhtml))
    zip.file(`OEBPS/${p.slug}.xhtml`, xhtml(pg.title, `<section class="page" id="${p.slug}">${body}</section>`))
    manifest.push(`<item id="${p.slug}" href="${p.slug}.xhtml" media-type="application/xhtml+xml"${/<svg[\s>]/.test(body) ? ' properties="svg"' : ''}/>`)
  }
  const nav = groups.map(g => `<li><span>${esc(g.text)}</span><ol>${g.pages.map(p => `<li><a href="${p.slug}.xhtml">${esc(pages.get(p.path).title)}</a></li>`).join('')}</ol></li>`).join('')
  zip.file('OEBPS/nav.xhtml', xhtml(TITLE, `<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>${nav}</ol></nav>`))
  const modified = BUILT.toISOString().replace(/\.\d+Z$/, 'Z')
  zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="en">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/" prefix="schema: http://schema.org/"><dc:identifier id="uid">urn:sapiens-first:handbook:${VERSION || DATE}</dc:identifier><dc:title>${TITLE}${VERSION ? ` ${esc(VERSION)}` : ''}</dc:title><dc:language>en</dc:language>${VERSION ? `<meta property="schema:version">${esc(VERSION)}</meta>` : ''}<dc:creator>Sapiens First</dc:creator><dc:description>${esc(TAGLINE)}</dc:description><meta property="dcterms:modified">${modified}</meta></metadata>
<manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="css" href="style.css" media-type="text/css"/><item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>${manifest.join('')}</manifest>
<spine><itemref idref="cover"/><itemref idref="nav"/>${list.map(p => `<itemref idref="${p.slug}"/>`).join('')}</spine></package>`)
  zip.forEach((p, f) => { if (f.dir) delete zip.files[p] })
  writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', mimeType: 'application/epub+zip' }))
}

// ─── main ──────────────────────────────────────────────────────────────────
if (!existsSync(join(DIST, 'index.html'))) throw new Error('dist/ not found — run `npm run docs:build` first')
const { base, groups, site } = await sidebarOrder()
const all = groups.flatMap(g => g.pages)
const slugOf = path => path.replace(/^\/|\/$/g, '').replace(/\//g, '-') || 'home'
for (const p of all) p.slug = `p-${slugOf(p.path)}`
const known = Object.fromEntries(all.map(p => [p.path, p.slug]))

const server = await serve(base)
const origin = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch(process.env.BOOK_CHROMIUM ? { executablePath: process.env.BOOK_CHROMIUM } : {})
try {
  const ctx = await browser.newContext({ colorScheme: 'light', viewport: { width: 1000, height: 1400 } })
  const page = await ctx.newPage()
  const pages = new Map()
  const imageUrls = new Set()
  for (const p of all) {
    for (let attempt = 1; ; attempt++) {
      try {
        await page.goto(`${origin}${base}${p.path.replace(/^\//, '')}`, { waitUntil: 'networkidle' })
        await page.waitForSelector('.vp-doc', { timeout: 15000 })
        break
      } catch (e) {
        if (attempt >= 2) throw new Error(`Could not load ${p.path}: ${e.message}`)
      }
    }
    // Mermaid diagrams render client-side into empty .sf-diagram containers.
    await page.waitForFunction(() => [...document.querySelectorAll('.sf-diagram, .mermaid')].every(d => d.querySelector('svg')), null, { timeout: 15000 })
      .catch(() => console.warn(`warning: diagram not rendered on ${p.path}`))
    const data = await page.evaluate(extractInPage, { slug: p.slug, origin, base, known, site })
    if (!data) throw new Error(`No .vp-doc on ${p.path}`)
    pages.set(p.path, data)
    data.imgs.forEach(u => imageUrls.add(u))
    console.log(`  ${p.path}  ${data.title}`)
  }
  // Fetch images once (served from the local dist).
  const images = new Map()
  for (const url of imageUrls) {
    if (!url.startsWith(origin)) continue
    const res = await fetch(url)
    if (!res.ok) { console.warn(`warning: image missing ${url}`); continue }
    const mime = (res.headers.get('content-type') ?? 'image/png').split(';')[0]
    images.set(url, { buf: Buffer.from(await res.arrayBuffer()), mime, ext: extname(new URL(url).pathname) || '.png' })
  }

  mkdirSync(OUT, { recursive: true })

  // PDF: embed images as data URIs so the page needs no origin.
  const withData = html => html.replace(/(<img\b[^>]*?\bsrc=")([^"]+)"/g, (m, a, src) => {
    const img = images.get(src.replace(/&amp;/g, '&'))
    return img ? `${a}data:${img.mime};base64,${img.buf.toString('base64')}"` : m
  })
  const printable = new Map([...pages].map(([k, v]) => [k, { ...v, html: withData(v.html) }]))
  const pdfPage = await ctx.newPage()
  const html = bookHtml(groups, printable, BOOK_CSS)
  writeFileSync(join(OUT, `${FILE}.html`), html)
  await pdfPage.setContent(html, { waitUntil: 'load' })
  await pdfPage.pdf({
    path: join(OUT, `${FILE}.pdf`), format: 'A4', printBackground: true, outline: true, tagged: true,
    displayHeaderFooter: true, preferCSSPageSize: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="width:100%;font:8px sans-serif;color:#555;padding:0 20mm;display:flex;justify-content:space-between"><span>${TITLE}${VERSION ? ` \u00b7 ${VERSION}` : ''}</span><span class="pageNumber"></span></div>`,
  })
  await buildEpub(groups, pages, images, join(OUT, `${FILE}.epub`))
} finally {
  await browser.close()
  server.close()
}
for (const ext of ['html', 'pdf', 'epub']) console.log(`${join(OUT, `${FILE}.${ext}`)}  ${(statSync(join(OUT, `${FILE}.${ext}`)).size / 1024).toFixed(0)} KB`)
