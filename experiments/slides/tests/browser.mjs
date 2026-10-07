import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'

// Run from the repository root; the optional arguments are HTML and evidence directory.
const root = fileURLToPath(new URL('../../../', import.meta.url))
const input = resolve(process.argv[2] ?? join(root, 'experiments/slides/output/10-6-dna.html'))
const output = resolve(process.argv[3] ?? join(root, 'experiments/slides/output/browser-evidence'))
const executable = process.env.SLIDES_CHROMIUM ?? chromium.executablePath()
const digest = value => createHash('sha256').update(value).digest('hex')
const evidence = {
  input, inputSha256: digest(await readFile(input)), executable,
  recordedAt: new Date().toISOString(), checks: [], failures: [], viewports: [],
  externalRequests: [], browserErrors: [],
  rehearsal: { status: 'pending-human-rehearsal', observedDurationSeconds: null,
    explanation: 'An automated walkthrough cannot measure live delivery, transitions or audience pauses.' },
}
await mkdir(output, { recursive: true })
const isolated = await mkdtemp(join(tmpdir(), 'dna-offline-browser-'))
const copied = join(isolated, basename(input))
await copyFile(input, copied)
evidence.portability = { protocol: 'file:', offline: true, companionFiles: await readdir(isolated) }
let browser

function check(name, valid, detail) {
  evidence.checks.push({ name, passed: Boolean(valid), ...(detail === undefined ? {} : { detail }) })
  if (!valid) evidence.failures.push({ name, detail })
}

async function activeIndex(page) {
  return page.locator('#stage .slide').evaluateAll(slides => slides.findIndex(slide => !slide.hidden))
}

async function keyboard(page, key, expected) {
  await page.evaluate(() => document.activeElement?.blur())
  await page.keyboard.press(key)
  assert.equal(await activeIndex(page), expected, `${key}: active slide`)
}

async function notesMatch(page, deck, index) {
  const slide = deck.slides[index]
  const lines = deck.source.text.split('\n')
  const expected = slide.notes.sourceRanges.map(({ start, end }) => lines.slice(start - 1, end).join('\n'))
  const note = page.locator('.slide-notes:not([hidden])')
  assert.equal(await note.getAttribute('data-slide-id'), slide.id)
  assert.deepEqual(await note.locator('.source-passage').allTextContents(), expected)
  assert.deepEqual(await note.locator('.editorial-cues li').allTextContents(), slide.notes.cues ?? [])
}

async function controlsVisible(page) {
  const rectangles = await page.locator('#controls button').evaluateAll(buttons => buttons.map(button => {
    const r = button.getBoundingClientRect()
    return { label: button.textContent, x: r.x, y: r.y, width: r.width, height: r.height,
      visible: r.width > 0 && r.height > 0 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }
  }))
  assert.ok(rectangles.every(rectangle => rectangle.visible), JSON.stringify(rectangles))
  return rectangles
}

// Range rectangles measure actual text lines, independently of card padding/element height.
async function geometry(page) {
  return page.locator('.slide:not([hidden])').evaluate(slide => {
    const rect = r => ({ x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom })
    const stage = rect(document.getElementById('stage').getBoundingClientRect())
    const viewport = rect(document.getElementById('viewport').getBoundingClientRect())
    const scale = stage.width / 1280
    const text = [...slide.querySelectorAll('.audience-text')].map(element => {
      let lines
      if (element instanceof SVGGraphicsElement) {
        // SVG labels are single real-text lines; getBBox excludes padding and shapes.
        const bbox = element.getBBox()
        const matrix = element.getScreenCTM()
        const corners = [new DOMPoint(bbox.x, bbox.y), new DOMPoint(bbox.x + bbox.width, bbox.y + bbox.height)]
          .map(point => point.matrixTransform(matrix))
        lines = [{ x: corners[0].x, y: corners[0].y, width: corners[1].x - corners[0].x,
          height: corners[1].y - corners[0].y, right: corners[1].x, bottom: corners[1].y }]
      } else {
        const range = document.createRange()
        range.selectNodeContents(element)
        lines = [...range.getClientRects()].filter(r => r.width && r.height).map(rect)
      }
      const fontSize = parseFloat(getComputedStyle(element).fontSize)
      return { text: element.textContent.trim(), tag: element.tagName, logicalFontSize: fontSize,
        effectiveFontSize: fontSize * scale, lineCount: new Set(lines.map(line => Math.round(line.y * 100) / 100)).size, lines }
    })
    const shapes = [...slide.querySelectorAll('svg .node, svg .edge')].map(element => ({
      tag: element.tagName, kind: element.classList.contains('node') ? 'node' : 'edge', bounds: rect(element.getBoundingClientRect()), svg: rect(element.ownerSVGElement.getBoundingClientRect()),
    }))
    const diagramLabels = [...slide.querySelectorAll('svg text')].map(element => ({ text: element.textContent, bounds: rect(element.getBoundingClientRect()), svg: rect(element.ownerSVGElement.getBoundingClientRect()) }))
    return { slideId: slide.dataset.slideId, layout: slide.dataset.layout, stage, viewport, scale, text, shapes, diagramLabels,
      renderedLineCount: text.reduce((count, item) => count + item.lineCount, 0) }
  })
}

function verifyGeometry(metric, label) {
  const inside = (r, parent) => r.x >= parent.x - 1 && r.y >= parent.y - 1 && r.right <= parent.right + 1 && r.bottom <= parent.bottom + 1
  const overlaps = (a, b) => Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1
  check(`${label}: audience font minimum`, metric.text.every(item => item.logicalFontSize >= 40), metric.text.map(item => ({ text: item.text, logical: item.logicalFontSize, effective: item.effectiveFontSize })))
  check(`${label}: at most six rendered lines`, metric.renderedLineCount <= 6, metric.renderedLineCount)
  check(`${label}: audience text inside stage and viewport`, metric.text.every(item => item.lines.every(line => inside(line, metric.stage) && inside(line, metric.viewport))))
  const collisions = []
  for (let i = 0; i < metric.text.length; i++) for (let j = i + 1; j < metric.text.length; j++) {
    if (metric.text[i].lines.some(a => metric.text[j].lines.some(b => overlaps(a, b)))) collisions.push([metric.text[i].text, metric.text[j].text])
  }
  check(`${label}: audience text does not overlap`, collisions.length === 0, collisions)
  check(`${label}: SVG labels do not clip`, metric.diagramLabels.every(item => inside(item.bounds, item.svg) && inside(item.bounds, metric.stage)))
  check(`${label}: SVG nodes and arrows do not clip`, metric.shapes.every(item => inside(item.bounds, item.svg) && inside(item.bounds, metric.stage)))
  const boxes = metric.shapes.filter(item => item.kind === 'node' && item.tag === 'rect')
  const boxCollisions = []
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    if (overlaps(boxes[i].bounds, boxes[j].bounds)) boxCollisions.push([i, j])
  }
  check(`${label}: sibling diagram boxes do not overlap`, boxCollisions.length === 0, boxCollisions)
  // The ellipse deliberately contains role boxes; labels may sit inside their own box,
  // but a label crossing a box edge would reveal inadequate space around the text.
  const labelsCrossingBoxEdges = metric.diagramLabels.flatMap(item => boxes
    .filter(box => overlaps(item.bounds, box.bounds) && !inside(item.bounds, box.bounds))
    .map(box => ({ text: item.text, textBounds: item.bounds, boxBounds: box.bounds })))
  check(`${label}: diagram labels do not cross box edges`, labelsCrossingBoxEdges.length === 0, labelsCrossingBoxEdges)
}

async function exerciseBehavior(page, deck) {
  const count = deck.slides.length
  assert.equal(await activeIndex(page), 0)
  assert.equal(await page.locator('#notes-panel').isVisible(), false)
  assert.equal(await page.locator('#notes-toggle').getAttribute('aria-expanded'), 'false')
  assert.equal(await page.locator('#previous').isDisabled(), true)
  assert.equal(await page.locator('#next').isEnabled(), count > 1)
  await page.locator('#next').click()
  assert.equal(await activeIndex(page), 1)
  await page.locator('#previous').click()
  assert.equal(await activeIndex(page), 0)
  for (const key of ['ArrowRight', 'ArrowDown', 'PageDown', 'Space']) {
    await keyboard(page, 'Home', 0)
    await keyboard(page, key, 1)
  }
  for (const key of ['ArrowLeft', 'ArrowUp', 'PageUp', 'Shift+Space']) {
    await keyboard(page, 'End', count - 1)
    await keyboard(page, key, count - 2)
  }
  await keyboard(page, 'End', count - 1)
  assert.equal(await page.locator('#next').isDisabled(), true)
  await keyboard(page, 'ArrowRight', count - 1)
  await keyboard(page, 'Home', 0)
  await keyboard(page, 'ArrowLeft', 0)
  for (const key of ['Control+ArrowRight', 'Alt+ArrowRight', 'Meta+ArrowRight', 'Control+n', 'Alt+n', 'Meta+n']) {
    await keyboard(page, key, 0)
    assert.equal(await page.locator('#notes-panel').isVisible(), false)
  }
  for (const tag of ['input', 'textarea', 'select', 'div']) {
    await page.evaluate(tag => {
      const element = document.createElement(tag)
      element.id = 'editable-probe'
      if (tag === 'div') { element.contentEditable = 'true'; element.innerHTML = '<span>Editable text</span>' }
      document.body.append(element)
      element.focus()
    }, tag)
    for (const key of ['ArrowRight', 'PageDown', 'Space', 'n', 'Home', 'End']) {
      await page.keyboard.press(key)
      assert.equal(await activeIndex(page), 0, `${tag} ignores ${key}`)
      assert.equal(await page.locator('#notes-panel').isVisible(), false)
    }
    await page.locator('#editable-probe').evaluate(element => element.remove())
  }
  await page.locator('#notes-toggle').click()
  assert.equal(await page.locator('#notes-panel').isVisible(), true)
  assert.equal(await page.locator('#notes-toggle').getAttribute('aria-expanded'), 'true')
  for (let index = 0; index < count; index++) {
    await notesMatch(page, deck, index)
    assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1, 'inactive slide headings are excluded from accessibility queries')
    if (index < count - 1) await page.locator('#next').click()
  }
  await keyboard(page, 'n', count - 1)
  assert.equal(await page.locator('#notes-panel').isVisible(), false)
  await keyboard(page, 'Shift+n', count - 1)
  assert.equal(await page.locator('#notes-panel').isVisible(), true)
  await page.locator('#notes-toggle').click()
  assert.equal(await page.locator('#notes-panel').isVisible(), false)
  await keyboard(page, 'Home', 0)
  // Blur does not reset Chromium's sequential-navigation starting point.
  await page.locator('#notes-toggle').focus()
  await page.keyboard.press('Shift+Tab')
  assert.equal(await page.evaluate(() => document.activeElement.id), 'next')
  const focus = await page.locator('#next').evaluate(button => ({ width: getComputedStyle(button).outlineWidth, style: getComputedStyle(button).outlineStyle, focusVisible: button.matches(':focus-visible') }))
  assert.ok(focus.focusVisible && parseFloat(focus.width) >= 2 && focus.style !== 'none', 'keyboard focus has a visible outline')
  await page.keyboard.press('Space')
  assert.equal(await activeIndex(page), 1, 'focused Next space activates once')
  await page.keyboard.press('Tab')
  assert.equal(await page.evaluate(() => document.activeElement.id), 'notes-toggle')
  await page.keyboard.press('Enter')
  assert.equal(await page.locator('#notes-panel').isVisible(), true)
  await page.keyboard.press('Space')
  assert.equal(await page.locator('#notes-panel').isVisible(), false, 'focused Notes space toggles once')
  await keyboard(page, 'Home', 0)
  await controlsVisible(page)
  check('keyboard, boundaries, buttons, modifiers, editables, exact changing notes and keyboard focus', true)
}

try {
  check('fresh offline directory contains the HTML alone', evidence.portability.companionFiles.length === 1 && evidence.portability.companionFiles[0] === basename(input), evidence.portability.companionFiles)
  browser = await chromium.launch({ executablePath: executable, headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, offline: true, reducedMotion: 'reduce' })
  const page = await context.newPage()
  page.on('request', request => {
    if (!/^(file:|data:)/.test(request.url())) evidence.externalRequests.push(request.url())
  })
  page.on('pageerror', error => evidence.browserErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') evidence.browserErrors.push(message.text()) })
  async function open(path) {
    await page.goto(pathToFileURL(path).href)
    await page.evaluate(async () => {
      await Promise.all([document.fonts.load('800 80px "Barlow Condensed"'), document.fonts.load('400 44px "DM Sans"'), document.fonts.load('700 16px "DM Sans"')])
      await document.fonts.ready
      await Promise.all([...document.images].map(image => image.decode()))
    })
  }
  await open(input)
  const originalScreenshot = await page.screenshot()
  await open(copied)
  const copiedScreenshot = await page.screenshot()
  check('copied HTML alone has identical opener pixels offline', originalScreenshot.equals(copiedScreenshot), { originalSha256: digest(originalScreenshot), copiedSha256: digest(copiedScreenshot) })
  const deck = await page.locator('#deck-data').evaluate(element => JSON.parse(element.textContent))
  evidence.deckId = deck.id
  evidence.rehearsal.plannedDurationSeconds = deck.slides.reduce((total, slide) => total + slide.durationSeconds, 0)
  const sourcePath = resolve(root, deck.source.path)
  check('complete original source digest embedded', digest(deck.source.text) === deck.source.sha256)
  try {
    check('embedded source equals original file byte for byte', Buffer.from(deck.source.text).equals(await readFile(sourcePath)))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    evidence.originalSourceComparison = { status: 'unavailable', path: sourcePath }
  }
  check('DNA acceptance deck has ten slides', deck.slides.length === 10)
  check('all six layout forms exercised', new Set(deck.slides.map(slide => slide.layout)).size === 6)
  const assets = await page.evaluate(() => ({
    fonts: [...document.fonts].map(font => ({ family: font.family, weight: font.weight, status: font.status })),
    logos: [...document.querySelectorAll('.brand-logo')].map(image => ({ complete: image.complete, width: image.naturalWidth, height: image.naturalHeight, embedded: image.src.startsWith('data:image/png;base64,') })),
    diagrams: [...document.querySelectorAll('svg.diagram')].map(svg => ({ role: svg.getAttribute('role'), labels: [...svg.querySelectorAll('.audience-text')].map(element => element.textContent),
      description: svg.querySelector('desc')?.textContent, labelledBy: svg.getAttribute('aria-labelledby')?.split(' ').map(id => document.getElementById(id)?.textContent) })),
  }))
  evidence.assets = assets
  check('three embedded font faces load offline', assets.fonts.length === 3 && assets.fonts.every(font => font.status === 'loaded'))
  check('all embedded logos decode with natural dimensions', assets.logos.length === deck.slides.length && assets.logos.every(logo => logo.embedded && logo.complete && logo.width > 0 && logo.height > 0))
  check('trusted SVG diagrams have accessible descriptions and real text labels', assets.diagrams.length > 0 && assets.diagrams.every(diagram => diagram.role === 'img' && diagram.description && diagram.labelledBy.every(Boolean) && diagram.labels.every(label => diagram.description.includes(label))))
  const cultureSection = deck.source.text.split(/^## Part 3: Culture\s*$/m)[1]?.split(/^## /m)[0] ?? ''
  const culture = cultureSection.split('\n').filter(line => /^[-*] /.test(line))
  evidence.cultureSourceBullets = culture
  if (deck.id === '10-6-dna') check('all four current Culture bullets remain in source notes', culture.length === 4 && culture.every(line => deck.notes.flatMap(note => note.passages).join('\n').includes(line)))
  await exerciseBehavior(page, deck)
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    const name = `${viewport.width}x${viewport.height}`
    const entry = { ...viewport, slides: [], screenshots: [] }
    evidence.viewports.push(entry)
    await keyboard(page, 'Home', 0)
    for (const [index, slide] of deck.slides.entries()) {
      if (index) await keyboard(page, 'ArrowRight', index)
      const metric = await geometry(page)
      entry.slides.push(metric)
      verifyGeometry(metric, `${name} ${slide.id}`)
      assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1)
      const screenshot = `${name}-${String(index + 1).padStart(2, '0')}-${slide.id}.png`
      await page.screenshot({ path: join(output, screenshot) })
      entry.screenshots.push(screenshot)
    }
    entry.controls = await controlsVisible(page)
    // Slide 5 has a long source passage, so this demonstrates real notes scrolling.
    await keyboard(page, 'Home', 0)
    for (let i = 1; i < 5; i++) await keyboard(page, 'ArrowRight', i)
    await page.locator('#notes-toggle').click()
    await notesMatch(page, deck, 4)
    const noteScroll = await page.locator('#notes-panel').evaluate(panel => {
      panel.scrollTop = panel.scrollHeight
      return { clientHeight: panel.clientHeight, scrollHeight: panel.scrollHeight, scrollTop: panel.scrollTop, overflowY: getComputedStyle(panel).overflowY }
    })
    check(`${name}: notes scroll without hiding controls`, noteScroll.scrollHeight > noteScroll.clientHeight && noteScroll.scrollTop > 0 && ['auto', 'scroll'].includes(noteScroll.overflowY), noteScroll)
    entry.notesControls = await controlsVisible(page)
    entry.notesOpenSlide = await geometry(page)
    verifyGeometry(entry.notesOpenSlide, `${name} notes-open momentum`)
    entry.notesScreenshot = `${name}-notes-scrolled.png`
    await page.screenshot({ path: join(output, entry.notesScreenshot) })
    await page.locator('#next').click()
    await notesMatch(page, deck, 5)
    assert.equal(await page.locator('#notes-panel').evaluate(panel => panel.scrollTop), 0)
    await page.locator('#notes-toggle').click()
  }
  check('offline copied file makes no external requests', evidence.externalRequests.length === 0, evidence.externalRequests)
  check('browser reports no JavaScript or resource errors', evidence.browserErrors.length === 0, evidence.browserErrors)
  await context.close()
} catch (error) {
  evidence.failures.push({ name: 'browser verification interrupted', detail: error.stack })
} finally {
  await browser?.close()
  await rm(isolated, { recursive: true, force: true })
  evidence.status = evidence.failures.length ? 'failed' : 'passed'
  await writeFile(join(output, 'report.json'), `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(`${evidence.status}: ${evidence.checks.length} checks; ${evidence.failures.length} failures; ${output}/report.json`)
  for (const failure of evidence.failures) console.error(`${failure.name}: ${JSON.stringify(failure.detail)}`)
  console.log('Live rehearsal: pending; planned timing is not an observed duration.')
  process.exitCode = evidence.failures.length ? 1 : 0
}
