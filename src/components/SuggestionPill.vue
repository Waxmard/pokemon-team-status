<template>
  <span class="suggestion-inline" @click="$emit('select')">
    <SpriteImg :src="left.src" :alt="left.alt" :width="24" :height="24" />
    <span class="suggestion-swap-icon">⇄</span>
    <SpriteImg :src="right.src" :alt="right.alt" :width="24" :height="24" />
    <span
      v-if="indicator"
      :class="['suggestion-indicator', indicator.cls]"
    >{{ indicator.symbol }}</span>
  </span>
</template>

<script setup>
import SpriteImg from './SpriteImg.vue'

defineProps({
  left: { type: Object, required: true },
  right: { type: Object, required: true },
  indicator: { type: Object, default: null },
})

defineEmits(['select'])
</script>
