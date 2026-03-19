<template>
  <section class="soul-link-shell">
    <SoulLinkPlayerView
      :board="viewedPlayerBoard"
      :generation-rules="generationRules"
    />
  </section>
</template>

<script setup>
import SoulLinkPlayerView from './SoulLinkPlayerView.vue'

defineProps({
  generationRules: {
    type: String,
    required: true,
  },
  viewedPlayerBoard: {
    type: Object,
    required: true,
  },
})
</script>

<style scoped>
.soul-link-shell {
  display: contents;
}
</style>
