<template>
  <div
    class="gym-card touchable"
    :class="{ defeated: defeated, pinned: pinned }"
    :style="rowBackgroundStyle"
    @click="$emit('click', type)"
  >
    <!-- Drag handle for pin -->
    <span
      class="drag-handle"
      draggable="true"
      @dragstart.stop="onHandleDragStart"
      @touchstart.stop="onHandleTouchStart"
    >
      ⋮⋮
    </span>

    <span v-if="pinned" class="pin-indicator">📌</span>
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

    <span class="score-corner" :class="{ positive: score > 0, negative: score < 0 }">
      {{ score > 0 ? '+' : '' }}{{ score }}
    </span>
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
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: transform var(--transition-base), box-shadow var(--transition-base), opacity var(--transition-base);
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  -webkit-user-drag: element;
  user-select: none;
  border: 2px solid; /* color set via inline style */
  color: var(--color-text-primary);
}

.gym-card:active {
  transform: scale(0.98);
}

.gym-card.defeated {
  opacity: 0.4;
}

.type-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  pointer-events: none;
}

.berry-corner {
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

.score-corner {
  position: absolute;
  bottom: 8px;
  right: 8px;
  font-weight: 700;
  font-size: 0.95rem;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-light);
  color: var(--color-text-secondary);
}

.score-corner.positive {
  color: var(--color-success);
}

.score-corner.negative {
  color: var(--color-danger);
}

.gym-card.pinned {
  box-shadow: 0 0 0 2px var(--color-primary);
}

.pin-indicator {
  position: absolute;
  top: 4px;
  left: 4px;
  font-size: 0.75rem;
}

.drag-handle {
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

/* Move pin indicator when drag handle is present */
.gym-card .pin-indicator {
  left: 28px;
}
</style>
