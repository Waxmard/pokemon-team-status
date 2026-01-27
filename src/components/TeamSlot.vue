<template>
  <n-card class="team-slot" :class="{ empty: !pokemon }" size="small">
    <template v-if="pokemon">
      <n-button
        class="remove-btn"
        circle
        size="tiny"
        type="error"
        @click="$emit('remove', pokemon.id)"
      >
        <template #icon>&times;</template>
      </n-button>
      <div class="pokemon-name">{{ pokemon.name }}</div>
      <div class="pokemon-types">
        <n-tag
          v-for="type in pokemon.types"
          :key="type"
          :color="{ color: typeColors[type], textColor: getTextColor(type) }"
          size="small"
        >
          {{ type }}
        </n-tag>
      </div>
      <div v-if="pokemon.ability" class="pokemon-ability">
        {{ pokemon.ability }}
      </div>
      <div v-if="pokemon.moves.length" class="pokemon-moves">
        Moves:
        <n-tag
          v-for="move in pokemon.moves"
          :key="move"
          :color="{ color: typeColors[move], textColor: getTextColor(move) }"
          size="tiny"
        >
          {{ move }}
        </n-tag>
      </div>
    </template>
    <template v-else>
      <span class="empty-text">Empty</span>
    </template>
  </n-card>
</template>

<script setup>
import { NCard, NButton, NTag } from 'naive-ui'

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
  return lightTextTypes.includes(type) ? '#333' : '#fff'
}
</script>

<style scoped>
.team-slot {
  min-height: 100px;
  position: relative;
}

.team-slot.empty {
  display: flex;
  justify-content: center;
  align-items: center;
  border: 2px dashed #333;
  background: transparent;
}

.team-slot.empty :deep(.n-card__content) {
  display: flex;
  justify-content: center;
  align-items: center;
}

.empty-text {
  color: #666;
}

.remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
}

.pokemon-name {
  font-weight: 600;
  margin-bottom: 6px;
  padding-right: 28px;
}

.pokemon-types {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.pokemon-ability {
  font-size: 0.8rem;
  color: #aaa;
  margin-bottom: 6px;
}

.pokemon-moves {
  font-size: 0.75rem;
  margin-top: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}
</style>
