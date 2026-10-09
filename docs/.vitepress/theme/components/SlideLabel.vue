<script setup lang="ts">
const ORIGINS: Record<string, { emoji: string; label: string }> = {
  handcrafted: { emoji: '✋', label: 'Handcrafted' },
  generated: { emoji: '🤖', label: 'Auto-generated' }
}
defineProps<{ origin: string }>()
</script>

<template>
  <span class="sf-deck-origin" :class="`sf-deck-${origin}`">
    <span aria-hidden="true">{{ ORIGINS[origin]?.emoji }}</span> {{ ORIGINS[origin]?.label ?? origin }}
  </span>
</template>
