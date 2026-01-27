<template>
  <n-card class="gym-column" :title="title">
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
  </n-card>
</template>

<script setup>
import { NCard } from 'naive-ui'
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

<style scoped>
.gym-column {
  height: fit-content;
}

.gym-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
