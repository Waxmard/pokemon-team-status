<template>
  <div
    class="gym-card touchable"
    :class="{ defeated: defeated }"
    :style="rowBackgroundStyle"
    @click="$emit('click', type)"
  >
    <img :src="getTypeIcon(type)" :alt="type" class="type-icon" />

    <span
      v-if="berryCount > 0 || berryDiff !== 0"
      class="berry-corner"
      :title="`${berryCount} ${BERRY_BY_TYPE[type]}${berryCount > 1 ? 's' : ''}`"
    >
      <img
        v-for="i in berryCount"
        :key="i"
        :src="berrySprite"
        class="berry-sprite"
        :alt="BERRY_BY_TYPE[type]"
      />
      <span v-if="berryDiff !== 0" class="berry-diff" :class="{ positive: berryDiff > 0, negative: berryDiff < 0 }">
        {{ berryDiff > 0 ? '+' : '' }}{{ berryDiff }}
      </span>
    </span>

    <span class="score-corner" :class="{ positive: score > 0, negative: score < 0 }">
      {{ score > 0 ? '+' : '' }}{{ score }}
      <span v-if="scoreDiff !== 0" class="score-diff" :class="{ positive: scoreDiff < 0, negative: scoreDiff > 0 }">
        {{ scoreDiff > 0 ? '+' : '' }}{{ scoreDiff }}
      </span>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { BERRY_BY_TYPE } from '../data/berries.js'
import { getTypeIcon } from '../data/types.js'
import { getTypeBackground } from '../utils/colors.js'
import { getBerrySprite } from '../utils/pokemon.js'

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
  scoreDiff: {
    type: Number,
    default: 0,
  },
  berryDiff: {
    type: Number,
    default: 0,
  },
  defeated: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['click'])

const berrySprite = computed(() => getBerrySprite(BERRY_BY_TYPE[props.type]))

const rowBackgroundStyle = computed(() => {
  return getTypeBackground(props.type, 0.2)
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
  user-select: none;
  border: 1px solid var(--color-border);
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
}

.berry-corner {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
}

.berry-sprite {
  width: 22px;
  height: 22px;
  object-fit: contain;
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

.score-diff, .berry-diff {
  font-size: 0.75rem;
  margin-left: 4px;
  padding: 1px 4px;
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

.score-diff.positive, .berry-diff.positive {
  color: var(--color-success);
}

.score-diff.negative, .berry-diff.negative {
  color: var(--color-danger);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
