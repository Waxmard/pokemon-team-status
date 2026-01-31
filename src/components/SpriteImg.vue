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
      :src="currentSrc"
      :alt="alt"
      :class="imgClass"
      class="sprite-img"
      @load="onLoad"
      @error="onError"
    />
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'

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
const currentSrc = ref('')
const hdLoaded = ref(false)

// Convert high-res URL to small sprite URL
function getSmallSpriteUrl(hdUrl) {
  // HD: .../sprites/pokemon/other/official-artwork/25.png
  // Small: .../sprites/pokemon/25.png
  const match = hdUrl.match(/\/official-artwork\/(\d+)\.png$/)
  if (match) {
    return hdUrl.replace(
      `/other/official-artwork/${match[1]}.png`,
      `/${match[1]}.png`,
    )
  }
  return null
}

// Load HD sprite in background and swap when ready
function loadHdSprite(hdUrl) {
  const img = new Image()
  img.onload = () => {
    hdLoaded.value = true
    currentSrc.value = hdUrl
  }
  // If HD fails, keep showing small sprite (no action needed)
  img.src = hdUrl
}

// Initialize with small sprite, then load HD in background
function initSprite(hdUrl) {
  const smallUrl = getSmallSpriteUrl(hdUrl)
  hdLoaded.value = false

  if (smallUrl) {
    // Start with small sprite (likely pre-cached)
    currentSrc.value = smallUrl
    loading.value = true
    // Load HD in background
    loadHdSprite(hdUrl)
  } else {
    // No small sprite available, load HD directly
    currentSrc.value = hdUrl
    loading.value = true
  }
}

function onLoad() {
  loading.value = false
  error.value = false
}

function onError() {
  // If small sprite failed, try HD directly
  if (!hdLoaded.value && currentSrc.value !== props.src) {
    currentSrc.value = props.src
    loading.value = true
    return
  }
  // Both failed, show error
  loading.value = false
  error.value = true
}

onMounted(() => {
  initSprite(props.src)
})

watch(
  () => props.src,
  (newSrc) => {
    error.value = false
    initSprite(newSrc)
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
