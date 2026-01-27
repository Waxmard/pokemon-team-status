<template>
  <div class="team-slot" :class="{ empty: !pokemon }">
    <template v-if="pokemon">
      <button
        class="remove-btn"
        @click.stop="$emit('remove', pokemon.id)"
        aria-label="Remove Pokemon"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M9.5 3.205L8.795 2.5 6 5.295 3.205 2.5 2.5 3.205 5.295 6 2.5 8.795 3.205 9.5 6 6.705 8.795 9.5 9.5 8.795 6.705 6z"/>
        </svg>
      </button>
      <div class="pokemon-name">{{ pokemon.name }}</div>
      <div class="pokemon-types">
        <span
          v-for="type in pokemon.types"
          :key="type"
          class="type-badge"
          :style="{ background: getTypeGradient(type), color: getTextColor(type) }"
        >
          {{ type }}
        </span>
      </div>
      <div v-if="pokemon.ability" class="pokemon-ability">
        {{ pokemon.ability }}
      </div>
      <div v-if="pokemon.moves.length" class="pokemon-moves">
        <span class="moves-label">Moves:</span>
        <span
          v-for="move in pokemon.moves"
          :key="move"
          class="move-badge"
          :style="{ background: getTypeGradient(move), color: getTextColor(move) }"
        >
          {{ move }}
        </span>
      </div>
    </template>
    <template v-else>
      <div class="empty-content">
        <svg class="empty-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        <span class="empty-text">Empty Slot</span>
      </div>
    </template>
  </div>
</template>

<script setup>
defineProps({
  pokemon: {
    type: Object,
    default: null
  }
})

defineEmits(['remove'])

// Type colors for tags
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

const lightTextTypes = ['electric', 'ice', 'ground', 'steel', 'fairy']

function getTextColor(type) {
  return lightTextTypes.includes(type) ? '#1a1a2e' : '#fff'
}

function getTypeGradient(type) {
  const color = typeColors[type]
  return `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%)`
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
.team-slot {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-4);
  min-height: 110px;
  position: relative;
  box-shadow: var(--shadow-md);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
  animation: fadeInUp var(--transition-slow) ease forwards;
}

.team-slot:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.team-slot.empty {
  display: flex;
  justify-content: center;
  align-items: center;
  border: 2px dashed var(--color-border-light);
  background: transparent;
  box-shadow: none;
}

.team-slot.empty:hover {
  transform: none;
  border-color: var(--color-text-muted);
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.empty-icon {
  color: var(--color-text-muted);
  opacity: 0.5;
}

.empty-text {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.remove-btn {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  background: var(--color-danger);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition-base), transform var(--transition-fast);
  z-index: 1;
}

.team-slot:hover .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  transform: scale(1.1);
  box-shadow: var(--shadow-glow-danger);
}

.remove-btn:active {
  transform: scale(0.95);
}

.pokemon-name {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: var(--space-2);
  padding-right: var(--space-6);
  color: var(--color-text-primary);
}

.pokemon-types {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-bottom: var(--space-2);
}

.type-badge {
  padding: 3px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  box-shadow: var(--shadow-sm);
}

.pokemon-ability {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}

.pokemon-moves {
  font-size: 0.75rem;
  margin-top: auto;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  align-items: center;
}

.moves-label {
  color: var(--color-text-muted);
  margin-right: var(--space-1);
}

.move-badge {
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: capitalize;
  box-shadow: var(--shadow-sm);
}
</style>
