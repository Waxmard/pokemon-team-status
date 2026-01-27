<template>
  <div
    class="gym-row touchable"
    :style="{ background: getTypeGradient(type) }"
    :class="[getTextColorClass(type)]"
    @click="$emit('click', type)"
  >
    <span class="gym-name">{{ type }}</span>
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

const lightTextTypes = ['electric', 'ice', 'ground', 'steel', 'fairy', 'normal', 'bug', 'rock']

function getTypeGradient(type) {
  const color = typeColors[type]
  return `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -25)} 100%)`
}

function getTextColorClass(type) {
  return lightTextTypes.includes(type) ? 'light-bg' : 'dark-bg'
}

function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount))
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount))
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`
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
  box-shadow: var(--shadow-sm);
  color: #fff;
}

.gym-row.light-bg {
  color: #1a1a2e;
}

.gym-row:hover {
  transform: translateX(4px);
  box-shadow: var(--shadow-md);
}

.gym-row:active {
  transform: scale(0.98);
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
  background: rgba(0, 0, 0, 0.2);
}

.gym-score.positive {
  color: #34d399;
  text-shadow: 0 0 8px rgba(52, 211, 153, 0.5);
}

.gym-score.negative {
  color: #f87171;
  text-shadow: 0 0 8px rgba(248, 113, 113, 0.5);
}

.light-bg .gym-score {
  background: rgba(255, 255, 255, 0.3);
}

.light-bg .gym-score.positive {
  color: #059669;
  text-shadow: none;
}

.light-bg .gym-score.negative {
  color: #dc2626;
  text-shadow: none;
}

.score-diff {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

.score-diff.positive {
  background: rgba(52, 211, 153, 0.25);
  color: #34d399;
}

.score-diff.negative {
  background: rgba(248, 113, 113, 0.25);
  color: #f87171;
}

.light-bg .score-diff.positive {
  background: rgba(5, 150, 105, 0.2);
  color: #059669;
}

.light-bg .score-diff.negative {
  background: rgba(220, 38, 38, 0.2);
  color: #dc2626;
}
</style>
