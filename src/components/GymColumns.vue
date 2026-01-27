<template>
  <div class="gym-section">
    <GymColumn
      title="Remaining Gyms"
      :gyms="remainingGyms"
      :draftActive="draftActive"
      transitionName="slide-right"
      emptyMessage="All gyms defeated!"
      @gymClick="$emit('defeatGym', $event)"
    />
    <GymColumn
      title="Defeated Gyms"
      :gyms="defeatedGymsList"
      transitionName="slide-left"
      emptyMessage="No gyms defeated yet"
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
  },
  draftActive: {
    type: Boolean,
    default: false
  }
})

defineEmits(['defeatGym', 'undefeatGym'])
</script>
