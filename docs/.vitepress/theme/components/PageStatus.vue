<script setup lang="ts">
defineProps<{ page: { statusEmoji?: string; statusLabel?: string; constructionNote?: string } }>()
</script>

<template>
  <span v-if="page.statusEmoji" class="sf-toc-status" role="img" :aria-label="page.statusLabel"
    :title="[page.statusLabel, page.constructionNote].filter(Boolean).join(': ')">{{ page.statusEmoji }}</span>
</template>
