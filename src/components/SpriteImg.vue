<template>
  <div class="sprite-wrapper" :style="{ width: `${width}px`, height: `${height}px` }">
    <div v-if="loading" class="sprite-skeleton" />
    <div v-else-if="error" class="sprite-fallback">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
      </svg>
    </div>
    <img
      v-show="!loading && !error"
      :src="src"
      :alt="alt"
      :class="imgClass"
      class="sprite-img"
      @load="onLoad"
      @error="onError"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  src: {
    type: String,
    required: true,
  },
  alt: {
    type: String,
    default: '',
  },
  width: {
    type: Number,
    required: true,
  },
  height: {
    type: Number,
    required: true,
  },
  imgClass: {
    type: String,
    default: '',
  },
})

const loading = ref(true)
const error = ref(false)

function onLoad() {
  loading.value = false
  error.value = false
}

function onError() {
  loading.value = false
  error.value = true
}

watch(
  () => props.src,
  () => {
    loading.value = true
    error.value = false
  },
)
</script>

<style scoped>
.sprite-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sprite-skeleton {
  width: 100%;
  height: 100%;
  border-radius: var(--radius-md);
  background: var(--color-surface-light);
  animation: pulse 1.5s ease-in-out infinite;
}

.sprite-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  opacity: 0.5;
}

.sprite-fallback svg {
  width: 50%;
  height: 50%;
}

.sprite-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
