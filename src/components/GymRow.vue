<template>
  <div
    class="gym-card touchable"
    :class="{ defeated: defeated && !suggestionMode, pinned: pinned, 'read-only': readOnly }"
    @click="!suggestionMode && !readOnly && $emit('click', type)"
  >
    <div class="gym-card-inner" :style="rowBackgroundStyle">
      <!-- Drag handle for pin -->
      <span
        v-if="!readOnly && !suggestionMode"
        class="drag-handle"
        draggable="true"
        @dragstart.stop="onHandleDragStart"
        @touchstart.stop="onHandleTouchStart"
      >
        ⋮⋮
      </span>

      <img :src="getTypeIcon(type)" :alt="type" class="type-icon" draggable="false" />

      <span
        v-if="berryCount > 0"
        class="berry-corner"
        :title="`${berryCount} ${BERRY_BY_TYPE[type]}${berryCount > 1 ? 's' : ''}`"
      >
        <SpriteImg
          v-for="i in berryCount"
          :key="i"
          :src="berrySprite"
          :alt="BERRY_BY_TYPE[type]"
          :width="22"
          :height="22"
          class="berry-sprite"
        />
      </span>

      <span
        v-if="suggestionMode && improvementScore != null"
        class="score-corner"
        :class="improvementClass"
      >
        {{ improvementSymbol }}
      </span>
      <span
        v-else-if="!suggestionMode"
        class="score-corner"
        :style="{ '--score-abs': Math.abs(score) }"
        :aria-label="`${score > 0 ? 'Prepared' : 'Vulnerable'}: ${Math.abs(score)}`"
      >
        {{ scoreSymbol }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { BERRY_BY_TYPE } from '../data/berries.js'
import { getTypeIcon, TYPE_COLORS } from '../data/types.js'
import { getTypeBackground, hexToRgba } from '../utils/colors.js'
import { getBerrySprite } from '../utils/pokemon.js'
import SpriteImg from './SpriteImg.vue'

const props = defineProps({
  type: {
    type: String,
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
  berryCount: {
    type: Number,
    default: 0,
  },
  defeated: {
    type: Boolean,
    default: false,
  },
  pinned: {
    type: Boolean,
    default: false,
  },
  suggestionMode: {
    type: Boolean,
    default: false,
  },
  improvementScore: {
    type: Number,
    default: undefined,
  },
  readOnly: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['click', 'dragstart', 'touchdragstart'])

const berrySprite = computed(() => getBerrySprite(BERRY_BY_TYPE[props.type]))

function onHandleDragStart(event) {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', props.type)
  }
  emit('dragstart', event)
}

function onHandleTouchStart() {
  emit('touchdragstart')
}

const improvementSymbol = computed(() => {
  if (props.improvementScore > 0) return '\u25B2'
  if (props.improvementScore < 0) return '\u25BC'
  return '\u2014'
})

const improvementClass = computed(() => {
  if (props.improvementScore > 0) return 'improvement-up'
  if (props.improvementScore < 0) return 'improvement-down'
  return 'improvement-neutral'
})

const scoreSymbol = computed(() => {
  if (props.score > 0) return '\u{1F44D}'
  if (props.score < 0) return '\u{1F44E}'
  return '\u{1FAF3}'
})

const rowBackgroundStyle = computed(() => {
  const baseStyle = getTypeBackground(props.type, 0.35)
  const borderColor = TYPE_COLORS[props.type].bg
  return {
    ...baseStyle,
    borderColor: hexToRgba(borderColor, 0.5),
  }
})
</script>

<style scoped>
.gym-card {
  position: relative;
  width: 100%;
  padding-bottom: 90%; /* Slightly shorter - Safari PWA grows to correct size */
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  -webkit-user-drag: element;
  user-select: none;
}

.gym-card.read-only {
  cursor: default;
}

.gym-card-inner {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  border: 2px solid; /* color set via inline style */
  color: var(--color-text-primary);
  transition: transform var(--transition-base), box-shadow var(--transition-base), opacity var(--transition-base);
}

.gym-card:active .gym-card-inner {
  transform: scale(0.98);
}

.gym-card.defeated .gym-card-inner {
  opacity: 0.4;
}

.type-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  pointer-events: none;
  filter: var(--drop-shadow-icon);
}

.gym-card-inner .berry-corner {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
}

.berry-sprite {
  margin-left: -6px;
}

.berry-sprite:first-child {
  margin-left: 0;
}

.gym-card-inner .score-corner {
  position: absolute;
  bottom: 6px;
  right: 2px;
  line-height: 1;
  font-size: calc(0.7rem + var(--score-abs) * 0.11rem);
  filter: var(--drop-shadow-icon);
}

.score-corner.improvement-up {
  color: var(--color-success);
}

.score-corner.improvement-down {
  color: var(--color-danger);
}

.score-corner.improvement-neutral {
  color: var(--color-text-muted);
}

.gym-card.pinned .gym-card-inner {
  box-shadow: 0 0 0 2px var(--color-primary);
}

.gym-card-inner .drag-handle {
  position: absolute;
  top: 0;
  left: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  cursor: grab;
  touch-action: none;
  -webkit-touch-callout: none;
  user-select: none;
  opacity: 0.6;
  transition: opacity var(--transition-base);
}

.drag-handle:hover {
  opacity: 1;
}

.drag-handle:active {
  cursor: grabbing;
}

@media (min-width: 1024px) {
  .type-icon {
    width: 70px;
    height: 70px;
  }

  .berry-corner :deep(.sprite-wrapper) {
    width: 30px !important;
    height: 30px !important;
  }

  .gym-card-inner .score-corner {
    font-size: calc(1.1rem + var(--score-abs) * 0.2rem);
  }

  .drag-handle {
    width: 36px;
    height: 36px;
    font-size: 0.85rem;
  }
}
</style>
