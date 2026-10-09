import { h, onMounted, onUnmounted } from 'vue'
import DefaultTheme from 'vitepress/theme'
import PageMeta from './components/PageMeta.vue'
import SlidesIndex from './components/SlidesIndex.vue'
import SearchButton from './components/SearchButton.vue'
import NotFound from './components/NotFound.vue'
import ReadingProgress from './components/ReadingProgress.vue'
import ChapterMap from './components/ChapterMap.vue'
import './style.css'
import './nav.css'
import './home.css'

let toastTimer: number | undefined
function toast(msg: string) {
  let el = document.getElementById('sf-toast')
  if (!el) {
    el = document.createElement('div')
    el.id = 'sf-toast'
    el.setAttribute('role', 'status')
    el.setAttribute('aria-live', 'polite')
    document.body.appendChild(el)
  }
  el.textContent = ''
  requestAnimationFrame(() => {
    el!.textContent = msg
    el!.classList.add('show')
  })
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => el!.classList.remove('show'), 1800)
}

function onAnchorClick(e: MouseEvent) {
  const a = (e.target as Element | null)?.closest?.('.vp-doc .header-anchor') as HTMLAnchorElement | null
  if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return
  const url = new URL(a.getAttribute('href') || '', location.href).href
  navigator.clipboard?.writeText(url).then(() => toast('Link copied'), () => {})
}

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ChapterMap', ChapterMap)
    app.component('SlidesIndex', SlidesIndex)
  },
  Layout: {
    setup() {
      onMounted(() => document.addEventListener('click', onAnchorClick))
      onUnmounted(() => document.removeEventListener('click', onAnchorClick))
      return () => h(DefaultTheme.Layout, null, {
      'home-hero-actions-after': () => [h(SearchButton), h(PageMeta)],
      'not-found': () => h(NotFound),
      // "Handbook" tag hung off the Sapiens First wordmark
      'nav-bar-title-after': () => h('span', { class: 'sf-title-tag' }, 'Handbook'),
      // section · reading time · audience, above each page title
      'doc-before': () => h(PageMeta),
      // reading progress bar + end-of-page "Back to top"
      'layout-bottom': () => h(ReadingProgress, { mode: 'bar' }),
      'doc-footer-before': () => h(ReadingProgress, { mode: 'top' })
      })
    }
  }
}
