<template>
  <div
    class="gym-row touchable"
    @click="$emit('click', type)"
  >
    <span class="gym-name-wrapper">
      <img :src="getTypeIcon(type)" :alt="type" class="type-icon" />
      <span class="gym-name">{{ type }}</span>
    </span>
    <span class="gym-scores">
      <span
        v-if="berryCount > 0"
        class="berry-icons"
        :title="`${berryCount} ${BERRY_BY_TYPE[type]}${berryCount > 1 ? 's' : ''}`"
      >
        <img
          v-for="i in berryCount"
          :key="i"
          :src="berrySprite"
          class="berry-sprite"
          :alt="BERRY_BY_TYPE[type]"
        />
      </span>
      <span class="gym-score" :class="{ positive: score > 0, negative: score < 0 }">
        {{ score > 0 ? '+' : '' }}{{ score }}
      </span>
      <span
        v-if="diff !== 0"
        class="score-diff"
        :class="{ positive: diff > 0, negative: diff < 0 }"
      >
        {{ diff > 0 ? '+' : '' }}{{ diff }}
      </span>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getBerrySprite } from '../utils/pokemon.js'
import { BERRY_BY_TYPE } from '../data/berries.js'
import { getTypeIcon } from '../data/types.js'

const props = defineProps({
  type: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  diff: {
    type: Number,
    default: 0
  },
  berryCount: {
    type: Number,
    default: 0
  }
})

defineEmits(['click'])

const berrySprite = computed(() => getBerrySprite(BERRY_BY_TYPE[props.type]))

</script>

<style scoped>
.gym-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  cursor: pointer;
  min-height: 44px;
  transition: transform var(--transition-base), box-shadow var(--transition-base);
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
}

.gym-row:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.gym-row:active {
  transform: scale(0.98);
}

.gym-name-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.type-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  flex-shrink: 0;
}

.gym-name {
  font-weight: 600;
  text-transform: capitalize;
}

.gym-scores {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.gym-score {
  font-weight: 700;
  font-size: 1.1rem;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-light);
  color: var(--color-text-secondary);
}

.gym-score.positive {
  color: var(--color-success);
}

.gym-score.negative {
  color: var(--color-danger);
}

.score-diff {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

.score-diff.positive {
  background: rgba(16, 185, 129, 0.15);
  color: var(--color-success);
}

.score-diff.negative {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-danger);
}

.berry-icons {
  display: flex;
  align-items: center;
}

.berry-sprite {
  width: 20px;
  height: 20px;
  object-fit: contain;
  margin-left: -4px;
}

.berry-sprite:first-child {
  margin-left: 0;
}
</style>
