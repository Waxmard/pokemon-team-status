<template>
  <div class="sprite-wrapper" :style="{ width: `${width}px`, height: `${height}px` }">
    <div v-if="error" class="sprite-fallback">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
      </svg>
    </div>
    <img
      v-show="!error"
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

const error = ref(false)
const currentSrc = ref('')
const hdLoaded = ref(false)

function getSmallSpriteUrl(hdUrl) {
  // Default variant HD: .../official-artwork/25.png → /sprites/25.png (bundled)
  const defaultMatch = hdUrl.match(/\/other\/official-artwork\/(\d+\.png)$/)
  if (defaultMatch) return `/sprites/${defaultMatch[1]}`

  // Shiny HD: .../official-artwork/shiny/25.png → remote small sprite
  const match = hdUrl.match(/\/other\/official-artwork\/(.+)$/)
  if (match) {
    return hdUrl.replace(`/other/official-artwork/${match[1]}`, `/${match[1]}`)
  }

  // Female variants (already small URL, no HD)
  return null
}

function loadHdSprite(hdUrl) {
  const img = new Image()
  img.onload = () => {
    hdLoaded.value = true
    currentSrc.value = hdUrl
  }
  // If HD fails, keep showing small sprite (no action needed)
  img.src = hdUrl
}

function initSprite(hdUrl) {
  const smallUrl = getSmallSpriteUrl(hdUrl)
  hdLoaded.value = false

  if (smallUrl) {
    // Start with small sprite (likely pre-cached)
    currentSrc.value = smallUrl
    loadHdSprite(hdUrl)
  } else {
    currentSrc.value = hdUrl
  }
}

function onLoad() {
  error.value = false
}

function onError() {
  // If small sprite failed, try HD directly
  if (!hdLoaded.value && currentSrc.value !== props.src) {
    currentSrc.value = props.src
    return
  }
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
