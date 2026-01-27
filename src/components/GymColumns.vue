<template>
  <div class="gym-section">
    <GymColumn
      title="Remaining Gyms"
      :gyms="remainingGyms"
      @gymClick="$emit('defeatGym', $event)"
    />
    <GymColumn
      title="Defeated Gyms"
      :gyms="defeatedGymsList"
      @gymClick="$emit('undefeatGym', $event)"
    />
  </div>
</template>

<script setup>
import GymColumn from './GymColumn.vue'

defineProps({
  remainingGyms: {
    type: Array,
    required: true
  },
  defeatedGymsList: {
    type: Array,
    required: true
  }
})

defineEmits(['defeatGym', 'undefeatGym'])
</script>
