<template>
  <div class="team-slot" :class="{ empty: !pokemon }">
    <template v-if="pokemon">
      <button class="remove-btn" @click="$emit('remove', pokemon.id)">&times;</button>
      <div class="pokemon-name">{{ pokemon.name }}</div>
      <div class="pokemon-types">
        <span
          v-for="type in pokemon.types"
          :key="type"
          class="type-badge"
          :class="'type-' + type"
        >{{ type }}</span>
      </div>
      <div v-if="pokemon.ability" class="pokemon-ability">
        {{ pokemon.ability }}
      </div>
      <div v-if="pokemon.moves.length" class="pokemon-moves">
        Moves:
        <span
          v-for="move in pokemon.moves"
          :key="move"
          class="type-badge"
          :class="'type-' + move"
        >{{ move }}</span>
      </div>
    </template>
    <template v-else>
      Empty
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
</script>
