<template>
  <div
    class="team-slot"
    :class="{ empty: !pokemon, clickable: true }"
    :style="cardBackgroundStyle"
    @click="pokemon ? $emit('edit', pokemon.id) : $emit('add')"
  >
    <Transition name="slot-content" mode="out-in">
      <div v-if="pokemon" key="filled" class="slot-inner">
        <div class="slot-content">
          <img
            v-if="spriteUrl"
            :src="spriteUrl"
            :alt="pokemon.name"
            class="pokemon-sprite"
          />
          <div class="pokemon-info">
            <div class="pokemon-name">
              {{ pokemon.name }}
              <img
                v-if="pokemon.berry"
                :src="getBerrySprite(pokemon.berry)"
                :alt="pokemon.berry"
                :title="pokemon.berry"
                class="berry-sprite"
              />
            </div>
            <div v-if="pokemon.moves.length" class="pokemon-moves">
              <span
                v-for="move in pokemon.moves"
                :key="move"
                class="move-badge"
                :style="{ background: getTypeGradient(move), color: getTextColor(move) }"
              >
                {{ move }}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div v-else key="empty" class="empty-content">
        <svg class="empty-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        <span class="empty-text">Empty Slot</span>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getSpriteUrl, getBerrySprite } from '../utils/pokemon.js'
import { ABILITIES } from '../data/abilities.js'

const props = defineProps({
  pokemon: {
    type: Object,
    default: null
  }
})

defineEmits(['edit', 'add'])

const spriteUrl = computed(() => {
  if (!props.pokemon) return null
  return getSpriteUrl(props.pokemon.name)
})

const cardBackgroundStyle = computed(() => {
  if (!props.pokemon || !props.pokemon.types?.length) return {}

  const opacity = 0.15
  let types = [...props.pokemon.types]

  // For Protean, include move types in the gradient
  const abilityData = ABILITIES[props.pokemon.ability]
  if (abilityData?.protean && props.pokemon.moves?.length) {
    for (const moveType of props.pokemon.moves) {
      if (moveType && !types.includes(moveType)) {
        types.push(moveType)
      }
    }
  }

  if (types.length === 1) {
    const color = typeColors[types[0]]
    return {
      background: `linear-gradient(135deg, ${hexToRgba(color, opacity)} 0%, ${hexToRgba(color, opacity * 0.7)} 100%)`
    }
  } else {
    // Create gradient stops for all types
    const stops = types.map((type, i) => {
      const color = typeColors[type]
      const percent = (i / (types.length - 1)) * 100
      return `${hexToRgba(color, opacity)} ${percent}%`
    })
    return {
      background: `linear-gradient(135deg, ${stops.join(', ')})`
    }
  }
})

function hexToRgba(hex, alpha) {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

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
}

.slot-inner {
  position: relative;
}

.slot-content-enter-active,
.slot-content-leave-active {
  transition: opacity var(--transition-base), transform var(--transition-base);
}

.slot-content-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.slot-content-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.team-slot:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.team-slot.clickable {
  cursor: pointer;
}

.team-slot.empty {
  display: flex;
  justify-content: center;
  align-items: center;
  border: 2px dashed var(--color-border);
  background: var(--color-surface-light);
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

.slot-content {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
}

.pokemon-sprite {
  width: 64px;
  height: 64px;
  object-fit: contain;
  flex-shrink: 0;
}

.pokemon-info {
  flex: 1;
  min-width: 0;
}

.pokemon-name {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: var(--space-2);
  padding-right: var(--space-6);
  color: var(--color-text-primary);
}

.pokemon-moves {
  font-size: 0.75rem;
  margin-top: auto;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  align-items: center;
}

.move-badge {
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: capitalize;
  box-shadow: var(--shadow-sm);
}

.berry-sprite {
  width: 18px;
  height: 18px;
  margin-left: var(--space-1);
  vertical-align: middle;
  object-fit: contain;
}

</style>
