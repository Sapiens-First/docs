<script setup lang="ts">
import { useData } from 'vitepress'
const { theme } = useData()
</script>

<template>
  <ul class="sf-status-legend" aria-label="Page status legend">
    <li v-for="(info, status) in theme.handbookStatuses" :key="status">
      <span aria-hidden="true">{{ info.emoji }}</span> {{ info.label }}
    </li>
  </ul>
</template>
