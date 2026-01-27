<template>
  <div
    class="gym-row touchable"
    @click="$emit('click', type)"
  >
    <span class="gym-name-wrapper">
      <span class="type-dot" :style="{ background: typeColors[type] }"></span>
      <span class="gym-name">{{ type }}</span>
    </span>
    <span class="gym-scores">
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
defineProps({
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
  }
})

defineEmits(['click'])

// Type colors
const typeColors = {
  normal: '#A8A878',
  fire: '#F08030',
  water: '#6890F0',
  electric: '#F8D030',
  grass: '#78C850',
  ice: '#98D8D8',
  fighting: '#C03028',
  poison: '#A040A0',
  ground: '#E0C068',
  flying: '#A890F0',
  psychic: '#F85888',
  bug: '#A8B820',
  rock: '#B8A038',
  ghost: '#705898',
  dragon: '#7038F8',
  dark: '#705848',
  steel: '#B8B8D0',
  fairy: '#EE99AC'
}

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

.type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
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
</style>
