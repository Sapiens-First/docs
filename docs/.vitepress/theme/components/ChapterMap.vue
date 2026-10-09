<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import PageStatus from './PageStatus.vue'
import StatusLegend from './StatusLegend.vue'

// Home page table of contents. Chapters, labels and pages come from
// themeConfig.handbookChapters (getHandbookChapters in scripts/handbook-toc.mjs,
// built from handbook-data/toc.json); styles live in theme/home.css.
interface Page { number: string; title: string; link: string; shortNumber?: string; statusEmoji?: string; statusLabel?: string; constructionNote?: string }
interface Group { number: string; title: string; link: string; pages: Page[] }
interface Chapter extends Page {
  section: string; label: string
  blurb: string; appendix: boolean; pages: Page[]; groups?: Group[]
}

defineProps<{ compact?: boolean }>()

const { theme } = useData()
const chapters = computed<Chapter[]>(() => theme.value.handbookChapters ?? [])
const main = computed(() => chapters.value.filter((c) => !c.appendix))
const appendices = computed(() => chapters.value.filter((c) => c.appendix))
</script>

<template>
  <nav class="sf-map" :class="{ 'sf-map--compact': compact }" aria-labelledby="sf-map-title">
    <h2 id="sf-map-title" class="sf-map__title">Contents</h2>
    <StatusLegend />

    <ol class="sf-map__chapters">
      <li v-for="chapter in main" :key="chapter.section" class="sf-chapter">
        <a class="sf-chapter__head" :href="withBase(chapter.link)">
          <span class="sf-chapter__num" aria-hidden="true">{{ chapter.number }}</span>
          <span class="sf-chapter__text">
            <span class="sf-chapter__eyebrow">Chapter {{ chapter.number }} · {{ chapter.title }}</span>
            <span class="sf-chapter__label"><PageStatus :page="chapter" /> {{ chapter.label }}</span>
            <span class="sf-chapter__blurb">{{ chapter.blurb }}</span>
          </span>
        </a>
        <ol v-if="chapter.pages.length" class="sf-chapter__pages" :aria-label="`${chapter.label} pages`">
          <li v-for="page in chapter.pages" :key="page.link">
            <a class="sf-toc-row" :href="withBase(page.link)">
              <span class="sf-toc-row__num">{{ page.number }}</span>
              <span class="sf-toc-row__title"><PageStatus :page="page" /> {{ page.title }}</span>
            </a>
          </li>
        </ol>
      </li>
    </ol>

    <section class="sf-map__appendices" aria-labelledby="sf-map-appendices">
      <h3 id="sf-map-appendices" class="sf-map__divider"><span>Appendices</span></h3>
      <ul class="sf-appendix-list">
        <li v-for="chapter in appendices" :key="chapter.section" class="sf-appendix">
          <a class="sf-appendix__head" :href="withBase(chapter.link)">
            <span class="sf-appendix__num" aria-hidden="true">{{ chapter.number }}</span>
            <span class="sf-appendix__text">
              <span class="sf-appendix__label"><PageStatus :page="chapter" /> {{ chapter.label }}</span>
              <span class="sf-appendix__blurb">{{ chapter.blurb }}</span>
            </span>
          </a>
          <div v-if="chapter.groups" class="sf-appendix__groups">
            <details v-for="group in chapter.groups" :key="group.number" class="sf-fold">
              <summary class="sf-toc-row">
                <span class="sf-toc-row__num">{{ group.number }}</span>
                <span class="sf-toc-row__title">{{ group.title }}</span>
              </summary>
              <ol class="sf-fold__pages">
                <li v-for="page in group.pages" :key="page.link">
                  <a class="sf-toc-row" :href="withBase(page.link)">
                    <span class="sf-toc-row__num">{{ page.shortNumber }}</span>
                    <span class="sf-toc-row__title"><PageStatus :page="page" /> {{ page.title }}</span>
                  </a>
                </li>
              </ol>
            </details>
          </div>
          <details v-else-if="chapter.pages.length" class="sf-fold sf-appendix__groups">
            <summary class="sf-toc-row">
              <span class="sf-toc-row__num" aria-hidden="true"></span>
              <span class="sf-toc-row__title">All {{ chapter.pages.length }} pages</span>
            </summary>
            <ol class="sf-fold__pages">
              <li v-for="page in chapter.pages" :key="page.link">
                <a class="sf-toc-row" :href="withBase(page.link)">
                  <span class="sf-toc-row__num">{{ page.number }}</span>
                  <span class="sf-toc-row__title"><PageStatus :page="page" /> {{ page.title }}</span>
                </a>
              </li>
            </ol>
          </details>
        </li>
      </ul>
    </section>
  </nav>
</template>
