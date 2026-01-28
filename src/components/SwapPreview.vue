<template>
  <div class="swap-preview">
    <div class="swap-content">
      <div class="swap-pokemon">
        <img :src="boxPokemonSprite" class="swap-sprite" />
        <span class="swap-arrow">⇄</span>
        <img v-if="teamPokemonSprite" :src="teamPokemonSprite" class="swap-sprite" />
        <span v-else class="swap-empty-slot">Empty Slot</span>
      </div>
    </div>
    <div class="swap-actions">
      <button class="btn btn-icon" @click="$emit('cancel')" aria-label="Cancel">
        ✕
      </button>
      <button
        class="btn btn-icon btn-icon-success"
        @click="$emit('confirm')"
        :disabled="!hasTarget"
        aria-label="Confirm"
      >
        ✓
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getSpriteUrl } from '../utils/pokemon.js'

const props = defineProps({
  boxPokemon: { type: Object, required: true },
  teamPokemon: { type: Object, default: null },
  hasTarget: { type: Boolean, default: false }
})

defineEmits(['confirm', 'cancel'])

const boxPokemonSprite = computed(() => getSpriteUrl(props.boxPokemon?.name))
const teamPokemonSprite = computed(() => props.teamPokemon ? getSpriteUrl(props.teamPokemon.name) : null)
</script>

<style scoped>
.swap-preview {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-4);
  display: flex;
  justify-content: space-between;
  align-items: center;
  animation: scaleIn var(--transition-slow) ease forwards;
}

.swap-content {
  flex: 1;
}

.swap-pokemon {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
}

.swap-sprite {
  width: 64px;
  height: 64px;
  object-fit: contain;
}

.swap-arrow {
  font-size: 1.5rem;
  color: var(--color-text-muted);
}

.swap-empty-slot {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.swap-actions {
  display: flex;
  gap: var(--space-2);
}

.btn-icon {
  width: 44px;
  height: 44px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.btn-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-icon-success {
  background: var(--color-success);
  border-color: var(--color-success);
  color: white;
}
</style>
