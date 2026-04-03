<template>
  <div class="pokemon-preview">
    <slot name="top-left" />
    <div v-if="types?.length" class="preview-type-list">
      <span
        v-for="(type, index) in types"
        :key="type"
        class="preview-type-label"
      >
        <span :style="getTypeTextColor(type)">
          {{ capitalize(type) }}<span v-if="index < types.length - 1">,</span>
        </span>
      </span>
    </div>
    <SpriteImg
      v-if="spriteUrl"
      :src="spriteUrl"
      :alt="spriteAlt"
      :width="144"
      :height="144"
    />
    <svg v-else-if="showBrokenLink" class="broken-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
    <span v-if="displayCatchLocation" class="preview-catch-location">
      {{ displayCatchLocation }}
    </span>
    <slot name="top-right" />
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { TYPE_COLORS } from '../data/types.js'
import SpriteImg from './SpriteImg.vue'

const props = defineProps({
  spriteUrl: {
    type: String,
    default: null,
  },
  spriteAlt: {
    type: String,
    default: '',
  },
  types: {
    type: Array,
    default: null,
  },
  catchLocation: {
    type: String,
    default: null,
  },
  catchLocationLabel: {
    type: String,
    default: null,
  },
  showBrokenLink: {
    type: Boolean,
    default: false,
  },
})

const displayCatchLocation = computed(
  () => props.catchLocationLabel ?? props.catchLocation,
)

const PREVIEW_TYPE_COLORS = {
  normal: '#7d7d4f',
  fire: '#d94708',
  water: '#2d6fe6',
  electric: '#c79600',
  grass: '#3f9f2a',
  ice: '#2d9fb0',
  fighting: '#9f1f19',
  poison: '#812c98',
  ground: '#b88a1c',
  flying: '#6c63db',
  psychic: '#e03274',
  bug: '#7d9100',
  rock: '#90761c',
  ghost: '#53408c',
  dragon: '#4c16d1',
  dark: '#4c3b30',
  steel: '#7b86a8',
  fairy: '#d75f85',
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function getTypeTextColor(type) {
  return {
    color: PREVIEW_TYPE_COLORS[type] || TYPE_COLORS[type].bg,
  }
}
</script>

<style scoped>
.pokemon-preview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: var(--space-4) 0;
  overflow: visible;
  filter: var(--drop-shadow-icon);
}

.preview-type-list {
  position: absolute;
  bottom: -2rem;
  left: var(--space-3);
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.14rem;
  padding-bottom: 0.2rem;
  overflow: visible;
  z-index: 1;
  pointer-events: none;
}

.preview-type-label {
  font-family: Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond, 'Times New Roman', serif;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.28;
  opacity: 0.92;
}

.preview-catch-location {
  position: absolute;
  bottom: -2rem;
  right: var(--space-3);
  font-family: Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond, 'Times New Roman', serif;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.28;
  opacity: 0.92;
  color: var(--color-text-primary);
  pointer-events: none;
  z-index: 1;
}

.broken-link-icon {
  width: 80px;
  height: 80px;
  color: var(--color-text-muted);
  opacity: 0.35;
}

@media (orientation: landscape) and (max-height: 500px) {
  .pokemon-preview {
    margin: var(--space-2) 0;
  }
}

@media (min-width: 1024px) {
  .preview-type-label,
  .preview-catch-location {
    font-size: 0.85rem;
  }
}
</style>
