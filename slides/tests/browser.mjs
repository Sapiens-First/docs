import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'
import { renderDeck } from '../slides.mjs'

// Run from the repository root; the optional arguments are HTML and evidence directory.
const root = fileURLToPath(new URL('../../', import.meta.url))
const input = resolve(process.argv[2] ?? join(root, 'slides/output/10-6-dna.html'))
const notesInput = input.replace(/\.html$/i, '') + '.notes.html'
const output = resolve(process.argv[3] ?? join(root, 'slides/output/browser-evidence'))
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

// Slides with highlightStep reveal a part on an extra Next press before the deck moves on.
const stepsOf = slide => slide?.content?.highlightStep ? 1 : 0

// Press Next from slide index-1 (at its first step) until slide index is active.
async function forward(page, deck, index) {
  const presses = 1 + stepsOf(deck.slides[index - 1])
  for (let press = 1; press < presses; press++) await keyboard(page, 'ArrowRight', index - 1)
  await keyboard(page, 'ArrowRight', index)
}

async function notesMatch(page, deck, index) {
  const slide = deck.slides[index]
  const lines = deck.source.text.split('\n')
  const expected = slide.notes.sourceRanges.map(({ start, end }) => lines.slice(start - 1, end).join('\n'))
  await page.waitForFunction(id => document.querySelector('.slide-notes:not([hidden])')?.dataset.slideId === id, slide.id)
  const note = page.locator('.slide-notes:not([hidden])')
  assert.equal(await note.getAttribute('data-slide-id'), slide.id)
  assert.deepEqual(await note.locator('.source-passage').allTextContents(), expected)
  assert.deepEqual(await note.locator('.editorial-cues li').allTextContents(), slide.notes.cues ?? [])
}

async function controlsVisible(page) {
  const rectangles = await page.locator('nav button, nav a, nav select').evaluateAll(buttons => buttons.map(button => {
    const r = button.getBoundingClientRect()
    return { label: button.textContent, x: r.x, y: r.y, width: r.width, height: r.height,
      visible: r.width > 0 && r.height > 0 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }
  }))
  assert.ok(rectangles.length > 0 && rectangles.every(rectangle => rectangle.visible), JSON.stringify(rectangles))
  return rectangles
}

// Derive the acceptance text from the deck independently of renderer helpers.
function authoredText(slide) {
  const content = slide.content
  const treeLabels = []
  function visit(node) {
    if (content.reveal.includes(node.id)) treeLabels.push(node.label)
    for (const child of node.children ?? []) visit(child)
  }
  if (slide.layout === 'tree') visit(content.tree)
  return [slide.title, slide.sectionLabel, ...(content.lines ?? content.labels ?? []), ...(content.descriptions ?? content.stages ?? []), ...(slide.layout === 'actions' ? content.links : []),
    content.circle, ...(content.roles ?? []), ...treeLabels, content.caption].filter(value => value !== undefined)
    .map(value => value.trim()).sort()
}

function verifyAuthoredText(metric, slide, label) {
  const expected = authoredText(slide), rendered = metric.text.map(item => item.text).sort()
  check(`${label}: every authored audience string renders exactly once`,
    JSON.stringify(expected) === JSON.stringify(rendered), { expected, rendered })
  if (slide.layout === 'cycle') {
    const expectedLinks = slide.content.labels.map((from, index) => ({ from, to: slide.content.labels[(index + 1) % slide.content.labels.length] }))
    check(`${label}: cycle arrows touch nodes and follow the authored loop`, metric.cycleLinks.length === expectedLinks.length &&
      expectedLinks.every(link => metric.cycleLinks.some(actual => actual.from === link.from && actual.to === link.to)), { expected: expectedLinks, actual: metric.cycleLinks })
  }
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
      const matrix = element instanceof SVGGraphicsElement ? element.getScreenCTM() : null
      const logicalFontSize = matrix ? fontSize * Math.hypot(matrix.a, matrix.b) / scale : fontSize
      return { text: element.textContent.trim(), secondary: element.classList.contains('statement-date'), tag: element.tagName, logicalFontSize,
        effectiveFontSize: logicalFontSize * scale, lineCount: new Set(lines.map(line => Math.round(line.y * 100) / 100)).size, lines }
    })
    const shapes = [...slide.querySelectorAll('svg .node, svg .edge, .tree-node rect, .tree-edge')].map(element => ({
      tag: element.tagName, kind: element.classList.contains('node') || element.tagName === 'rect' ? 'node' : 'edge', bounds: rect(element.getBoundingClientRect()), svg: rect(element.ownerSVGElement.getBoundingClientRect()),
    }))
    const diagramLabels = [...slide.querySelectorAll('svg text')].map(element => ({ text: element.textContent, bounds: rect(element.getBoundingClientRect()), svg: rect(element.ownerSVGElement.getBoundingClientRect()) }))
    const roleContainment = []
    if (slide.dataset.layout === 'roles') for (const ellipse of slide.querySelectorAll('svg ellipse.node')) {
      const cx = ellipse.cx.baseVal.value, cy = ellipse.cy.baseVal.value
      const rx = ellipse.rx.baseVal.value, ry = ellipse.ry.baseVal.value
      for (const box of ellipse.ownerSVGElement.querySelectorAll('rect.node')) {
        const bbox = box.getBBox()
        const localToEllipse = ellipse.getCTM().inverse().multiply(box.getCTM())
        const corners = [[bbox.x, bbox.y], [bbox.x + bbox.width, bbox.y],
          [bbox.x, bbox.y + bbox.height], [bbox.x + bbox.width, bbox.y + bbox.height]]
          .map(([x, y]) => new DOMPoint(x, y).matrixTransform(localToEllipse))
        roleContainment.push({ corners: corners.map(({ x, y }) => ({ x, y,
          normalizedDistance: ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 })) })
      }
    }
    const cycleLinks = []
    if (slide.dataset.layout === 'cycle') {
      const boxes = [...slide.querySelectorAll('svg rect.node')].map(box => {
        const bounds = box.getBoundingClientRect()
        const label = [...slide.querySelectorAll('svg .audience-text')].find(text => {
          const r = text.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2
          return x > bounds.left && x < bounds.right && y > bounds.top && y < bounds.bottom
        })?.textContent
        return { bounds, label }
      })
      const touching = point => boxes.find(({ bounds }) => {
        const tolerance = 6 * scale
        return point.x >= bounds.left - tolerance && point.x <= bounds.right + tolerance &&
          point.y >= bounds.top - tolerance && point.y <= bounds.bottom + tolerance &&
          Math.min(Math.abs(point.x - bounds.left), Math.abs(point.x - bounds.right), Math.abs(point.y - bounds.top), Math.abs(point.y - bounds.bottom)) <= tolerance
      })?.label
      for (const path of slide.querySelectorAll('svg path.edge')) {
        const pointAt = length => path.getPointAtLength(length).matrixTransform(path.getScreenCTM())
        cycleLinks.push({ from: touching(pointAt(0)), to: touching(pointAt(path.getTotalLength())) })
      }
    }
    const photos = [...slide.querySelectorAll('.slide-photo')].map(image => ({ ...rect(image.getBoundingClientRect()), background: ['background', 'artistic'].includes(slide.dataset.imageTreatment) }))
    const cardText = [...slide.querySelectorAll('.values li, .action-cards li')].map(card => ({ bounds: rect(card.getBoundingClientRect()),
      text: text.filter(item => [...card.querySelectorAll('.audience-text')].some(element => element.textContent.trim() === item.text)) }))
    let circleMap
    if (slide.dataset.layout === 'circles') {
      const parent = slide.querySelector('ellipse.circle-parent')
      const children = [...slide.querySelectorAll('circle.subcircle')]
      const pips = [...slide.querySelectorAll('circle.role-pip')]
      if (parent) {
        const cx = parent.cx.baseVal.value, cy = parent.cy.baseVal.value, rx = parent.rx.baseVal.value, ry = parent.ry.baseVal.value
        const childMetrics = children.map(circle => {
          const x = circle.cx.baseVal.value, y = circle.cy.baseVal.value, radius = circle.r.baseVal.value
          // Sample the actual circumference, rather than a rectangular bounding box.
          const parentDistance = Array.from({ length: 72 }, (_, index) => {
            const angle = index * 2 * Math.PI / 72
            const point = new DOMPoint(x + radius * Math.cos(angle), y + radius * Math.sin(angle))
              .matrixTransform(parent.getCTM().inverse().multiply(circle.getCTM()))
            return ((point.x - cx) / rx) ** 2 + ((point.y - cy) / ry) ** 2
          })
          const labels = [...slide.querySelectorAll('svg .audience-text')].flatMap(text => {
            const box = text.getBBox(), matrix = circle.getCTM().inverse().multiply(text.getCTM())
            const center = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2).matrixTransform(matrix)
            if ((center.x - x) ** 2 + (center.y - y) ** 2 > radius ** 2) return []
            const corners = [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]]
              .map(([px, py]) => new DOMPoint(px, py).matrixTransform(matrix))
            return [{ text: text.textContent, contained: corners.every(point => (point.x - x) ** 2 + (point.y - y) ** 2 <= radius ** 2) }]
          })
          return { center: { x, y }, radius, maxParentDistance: Math.max(...parentDistance), labels }
        })
        const pipMetrics = pips.map(pip => ({ contained: children.some(circle => {
          const point = new DOMPoint(pip.cx.baseVal.value, pip.cy.baseVal.value).matrixTransform(circle.getCTM().inverse().multiply(pip.getCTM()))
          return Math.hypot(point.x - circle.cx.baseVal.value, point.y - circle.cy.baseVal.value) + pip.r.baseVal.value <= circle.r.baseVal.value
        }) }))
        circleMap = { children: childMetrics, pips: pipMetrics }
      }
    }
    const progress = slide.querySelector('.section-progress')
    const sectionProgress = progress ? { bounds: rect(progress.getBoundingClientRect()), active: progress.querySelector('[aria-current="step"]')?.dataset.section,
      segments: [...progress.querySelectorAll('.progress-seg')].map(segment => ({ section: segment.dataset.section, fill: parseFloat(segment.style.getPropertyValue('--fill')), bounds: rect(segment.getBoundingClientRect()) })),
      footerItems: [...slide.querySelectorAll('.slide-footer > *')].map(element => rect(element.getBoundingClientRect())) } : null
    const footerItems = [...slide.querySelectorAll('.slide-footer > *')].map(element => rect(element.getBoundingClientRect()))
    const tree = [...slide.querySelectorAll('.tree-node')].map(node => ({ id: node.dataset.node, current: node.dataset.current === 'true', dim: node.dataset.dim === 'true', bounds: rect(node.querySelector('rect').getBoundingClientRect()) }))
    const treeEdges = [...slide.querySelectorAll('.tree-edge')].map(edge => {
      const touching = (point, id) => {
        const bounds = tree.find(node => node.id === id).bounds
        const tolerance = 3 * scale
        return point.x >= bounds.x - tolerance && point.x <= bounds.right + tolerance && point.y >= bounds.y - tolerance && point.y <= bounds.bottom + tolerance && Math.min(Math.abs(point.x - bounds.x), Math.abs(point.x - bounds.right), Math.abs(point.y - bounds.y), Math.abs(point.y - bounds.bottom)) <= tolerance
      }
      const first = edge.getPointAtLength(0).matrixTransform(edge.getScreenCTM())
      const last = edge.getPointAtLength(edge.getTotalLength()).matrixTransform(edge.getScreenCTM())
      return { parent: edge.dataset.parent, child: edge.dataset.child, touchesParent: touching(first, edge.dataset.parent), touchesChild: touching(last, edge.dataset.child) }
    })
    return { slideId: slide.dataset.slideId, layout: slide.dataset.layout, stage, viewport, scale, text, shapes, diagramLabels, roleContainment, cycleLinks, photos, cardText, circleMap, sectionProgress, footerItems, tree, treeEdges,
      renderedLineCount: text.reduce((count, item) => count + item.lineCount, 0) }
  })
}

function verifyGeometry(metric, label) {
  const inside = (r, parent) => r.x >= parent.x - 1 && r.y >= parent.y - 1 && r.right <= parent.right + 1 && r.bottom <= parent.bottom + 1
  const overlaps = (a, b) => Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1
  check(`${label}: principal audience font minimum and secondary date`, metric.text.every(item => item.logicalFontSize >= (item.secondary ? 22 : 40) - 0.01), metric.text.map(item => ({ text: item.text, logical: item.logicalFontSize, effective: item.effectiveFontSize })))
  // Tree exceptions are explicit in the deck; all visible tree labels still undergo
  // the same font, bounds, collision and box-containment checks as other diagrams.
  const allowedLines = { 'tree-goal': 5, 'tree-california': 8, 'tree-bay': 13, 'agenda-six': 7, vision: 8, crisis: 8, 'culture-values': 17, 'movement-action-plan': 10, 'circles': 7, 'next-step': 20 }[metric.slideId] ?? 6
  check(`${label}: rendered lines respect the slide budget`, metric.renderedLineCount <= allowedLines, { actual: metric.renderedLineCount, allowed: allowedLines })
  check(`${label}: audience text inside stage and viewport`, metric.text.every(item => item.lines.every(line => inside(line, metric.stage) && inside(line, metric.viewport))))
  const collisions = []
  for (let i = 0; i < metric.text.length; i++) for (let j = i + 1; j < metric.text.length; j++) {
    if (metric.text[i].lines.some(a => metric.text[j].lines.some(b => overlaps(a, b)))) collisions.push([metric.text[i].text, metric.text[j].text])
  }
  check(`${label}: audience text does not overlap`, collisions.length === 0, collisions)
  check(`${label}: audience text stays clear of the footer`, metric.text.every(item => item.lines.every(line => metric.footerItems.every(footer => !overlaps(line, footer)))))
  if (metric.cardText.length) check(`${label}: all card text fits its own card`, metric.cardText.every(card => card.text.every(item => item.lines.every(line => inside(line, card.bounds)))))
  if (metric.photos.length) {
    check(`${label}: photos remain inside stage and viewport`, metric.photos.every(photo => inside(photo, metric.stage) && inside(photo, metric.viewport)), metric.photos)
    check(`${label}: foreground photos do not obscure audience text`, metric.photos.filter(photo => !photo.background).every(photo => metric.text.every(item => item.lines.every(line => !overlaps(photo, line)))))
  }
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
  if (metric.sectionProgress) {
    const p = metric.sectionProgress
    check(`${label}: section progress and footer fit without overlap`, inside(p.bounds, metric.stage) && inside(p.bounds, metric.viewport) && p.footerItems.every((a, index) => p.footerItems.slice(index + 1).every(b => !overlaps(a, b))), p)
  }
  if (metric.layout === 'roles') check(`${label}: role box corners fit actual enclosing ellipse`,
    metric.roleContainment.length >= 2 && metric.roleContainment.every(box => box.corners.every(corner => corner.normalizedDistance <= 1)), metric.roleContainment)
  if (metric.layout === 'circles') {
    check(`${label}: four child circles fit inside the actual parent ellipse`, metric.circleMap?.children.length === 4 && metric.circleMap.children.every(child => child.maxParentDistance <= 1), metric.circleMap)
    check(`${label}: each circle contains its own readable label`, metric.circleMap?.children.every(child => child.labels.length === 1 && child.labels.every(label => label.contained)), metric.circleMap?.children)
    check(`${label}: role markers belong inside child circles`, metric.circleMap?.pips.length > 0 && metric.circleMap.pips.every(pip => pip.contained), metric.circleMap?.pips)
    const children = metric.circleMap?.children ?? []
    check(`${label}: sibling circles stay distinct`, children.length === 4 && children.every((a, index) => children.slice(index + 1)
      .every(b => Math.hypot(a.center.x - b.center.x, a.center.y - b.center.y) >= a.radius + b.radius)))
  }
}

async function exerciseBehavior(page, deck) {
  const count = deck.slides.length, context = page.context(), initialPages = context.pages().length
  assert.equal(await activeIndex(page), 0)
  assert.equal(await page.locator('#notes-panel, #notes-toggle, .slide-notes').count(), 0)
  assert.equal(await page.locator('#notes-link').getAttribute('target'), '_blank')
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
    assert.equal(context.pages().length, initialPages, 'modified keys do not open notes')
  }
  for (const tag of ['input', 'textarea', 'select', 'div']) {
    await page.evaluate(tag => {
      const element = document.createElement(tag)
      element.id = 'editable-probe'
      if (tag === 'div') { element.contentEditable = 'true'; element.innerHTML = '<span>Editable text</span>' }
      document.body.append(element)
      element.focus()
    }, tag)
    for (const key of ['ArrowRight', 'PageDown', 'Space', 'n', 'p', 'Home', 'End']) {
      await page.keyboard.press(key)
      assert.equal(await activeIndex(page), 0, `${tag} ignores ${key}`)
      assert.equal(context.pages().length, initialPages, `${tag} does not open presenter notes`)
      assert.equal(await page.locator('body').evaluate(body => body.classList.contains('presenting')), false, `${tag} does not hide presentation controls`)
    }
    await page.locator('#editable-probe').evaluate(element => element.remove())
  }
  await page.locator('#notes-link').focus()
  await page.keyboard.press('Shift+Tab')
  assert.equal(await page.evaluate(() => document.activeElement.id), 'next')
  const focus = await page.locator('#next').evaluate(button => ({ width: getComputedStyle(button).outlineWidth, style: getComputedStyle(button).outlineStyle, focusVisible: button.matches(':focus-visible') }))
  assert.ok(focus.focusVisible && parseFloat(focus.width) >= 2 && focus.style !== 'none', 'keyboard focus has a visible outline')
  await page.keyboard.press('Space')
  assert.equal(await activeIndex(page), 1, 'focused Next space activates once')
  await page.keyboard.press('Tab')
  assert.equal(await page.evaluate(() => document.activeElement.id), 'notes-link')
  const opening = page.waitForEvent('popup')
  await page.keyboard.press('Enter')
  let presenter = await opening
  await presenter.waitForLoadState()
  await notesMatch(presenter, deck, 1)
  const livePages = context.pages().length
  const extraPopup = page.waitForEvent('popup', { timeout: 300 }).then(() => true, error => {
    if (error.name !== 'TimeoutError') throw error
    return false
  })
  await page.locator('#notes-link').click()
  assert.equal(await extraPopup, false, 'clicking the link again reuses the live presenter window')
  assert.equal(context.pages().length, livePages)
  await notesMatch(presenter, deck, 1)
  for (let index = 0; index < count; index++) {
    if (!index) await keyboard(page, 'Home', 0)
    else await forward(page, deck, index)
    await notesMatch(presenter, deck, index)
    assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1)
  }
  await presenter.locator('#previous').click()
  await page.waitForFunction(expected => [...document.querySelectorAll('#stage .slide')].findIndex(slide => !slide.hidden) === expected, count - 2)
  await notesMatch(presenter, deck, count - 2)
  await presenter.locator('#slide-select').selectOption('2')
  await page.waitForFunction(() => [...document.querySelectorAll('#stage .slide')].findIndex(slide => !slide.hidden) === 2)
  await notesMatch(presenter, deck, 2)
  await page.evaluate(deckId => window.dispatchEvent(new MessageEvent('message', {
    source: window, data: { type: 'sapiens-navigate', deckId, index: 0 },
  })), deck.id)
  assert.equal(await activeIndex(page), 2, 'unrelated windows cannot navigate the audience')
  await presenter.evaluate(deckId => {
    for (const [source, id, index] of [[window, deckId, 0], [window.opener, 'other-deck', 0], [window.opener, deckId, -1], [window.opener, deckId, 9999]]) {
      window.dispatchEvent(new MessageEvent('message', { source, data: { type: 'sapiens-slide', deckId: id, index } }))
    }
  }, deck.id)
  await notesMatch(presenter, deck, 2)
  check('presenter synchronization rejects unrelated windows, other decks and invalid indices', true)
  await presenter.close()
  const reopening = page.waitForEvent('popup')
  await page.locator('#notes-link').click()
  presenter = await reopening
  await presenter.waitForLoadState()
  await notesMatch(presenter, deck, 2)
  await presenter.close()
  const keyboardOpening = page.waitForEvent('popup')
  await keyboard(page, 'n', 2)
  presenter = await keyboardOpening
  await presenter.waitForLoadState()
  await notesMatch(presenter, deck, 2)
  await keyboard(page, 'Home', 0)
  await notesMatch(presenter, deck, 0)
  await page.locator('#present').click()
  check('Present hides controls and uses the whole viewport', !(await page.locator('#controls').isVisible()) && await page.locator('#viewport').evaluate(viewport => viewport.clientHeight === innerHeight))
  await keyboard(page, 'ArrowRight', 1)
  await notesMatch(presenter, deck, 1)
  check('presentation mode keeps keyboard navigation and notes in sync', true)
  await page.keyboard.press('Escape')
  check('Escape restores controls and keyboard focus without changing the slide', await page.locator('#controls').isVisible() && await activeIndex(page) === 1 && await page.evaluate(() => document.activeElement.id === 'present'))
  await keyboard(page, 'p', 1)
  check('P enters presentation mode without navigating', !(await page.locator('#controls').isVisible()) && await page.locator('#present').getAttribute('aria-pressed') === 'true')
  await keyboard(page, 'p', 1)
  check('P restores presentation controls without navigating', await page.locator('#controls').isVisible() && await page.locator('#present').getAttribute('aria-pressed') === 'false')
  await keyboard(page, 'Home', 0)
  await controlsVisible(page)
  check('audience keyboard, buttons, boundaries, modifiers, editables and focus', true)
  check('separate notes link and N shortcut open, synchronize both ways, and reconnect after closing', true)
  return presenter
}

try {
  check('fresh offline directory contains the HTML alone', evidence.portability.companionFiles.length === 1 && evidence.portability.companionFiles[0] === basename(input), evidence.portability.companionFiles)
  browser = await chromium.launch({ executablePath: executable, headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, offline: true, reducedMotion: 'reduce' })
  const page = await context.newPage()
  context.on('request', request => {
    if (!/^(file:|data:)/.test(request.url())) evidence.externalRequests.push(request.url())
  })
  context.on('page', observed => {
    observed.on('pageerror', error => evidence.browserErrors.push(error.message))
    observed.on('console', message => { if (message.type() === 'error') evidence.browserErrors.push(message.text()) })
  })
  page.on('pageerror', error => evidence.browserErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') evidence.browserErrors.push(message.text()) })
  async function open(path, target = page) {
    await target.goto(pathToFileURL(path).href)
    await target.evaluate(async () => {
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
  const audienceDeck = await page.locator('#deck-data').evaluate(element => JSON.parse(element.textContent))
  check('audience file contains no private source, notes or editorial cues', !audienceDeck.source && !audienceDeck.notes && audienceDeck.slides.every(slide => !slide.notes) && await page.locator('.source-passage, .editorial-cues, .slide-notes, #notes-panel').count() === 0)
  const copiedNotes = join(isolated, basename(notesInput))
  await copyFile(notesInput, copiedNotes)
  evidence.portability.presenterCompanionFiles = await readdir(isolated)
  const notesPage = await context.newPage()
  await open(copiedNotes, notesPage)
  const reference = notesPage.locator('.reference-image')
  check('restored movement figure is an audience image rather than a notes-only reference', await reference.count() === 0 && await page.locator('.slide[data-slide-id="movement-action-plan"] .slide-photo').evaluate(image => image.complete && image.naturalWidth > 0 && image.src.startsWith('data:image/')))
  const deck = await notesPage.locator('#deck-data').evaluate(element => JSON.parse(element.textContent))
  check('separate notes opens directly with standalone navigation', await notesPage.evaluate(() => !window.opener))
  await notesPage.locator('#next').click()
  await notesMatch(notesPage, deck, 1)
  await notesPage.locator('#slide-select').selectOption('0')
  await notesMatch(notesPage, deck, 0)
  check('standalone presenter manual navigation works offline', true)
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
  check('DNA acceptance deck renders all twenty-four slides', deck.slides.length === 24 && await page.locator('#stage .slide').count() === 24)
  check('revision two narrative order', JSON.stringify(deck.slides.map(slide => slide.id)) === JSON.stringify(['opening', 'agenda', 'story-section', 'technology', 'vision', 'crisis', 'strategy-section', 'tree-goal', 'tree-california', 'tree-bay', 'momentum', 'trigger-birmingham', 'trigger-vietnam', 'movement-action-plan', 'participation-threshold', 'chapter-question', 'culture-section', 'culture-values', 'structure-section', 'participation', 'ownership-principles', 'circles', 'roles', 'next-step']))
  const layouts = ['statement', 'triad', 'cycle', 'question', 'steps', 'roles', 'divider', 'impact', 'values', 'pair', 'circles', 'choice', 'photo', 'figure', 'actions', 'agenda', 'tree']
  check('all current deck layout forms exercised', layouts.every(layout => deck.slides.some(slide => slide.layout === layout) && audienceDeck.slides.some(slide => slide.layout === layout)))
  const dividerIds = await page.locator('#stage .slide[data-layout="divider"]').evaluateAll(slides => slides.map(slide => slide.dataset.slideId))
  check('four section dividers render in narrative order', JSON.stringify(dividerIds) === JSON.stringify(['story-section', 'strategy-section', 'culture-section', 'structure-section']), dividerIds)
  const threshold = await page.locator('.slide[data-slide-id="participation-threshold"] h1').evaluate(title => ({ text: title.textContent, fontSize: parseFloat(getComputedStyle(title).fontSize) }))
  check('participation threshold has a large standalone 3.5% heading', threshold.text === '3.5%' && threshold.fontSize >= 200, threshold)
  const revisions = await page.evaluate(() => {
    const opening = document.querySelector('.slide[data-slide-id="opening"]')
    const logo = opening.querySelector('.brand-logo')
    const canvas = document.createElement('canvas')
    canvas.width = logo.naturalWidth; canvas.height = logo.naturalHeight
    const context = canvas.getContext('2d'); context.drawImage(logo, 0, 0)
    const promise = document.querySelector('.slide[data-slide-id="vision"]')
    promise.hidden = false
    const cards = [...promise.querySelectorAll('.triad li')].map(card => {
      const r = card.getBoundingClientRect(); return { top: r.top, left: r.left, right: r.right }
    })
    promise.hidden = true
    return {
      transparentLogo: context.getImageData(0, 0, 1, 1).data[3] === 0 && getComputedStyle(logo).backgroundColor === 'rgba(0, 0, 0, 0)',
      background: opening.dataset.imageTreatment === 'background' && Boolean(opening.querySelector('.photo-overlay')),
      cards,
      openingBadge: opening.querySelector('.statement-badge')?.textContent,
      openingDate: opening.querySelector('.statement-date')?.textContent,
      badgeStyle: (() => {
        const style = getComputedStyle(opening.querySelector('.statement-badge'))
        return { fill: style.backgroundColor, border: style.borderTopWidth, transform: style.transform, shadow: style.boxShadow, size: parseFloat(style.fontSize), casing: style.textTransform }
      })(),
      dateSize: parseFloat(getComputedStyle(opening.querySelector('.statement-date')).fontSize),
      crisis: [...document.querySelectorAll('.slide[data-slide-id="crisis"] .triad li')].map(item => item.className),
      crisisSteps: document.querySelector('.slide[data-slide-id="crisis"]').dataset.steps,
      triggerPhotos: ['trigger-birmingham', 'trigger-vietnam'].map(id => document.querySelectorAll(`.slide[data-slide-id="${id}"] .slide-photo`).length),
      movementImages: document.querySelectorAll('.slide[data-slide-id="movement-action-plan"][data-layout="figure"] .slide-photo').length,
      favicon: Boolean(document.querySelector('link[rel="icon"]')),
      dividerMotifs: [...document.querySelectorAll('.slide[data-layout="divider"] .divider-art')].map(svg => svg.dataset.graphic),
    }
  })
  check('logo preserves PNG transparency without a CSS background', revisions.transparentLogo)
  check('opening uses the requested background photo with a contrast overlay', revisions.background)
  check('three AI promise cards form a horizontal row', revisions.cards.length === 3 && revisions.cards.every(card => Math.abs(card.top - revisions.cards[0].top) < 1) && revisions.cards.slice(1).every((card, index) => card.left > revisions.cards[index].right), revisions.cards)
  check('opening uses a plain training subtitle and short date', revisions.openingBadge === 'Sapiens First: Our DNA' && revisions.openingDate === '10/09/26' && revisions.dateSize === 36 && revisions.badgeStyle.fill === 'rgba(0, 0, 0, 0)' && revisions.badgeStyle.border === '0px' && revisions.badgeStyle.transform === 'none' && revisions.badgeStyle.shadow === 'none' && revisions.badgeStyle.size === 48 && revisions.badgeStyle.casing === 'none')
  check('crisis lights human extinction and dims the other two, revealed on one extra step', revisions.crisisSteps === '1' && JSON.stringify(revisions.crisis) === JSON.stringify(['is-lit', 'is-dim', 'is-dim']))
  check('Birmingham and Vietnam trigger slides each show a single photograph', JSON.stringify(revisions.triggerPhotos) === JSON.stringify([1, 1]))
  check('Movement Action Plan shows the original supplied figure', revisions.movementImages === 1)
  const closingLinks = await page.locator('.slide[data-slide-id="next-step"] .action-link').evaluateAll(links => links.map(link => ({ href: link.getAttribute('href'), target: link.target, rel: link.rel })))
  check('closing actions link to the authored destinations in separate tabs', JSON.stringify(closingLinks) === JSON.stringify(deck.slides.find(slide => slide.id === 'next-step').content.links.map(link => ({ href: `https://${link}`, target: '_blank', rel: 'noopener' }))))
  check('audience page declares a favicon', revisions.favicon)
  check('all section dividers have topical motifs', JSON.stringify(revisions.dividerMotifs) === JSON.stringify(['book', 'route', 'hands', 'nested']))
  const assets = await page.evaluate(() => ({
    fonts: [...document.fonts].map(font => ({ family: font.family, weight: font.weight, status: font.status })),
    logos: [...document.querySelectorAll('.brand-logo')].map(image => ({ complete: image.complete, width: image.naturalWidth, height: image.naturalHeight, embedded: image.src.startsWith('data:image/png;base64,') })),
    photos: [...document.querySelectorAll('.slide-photo')].map(image => ({ slideId: image.closest('.slide').dataset.slideId,
      alt: image.alt, complete: image.complete, width: image.naturalWidth, height: image.naturalHeight, embedded: /^data:image\/(?:jpeg|png|webp|svg\+xml);base64,/.test(image.src) })),
    artwork: [...document.querySelectorAll('.brand-art')].map(image => ({ slideId: image.closest('.slide').dataset.slideId,
      complete: image.complete, width: image.naturalWidth, height: image.naturalHeight, embedded: image.src.startsWith('data:image/svg+xml;base64,'), decorative: image.getAttribute('aria-hidden') === 'true' })),
    diagrams: [...document.querySelectorAll('svg.diagram')].map(svg => ({ role: svg.getAttribute('role'), labels: [...svg.querySelectorAll('.audience-text')].map(element => element.textContent),
      description: svg.querySelector('desc')?.textContent, labelledBy: svg.getAttribute('aria-labelledby')?.split(' ').map(id => document.getElementById(id)?.textContent) })),
  }))
  evidence.assets = assets
  check('three embedded font faces load offline', assets.fonts.length === 3 && assets.fonts.every(font => font.status === 'loaded'))
  check('all embedded logos decode with natural dimensions', assets.logos.length === deck.slides.length && assets.logos.every(logo => logo.embedded && logo.complete && logo.width > 0 && logo.height > 0))
  const expectedPhotos = deck.slides.flatMap(slide => (slide.images ?? (slide.image ? [slide.image] : [])).map(image => ({ slideId: slide.id, image })))
  check('all authored photos decode offline and preserve alternative text', assets.photos.length === expectedPhotos.length && assets.photos.every(photo => {
    const authored = expectedPhotos.find(authored => authored.slideId === photo.slideId && authored.image.alt === photo.alt)
    return authored && photo.embedded && photo.complete && photo.width > 0 && photo.height > 0
  }), assets.photos)
  check('website brand artwork decodes offline as decorative artwork', assets.artwork.length === deck.slides.filter(slide => ['arcs', 'contours'].includes(slide.graphic)).length && assets.artwork.every(art => art.embedded && art.complete && art.width > 0 && art.height > 0 && art.decorative), assets.artwork)
  for (const {slideId, image} of expectedPhotos) {
    const note = notesPage.locator(`.slide-notes[data-slide-id="${slideId}"]`)
    const attribution = await note.evaluate(article => ({ text: article.textContent, links: [...article.querySelectorAll('a')].map(link => link.href) }))
    check(`${slideId}: photograph credit and source license are available in notes`, attribution.text.includes(image.credit) && attribution.links.includes(image.sourceUrl) && attribution.links.includes(image.licenseUrl), attribution.links)
  }
  check('trusted SVG diagrams have accessible descriptions and real text labels', assets.diagrams.length > 0 && assets.diagrams.every(diagram => diagram.role === 'img' && diagram.description && diagram.labelledBy.every(Boolean) && diagram.labels.every(label => diagram.description.includes(label))))
  const treeDescription = await page.locator('.slide[data-slide-id="tree-bay"] svg.diagram desc').textContent()
  check('Bay Area tree describes California, Bay Area and current work', ['AI treaty', 'California', 'Bay Area', 'Berkeley chapter', 'You are here'].every(label => treeDescription.includes(label)), treeDescription)
  const cultureSection = deck.source.text.split(/^## Part 3: Culture\s*$/m)[1]?.split(/^## /m)[0] ?? ''
  const culture = cultureSection.split('\n').filter(line => /^[-*] /.test(line))
  evidence.cultureSourceBullets = culture
  if (deck.id === '10-6-dna') {
    const cultureSlide = deck.slides.find(slide => slide.id === 'culture-values')
    const cultureNote = deck.notes.find(note => note.slideId === 'culture-values')
    const audienceCulture = await page.locator('.slide[data-slide-id="culture-values"] .audience-text').allTextContents()
    check('all four original Culture values have a dedicated audience slide and verbatim notes', culture.length === 4 && culture.every(line => cultureNote.passages.join('\n').includes(line) && cultureSlide.content.labels.includes(line.replace(/^[-*] /, '')) && audienceCulture.includes(line.replace(/^[-*] /, ''))))
  }
  await notesPage.close()
  const presenter = await exerciseBehavior(page, deck)
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    const name = `${viewport.width}x${viewport.height}`
    const entry = { ...viewport, slides: [], screenshots: [] }
    evidence.viewports.push(entry)
    await keyboard(page, 'Home', 0)
    await keyboard(page, 'p', 0)
    for (const [index, slide] of deck.slides.entries()) {
      if (index) await forward(page, deck, index)
      const metric = await geometry(page)
      entry.slides.push(metric)
      verifyGeometry(metric, `${name} ${slide.id}`)
      verifyAuthoredText(metric, slide, `${name} ${slide.id}`)
      const sectionOrder = [...new Set(deck.slides.map(slide => slide.section).filter(Boolean))]
      const members = deck.slides.filter(candidate => candidate.section === slide.section)
      const expectedFill = Math.round((members.indexOf(slide) + 1) / members.length * 100)
      check(`${name} ${slide.id}: progress matches authored section and position`, slide.section
        ? metric.sectionProgress?.active === slide.section && JSON.stringify(metric.sectionProgress.segments.map(segment => segment.section)) === JSON.stringify(sectionOrder) && metric.sectionProgress.segments.find(segment => segment.section === slide.section)?.fill === expectedFill
        : !metric.sectionProgress)
      if (slide.layout === 'tree') {
        check(`${name} ${slide.id}: reveal and tree connectors match`, metric.tree.length === slide.content.reveal.length && metric.tree.every(node => slide.content.reveal.includes(node.id)) && metric.treeEdges.length === metric.tree.length - 1 && metric.treeEdges.every(edge => slide.content.reveal.includes(edge.parent) && slide.content.reveal.includes(edge.child) && edge.touchesParent && edge.touchesChild), metric.treeEdges)
        check(`${name} ${slide.id}: current Berkeley chapter marker`, metric.tree.filter(node => node.current).map(node => node.id).join() === (slide.content.reveal.includes('chapter') ? 'chapter' : ''))
        const treeSpan = Math.max(...metric.tree.map(node => node.bounds.right)) - Math.min(...metric.tree.map(node => node.bounds.x))
        check(`${name} ${slide.id}: visible tree fills the diagram width`, treeSpan / metric.scale >= 1080)
        const nodes = new Map()
        function visit(node, focused = false) {
          nodes.set(node.id, !slide.content.focus || focused || node.id === slide.content.focus)
          for (const child of node.children ?? []) visit(child, focused || node.id === slide.content.focus)
        }
        visit(slide.content.tree)
        check(`${name} ${slide.id}: focus lights exactly the revealed subtree`, metric.tree.every(node => node.dim === !nodes.get(node.id)))
      }
      assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1)
      const screenshot = `${name}-${String(index + 1).padStart(2, '0')}-${slide.id}.png`
      await page.screenshot({ path: join(output, screenshot) })
      entry.screenshots.push(screenshot)
    }
    await keyboard(page, 'p', deck.slides.length - 1)
    entry.controls = await controlsVisible(page)
    await keyboard(page, 'Home', 0)
    const longNotesIndex = deck.slides.findIndex(slide => slide.id === 'tree-goal')
    for (let i = 1; i <= longNotesIndex; i++) await forward(page, deck, i)
    await notesMatch(presenter, deck, longNotesIndex)
    await presenter.setViewportSize(viewport)
    const noteScroll = await presenter.evaluate(() => {
      const panel = document.scrollingElement
      panel.scrollTop = panel.scrollHeight
      return { clientHeight: panel.clientHeight, scrollHeight: panel.scrollHeight, scrollTop: panel.scrollTop }
    })
    check(`${name}: separate presenter notes can scroll`, noteScroll.scrollHeight > noteScroll.clientHeight && noteScroll.scrollTop > 0, noteScroll)
    entry.notesScreenshot = `${name}-presenter-notes.png`
    await presenter.screenshot({ path: join(output, entry.notesScreenshot) })
    entry.notesControls = await controlsVisible(presenter)
    await page.locator('#next').click()
    await notesMatch(presenter, deck, longNotesIndex + 1)

  }
  await presenter.close()
  // The current DNA deck uses two sibling roles. Exercise the supported third
  // role too: bounding rectangles alone miss corners outside a curved ellipse.
  const generic = structuredClone(deck)
  const genericRoleIndex = generic.slides.findIndex(slide => slide.layout === 'roles')
  generic.slides[genericRoleIndex].content.roles = ['Working groups', 'Local circles', 'Support teams']
  const genericPath = join(isolated, 'three-role-fixture.html')
  await writeFile(genericPath, renderDeck(generic))
  await open(genericPath)
  await page.setViewportSize({ width: 1280, height: 720 })
  await keyboard(page, 'Home', 0)
  for (let index = 1; index <= genericRoleIndex; index++) await forward(page, generic, index)
  const genericMetric = await geometry(page)
  evidence.threeRoleFixture = genericMetric
  verifyGeometry(genericMetric, '1280x720 generic three-role fixture')
  verifyAuthoredText(genericMetric, generic.slides[genericRoleIndex], '1280x720 generic three-role fixture')
  await page.screenshot({ path: join(output, '1280x720-generic-three-roles.png') })
  const agendaFixture = structuredClone(deck)
  const agendaIndex = agendaFixture.slides.findIndex(slide => slide.layout === 'agenda')
  const agenda = agendaFixture.slides[agendaIndex]
  agenda.id = 'agenda-six'
  agenda.content.labels.push('Discussion')
  const agendaPath = join(isolated, 'six-section-agenda.html')
  await writeFile(agendaPath, renderDeck(agendaFixture))
  await open(agendaPath)
  for (let index = 1; index <= agendaIndex; index++) await forward(page, agendaFixture, index)
  const agendaMetric = await geometry(page)
  evidence.sixSectionAgendaFixture = agendaMetric
  verifyGeometry(agendaMetric, '1280x720 six-section agenda fixture')
  verifyAuthoredText(agendaMetric, agenda, '1280x720 six-section agenda fixture')
  await page.screenshot({ path: join(output, '1280x720-six-section-agenda.png') })
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
