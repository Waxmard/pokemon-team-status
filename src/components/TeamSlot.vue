<template>
  <div
    class="team-slot"
    :class="{
      empty: !pokemon,
      clickable: true,
    }"
    :style="cardBackgroundStyle"
    @click="pokemon ? $emit('edit', pokemon.id) : $emit('add')"
  >
        <Transition name="slot-content" mode="out-in">
          <div v-if="pokemon" key="filled" class="slot-inner">
            <div class="slot-content">
              <div class="sprite-container">
                <SpriteImg
                  v-if="spriteUrl"
                  :src="spriteUrl"
                  :alt="pokemon.name"
                  :width="80"
                  :height="80"
                />
              </div>
              <div class="pokemon-info">
                <div v-if="pokemon.moves.length" class="pokemon-moves">
                  <img
                    v-for="move in pokemon.moves"
                    :key="move"
                    :src="getTypeIcon(move)"
                    :alt="move"
                    :title="move"
                    class="move-type-icon"
                  />
                </div>
                <div class="pokemon-badges">
                  <SpriteImg
                    v-if="pokemon.berry"
                    class="berry-icon"
                    :src="getBerrySprite(pokemon.berry)"
                    :alt="pokemon.berry"
                    :title="pokemon.berry"
                    :width="24"
                    :height="24"
                  />
                  <span v-if="pokemon.specialMove" class="special-move-badge">
                    {{ pokemon.specialMove }}
                  </span>
                  <span v-if="pokemon.ability" class="ability-badge">
                    {{ pokemon.ability }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div v-else key="empty" class="empty-content">
            <svg class="empty-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            <span class="empty-text">Empty Slot</span>
          </div>
        </Transition>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRunStore } from '../composables/useRunStore.js'
import { ABILITIES } from '../data/abilities.js'
import { getTypeIcon, TYPE_COLORS } from '../data/types.js'
import { hexToRgba } from '../utils/colors.js'
import { getMemberTypesForRules } from '../utils/generationRules.js'
import {
  getBerrySprite,
  getMegaSpriteUrl,
  getSpriteUrl,
} from '../utils/pokemon.js'
import SpriteImg from './SpriteImg.vue'

const props = defineProps({
  pokemon: {
    type: Object,
    default: null,
  },
})

defineEmits(['edit', 'add'])

const { generationRules } = useRunStore()

const spriteUrl = computed(() => {
  if (!props.pokemon) return null
  const variant = props.pokemon.spriteVariant || 'default'
  // Use mega sprite if mega form is active
  if (props.pokemon.megaSpriteId) {
    return getMegaSpriteUrl(props.pokemon.megaSpriteId, variant)
  }
  return getSpriteUrl(props.pokemon.name, variant)
})

const cardBackgroundStyle = computed(() => {
  if (!props.pokemon) return {}

  const opacity = 0.15
  const types = [
    ...getMemberTypesForRules(props.pokemon, generationRules.value),
  ]

  if (!types.length) return {}

  // For Protean, include move types in the gradient
  const abilityData = ABILITIES[props.pokemon.ability]
  if (abilityData?.protean && props.pokemon.moves?.length) {
    for (const moveType of props.pokemon.moves) {
      if (moveType && !types.includes(moveType)) {
        types.push(moveType)
      }
    }
  }

  // Include mega types in the gradient
  if (props.pokemon.megaTypes?.length) {
    for (const megaType of props.pokemon.megaTypes) {
      if (!types.includes(megaType)) {
        types.push(megaType)
      }
    }
  }

  if (types.length === 1) {
    const color = TYPE_COLORS[types[0]].bg
    return {
      background: `linear-gradient(135deg, ${hexToRgba(color, opacity)} 0%, ${hexToRgba(color, opacity * 0.7)} 100%)`,
    }
  } else {
    // Create gradient stops for all types
    const stops = types.map((type, i) => {
      const color = TYPE_COLORS[type].bg
      const percent = (i / (types.length - 1)) * 100
      return `${hexToRgba(color, opacity)} ${percent}%`
    })
    return {
      background: `linear-gradient(135deg, ${stops.join(', ')})`,
    }
  }
})
</script>

<style scoped>
.team-slot {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-2);
  position: relative;
  box-shadow: var(--shadow-md);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.slot-inner {
  position: relative;
}

.slot-content-enter-active,
.slot-content-leave-active {
  transition: opacity var(--transition-base), transform var(--transition-base);
}

.slot-content-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.slot-content-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.team-slot.clickable {
  cursor: pointer;
}

.team-slot.empty {
  display: flex;
  justify-content: center;
  align-items: center;
  border: 2px dashed var(--color-border);
  background: var(--color-surface-light);
  box-shadow: none;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.empty-icon {
  color: var(--color-text-muted);
  opacity: 0.5;
}

.empty-text {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.slot-content {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.sprite-container {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}


.pokemon-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.pokemon-moves {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  align-items: center;
}

.move-type-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.pokemon-badges {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-1);
  margin-left: auto;
}

.berry-icon {
  margin-right: var(--space-1);
}

.special-move-badge,
.ability-badge {
  font-size: 0.7rem;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.1);
  white-space: nowrap;
}


</style>
