<script setup lang="ts">
import { useData, withBase } from 'vitepress'
import SlideLabel from './SlideLabel.vue'

// Lists every deck from slides/decks/ with its origin, the handbook pages it
// teaches, approval status and last-updated date. The data comes from
// themeConfig.slideDecks (docs/.vitepress/config.mts).
const { theme } = useData()
const decks: any[] = theme.value.slideDecks ?? []

const date = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
const status = (deck: any) =>
  deck.origin === 'generated' ? 'Not reviewed by a person' : deck.approved ? 'Approved' : 'Awaiting approval'
</script>

<template>
  <p v-if="!decks.length">No decks yet.</p>
  <ul v-else class="sf-deck-list">
    <li v-for="deck in decks" :key="deck.slug" class="sf-deck-card">
      <div class="sf-deck-head">
        <strong>{{ deck.title }}</strong>
        <SlideLabel :origin="deck.origin" />
      </div>
      <p class="sf-deck-meta">
        <span>{{ status(deck) }}</span>
        <span>Updated {{ date(deck.lastUpdated) }}</span>
      </p>
      <p class="sf-deck-covers">
        Teaches:
        <template v-for="(page, index) in deck.covers" :key="page.link">
          <a :href="withBase(page.link)">{{ page.title }}</a><span v-if="index < deck.covers.length - 1">, </span>
        </template>
      </p>
      <p v-if="deck.published" class="sf-deck-actions">
        <a class="sf-deck-button" :href="withBase(`/slides/${deck.slug}/`)" target="_blank" rel="noopener">Present</a>
        <a class="sf-deck-button" :href="withBase(`/slides/${deck.slug}/index.notes.html`)" target="_blank" rel="noopener">Presenter notes</a>
      </p>
      <p v-else class="sf-deck-meta">Not published until a person approves it.</p>
    </li>
  </ul>
</template>
