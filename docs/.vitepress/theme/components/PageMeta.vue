<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

// Eyebrow above each page title: which section you're in, how long the page
// takes to read, when it was last updated, and (optionally, via
// `audience:` frontmatter) who it's for. Also renders the page's `status`
// (frontmatter) as a single badge on its own line, and a banner for pages
// marked `status: under-construction` (with an optional `construction_note`).
const { page, frontmatter, theme } = useData()

const toLink = (relativePath: string) =>
  '/' + relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')

// Fallback when a page has no frontmatter `section` yet: look up the group
// that owns this page in the sidebar.
const sidebarSection = computed(() => {
  const here = toLink(page.value.relativePath)
  const group = (theme.value.sidebar ?? []).find((g: any) =>
    g.items?.some((i: any) => i.link === here)
  )
  // Group headings are HTML (number and label columns); use their plain form.
  return group?.plainText ?? group?.text
})

const section = computed(() => frontmatter.value.section || sidebarSection.value)

// `draft` is the default state of most of the handbook, so it gets no badge:
// a label on every page is noise. Incomplete pages use `under-construction`,
// which renders the banner below instead of a badge.
const STATUS_LABELS: Record<string, string> = {
  adopted: 'Adopted practice',
  proposal: 'Proposal — not current policy',
  experimental: 'Experimental — may not continue',
  reference: 'Reference',
  planned: 'Planned — outline awaiting review',
}

const status = computed(() => {
  const s = frontmatter.value.status
  return typeof s === 'string' && s in STATUS_LABELS ? s : undefined
})
const statusLabel = computed(() => status.value && STATUS_LABELS[status.value])

const underConstruction = computed(() => frontmatter.value.status === 'under-construction')
const planned = computed(() => frontmatter.value.status === 'planned')
const constructionNote = computed(() => {
  const n = frontmatter.value.construction_note
  return typeof n === 'string' && n.trim() ? n.trim() : undefined
})
const lastUpdated = computed(() => {
  // YAML parses an unquoted `YYYY-MM-DD` scalar as a Date, which VitePress
  // then serializes to the client as a full ISO string (`2026-09-27T00:00:00.000Z`);
  // a page that quotes the value keeps the plain `2026-09-27` string. Accept both.
  const raw = frontmatter.value.last_updated
  if (typeof raw !== 'string') return undefined
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (!match) return undefined
  const d = new Date(`${match[1]}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
})
</script>

<template>
  <p v-if="section || frontmatter.readingTime || lastUpdated" class="sf-page-meta">
    <span v-if="section">{{ section }}</span>
    <span v-if="frontmatter.readingTime">{{ frontmatter.readingTime }} min read</span>
    <span v-if="lastUpdated" class="sf-updated">Updated {{ lastUpdated }}</span>
    <span v-if="frontmatter.audience" class="sf-audience">For {{ frontmatter.audience }}</span>
  </p>
  <p v-if="statusLabel" class="sf-status-line">
    <span class="sf-status-badge" :class="`sf-status-${status}`">{{ statusLabel }}</span>
  </p>
  <aside v-if="underConstruction || planned" class="sf-construction" role="note" aria-label="Page status">
    <svg class="sf-construction__icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M12 2.5 1.5 21h21L12 2.5Z" fill="currentColor" />
      <path d="M12 9v5.5" stroke="var(--sf-construction-mark)" stroke-width="2.4" stroke-linecap="square" />
      <circle cx="12" cy="17.6" r="1.4" fill="var(--sf-construction-mark)" />
    </svg>
    <div class="sf-construction__body">
      <p class="sf-construction__label">{{ planned ? 'Planned module' : 'Under construction' }}</p>
      <p class="sf-construction__text">
        {{ constructionNote ?? (planned ? 'This outline names a future module. Review it before writing or using it as a training.' : 'This page is still being written. Parts may be missing or change before it is final.') }}
      </p>
    </div>
  </aside>
</template>
