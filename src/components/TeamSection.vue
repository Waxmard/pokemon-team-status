<template>
  <div class="team-section">
    <draggable
      v-model="localTeam"
      :disabled="draftActive"
      item-key="id"
      ghost-class="drag-ghost"
      drag-class="drag-active"
      class="team-grid"
      @end="onDragEnd"
    >
      <template #item="{ element: pokemon }">
        <TeamSlot
          :pokemon="pokemon"
          @remove="$emit('removePokemon', $event)"
          @edit="$emit('editPokemon', $event)"
        />
      </template>
      <template #footer>
        <TeamSlot
          v-for="i in emptySlotCount"
          :key="'empty-' + i"
          :pokemon="null"
          @add="$emit('addPokemon')"
        />
      </template>
    </draggable>

    <Transition name="scale">
      <DraftPanel
        v-if="draftAction"
        :draftAction="draftAction"
        @confirm="$emit('confirmDraft')"
        @cancel="$emit('cancelDraft')"
        @update:pokemon="$emit('updateDraftPokemon', $event)"
        @update:ability="$emit('updateDraftAbility', $event)"
        @update:move="$emit('updateDraftMove', $event)"
      />
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import draggable from 'vuedraggable'
import TeamSlot from './TeamSlot.vue'
import DraftPanel from './DraftPanel.vue'

const props = defineProps({
  team: {
    type: Array,
    required: true
  },
  draftAction: {
    type: Object,
    default: null
  },
  draftActive: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'addPokemon',
  'removePokemon',
  'editPokemon',
  'confirmDraft',
  'cancelDraft',
  'updateDraftPokemon',
  'updateDraftAbility',
  'updateDraftMove',
  'reorderTeam'
])

// Local copy for draggable (only actual Pokemon, no nulls)
const localTeam = ref([...props.team])

// Sync when props change
watch(() => props.team, (newTeam) => {
  localTeam.value = [...newTeam]
}, { deep: true })

// Number of empty slots to show
const emptySlotCount = computed(() => Math.max(0, 6 - props.team.length))

// Emit reorder when drag ends
function onDragEnd() {
  emit('reorderTeam', localTeam.value)
}
</script>

<style scoped>
.team-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  margin-bottom: var(--space-5);
  box-shadow: var(--shadow-lg);
}

.team-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

@media (min-width: 768px) {
  .team-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.drag-ghost {
  opacity: 0.5;
}

.drag-active {
  cursor: grabbing;
}

.team-slot:not(.empty) {
  cursor: grab;
}
</style>
