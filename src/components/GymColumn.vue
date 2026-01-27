<template>
  <div class="gym-column">
    <h2>{{ title }}</h2>
    <div class="gym-list">
      <GymRow
        v-for="gym in gyms"
        :key="gym.type"
        :type="gym.type"
        :score="gym.score"
        :diff="gym.diff || 0"
        @click="$emit('gymClick', gym.type)"
      />
    </div>
  </div>
</template>

<script setup>
import GymRow from './GymRow.vue'

defineProps({
  title: {
    type: String,
    required: true
  },
  gyms: {
    type: Array,
    required: true
  }
})

defineEmits(['gymClick'])
</script>
