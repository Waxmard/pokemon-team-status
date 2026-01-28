<template>
  <div class="gym-column">
    <div class="column-header">
      <h3 class="column-title">{{ title }}{{ draftActive ? ' (Draft)' : '' }}</h3>
    </div>
    <TransitionGroup :name="transitionName" tag="div" class="gym-list">
      <GymRow
        v-for="(gym, index) in gyms"
        :key="gym.type"
        :type="gym.type"
        :score="gym.score"
        :berryCount="gym.berryCount || 0"
        :defeated="gym.defeated || false"
        :style="{ animationDelay: `${index * 30}ms` }"
        @click="$emit('gymClick', gym.type)"
      />
    </TransitionGroup>
    <div v-if="gyms.length === 0" class="empty-state">
      <span class="empty-message">{{ emptyMessage }}</span>
    </div>
  </div>
</template>

<script setup>
import GymRow from './GymRow.vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  gyms: {
    type: Array,
    required: true
  },
  transitionName: {
    type: String,
    default: 'slide-left'
  },
  emptyMessage: {
    type: String,
    default: 'No gyms'
  },
  draftActive: {
    type: Boolean,
    default: false
  }
})

defineEmits(['gymClick'])
</script>

<style scoped>
.gym-column {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-4);
  box-shadow: var(--shadow-md);
  height: fit-content;
  overflow: hidden;
  min-width: 0;
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.column-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.gym-list {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--space-6) var(--space-4);
}

.empty-message {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
</style>
