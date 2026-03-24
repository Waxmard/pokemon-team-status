<template>
  <div
    class="gym-column"
    @dragend="onDragEnd"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchEnd"
  >
    <div class="column-header">
      <h3 class="column-title">{{ title }}</h3>
    </div>

    <!-- Pin slot as absolute overlay, not in grid flow -->
    <div
      v-if="!readOnly && isDragging"
      class="pin-slot-overlay"
      :class="{ 'pin-slot-hover': isPinSlotHover }"
      @dragenter.prevent="onPinSlotEnter"
      @dragleave="onPinSlotLeave"
      @dragover.prevent
      @drop="onDropPin"
    >
      <span class="pin-icon">📌</span>
      <span class="pin-label">Pin to top</span>
    </div>

    <div class="gym-list">
      <GymRow
        v-for="(element, index) in gyms"
        :key="element.type"
        :type="element.type"
        :score="element.score"
        :berryCount="element.berryCount || 0"
        :defeated="element.defeated || false"
        :pinned="element.type === pinnedType"
        :improvementScore="element.improvementScore"
        :suggestionMode="suggestionMode"
        :readOnly="readOnly"
        :style="{ animationDelay: `${index * 30}ms` }"
        @click="$emit('gymClick', element.type)"
        @dragstart="onRowDragStart(element.type, $event)"
        @touchdragstart="onTouchDragStart(element.type)"
      />
    </div>

    <div v-if="gyms.length === 0" class="empty-state">
      <span class="empty-message">{{ emptyMessage }}</span>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import GymRow from './GymRow.vue'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  gyms: {
    type: Array,
    required: true,
  },
  transitionName: {
    type: String,
    default: 'slide-left',
  },
  emptyMessage: {
    type: String,
    default: 'No gyms',
  },
  draftActive: {
    type: Boolean,
    default: false,
  },
  pinnedType: {
    type: String,
    default: null,
  },
  suggestionMode: {
    type: Boolean,
    default: false,
  },
  readOnly: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['gymClick', 'pin'])

// Drag state
const isDragging = ref(false)
const draggedType = ref(null)
const isPinSlotHover = ref(false)
const touchDragType = ref(null)

function onRowDragStart(type, event) {
  if (props.readOnly) return
  isDragging.value = true
  draggedType.value = type
  // Set drag data for the drag operation
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', type)
  }
}

function onDragEnd() {
  isDragging.value = false
  isPinSlotHover.value = false
  draggedType.value = null
}

// Touch drag handlers for mobile
function onTouchDragStart(type) {
  if (props.readOnly) return
  isDragging.value = true
  touchDragType.value = type
}

function onTouchMove(event) {
  if (props.readOnly) return
  if (!touchDragType.value) return

  const touch = event.touches[0]
  const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY)

  // Check if touch is over pin slot
  const pinSlot = elementAtPoint?.closest('.pin-slot-overlay')
  isPinSlotHover.value = !!pinSlot
}

function onTouchEnd(event) {
  if (props.readOnly) return
  if (touchDragType.value && isPinSlotHover.value) {
    // Prevent synthetic click from firing on whatever is under the finger
    event.preventDefault()
    emit('pin', touchDragType.value)
  }
  // Reset all state
  isDragging.value = false
  isPinSlotHover.value = false
  touchDragType.value = null
  draggedType.value = null
}

function onPinSlotEnter() {
  isPinSlotHover.value = true
}

function onPinSlotLeave() {
  isPinSlotHover.value = false
}

function onDropPin() {
  if (props.readOnly) return
  if (draggedType.value) {
    emit('pin', draggedType.value)
  }
  isDragging.value = false
  isPinSlotHover.value = false
  draggedType.value = null
}

// Fallback cleanup in case drag events don't fire properly
onMounted(() => {
  document.addEventListener('dragend', onDragEnd)
  document.addEventListener('mouseup', onDragEnd)
  document.addEventListener('touchend', onDragEnd)
})

onUnmounted(() => {
  document.removeEventListener('dragend', onDragEnd)
  document.removeEventListener('mouseup', onDragEnd)
  document.removeEventListener('touchend', onDragEnd)
})
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

.gym-list {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}

.pin-slot-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border-radius: var(--radius-lg);
  border: 2px dashed var(--color-primary);
  background: var(--color-surface-light);
  transition: background var(--transition-base), border-color var(--transition-base), transform var(--transition-base);
}

.pin-slot-overlay.pin-slot-hover {
  background: var(--color-primary-light, rgba(var(--color-primary-rgb, 59, 130, 246), 0.15));
  border-color: var(--color-primary);
  transform: scale(1.02);
}

.pin-icon {
  font-size: 1.25rem;
}

.pin-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-primary);
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

.column-header {
  display: none; /* hidden by default (landscape) */
}

@media (orientation: portrait) {
  .column-header {
    display: flex;
    align-items: center;
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
}

@media (min-width: 1024px) {
  .gym-list {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}
</style>
