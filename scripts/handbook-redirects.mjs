import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REDIRECTS_FILE = join(ROOT, 'handbook-data/redirects.json')

export function loadRedirects(file = REDIRECTS_FILE) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

/** "/a/b.html" -> "a/b"; "/a/" -> "a/"; "/" -> "". Keeps a trailing slash. */
function normalizeRoute(route) {
  return route.replace(/^\/+/, '').replace(/\.(?:html|md)$/, '')
}

function splitTarget(target) {
  const [route, ...hash] = target.split('#')
  return { route: normalizeRoute(route), hash: hash.join('#') }
}

/** Markdown paths (relative to docs/) that would serve a normalized route. */
function pageCandidates(route) {
  if (route === '' || route.endsWith('/')) return [`${route}index.md`]
  return [`${route}.md`, `${route}/index.md`]
}

/** Canonical key for comparing routes: "a/b/" and "a/b" are the same page. */
function routeKey(route) {
  return route.replace(/\/$/, '')
}

export function validateRedirects(pages, redirects = loadRedirects()) {
  const errors = []
  const have = new Set(pages)
  const sources = new Map()
  for (const [source, target] of Object.entries(redirects)) {
    if (!source.startsWith('/')) errors.push(`Redirect source must start with "/": ${source}`)
    if (typeof target !== 'string' || !target.startsWith('/')) {
      errors.push(`Redirect ${source}: target must be a string starting with "/"`)
      continue
    }
    const key = routeKey(normalizeRoute(source))
    if (sources.has(key)) errors.push(`Duplicate redirect source: ${source} and ${sources.get(key)}`)
    sources.set(key, source)
  }
  for (const [source, target] of Object.entries(redirects)) {
    if (typeof target !== 'string' || !target.startsWith('/')) continue
    const from = normalizeRoute(source)
    const existing = pageCandidates(from).find(path => have.has(path))
    if (existing) errors.push(`Redirect ${source}: source page still exists (${existing}); delete it first`)
    const to = splitTarget(target).route
    if (!pageCandidates(to).some(path => have.has(path))) errors.push(`Redirect ${source}: target page does not exist: ${target}`)
    if (routeKey(to) === routeKey(from)) errors.push(`Redirect ${source}: redirects to itself`)
    else if (sources.has(routeKey(to))) errors.push(`Redirect ${source}: chain, target ${target} is itself redirected`)
  }
  return errors
}

/** Files to write under the build output for each redirect: [{ path, content }]. */
export function redirectFiles(redirects, { base, siteUrl }) {
  const files = []
  for (const [source, target] of Object.entries(redirects)) {
    const { route, hash } = splitTarget(target)
    const suffix = hash ? `#${hash}` : ''
    const href = `${base}${route}${suffix}`
    const canonical = `${siteUrl.replace(/\/$/, '')}/${route}${suffix}`
    // Keep bookmarked section IDs through page moves. An explicit target
    // fragment instead names the replacement for a retired section.
    const preserveFragment = hash ? '' : `<script>location.replace(${JSON.stringify(href).replace(/</g, '\\u003c')} + location.hash)</script>\n`
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Moved</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${canonical}">
<meta http-equiv="refresh" content="0; url=${href}">
${preserveFragment}</head>
<body>
<p>This page has moved to <a href="${href}">${canonical}</a>.</p>
</body>
</html>
`
    const markdown = `Moved to ${canonical}\n`
    const from = normalizeRoute(source)
    if (from === '' || from.endsWith('/')) {
      files.push({ path: `${from}index.html`, content: html }, { path: `${from}index.md`, content: markdown })
    } else {
      files.push(
        { path: `${from}.html`, content: html },
        { path: `${from}/index.html`, content: html },
        { path: `${from}.md`, content: markdown },
      )
    }
  }
  return files
}

export function writeRedirects(outDir, redirects, options) {
  for (const { path, content } of redirectFiles(redirects, options)) {
    const out = join(outDir, path)
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, content, 'utf8')
  }
}
