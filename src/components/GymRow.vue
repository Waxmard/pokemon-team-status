<template>
  <div
    class="gym-card touchable"
    :class="{ defeated: defeated }"
    :style="rowBackgroundStyle"
    @click="$emit('click', type)"
  >
    <img :src="getTypeIcon(type)" :alt="type" class="type-icon" />

    <span
      v-if="berryCount > 0"
      class="berry-corner"
      :title="`${berryCount} ${BERRY_BY_TYPE[type]}${berryCount > 1 ? 's' : ''}`"
    >
      <SpriteImg
        v-for="i in berryCount"
        :key="i"
        :src="berrySprite"
        :alt="BERRY_BY_TYPE[type]"
        :width="22"
        :height="22"
        class="berry-sprite"
      />
    </span>

    <span class="score-corner" :class="{ positive: score > 0, negative: score < 0 }">
      {{ score > 0 ? '+' : '' }}{{ score }}
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { BERRY_BY_TYPE } from '../data/berries.js'
import { getTypeIcon } from '../data/types.js'
import { getTypeBackground } from '../utils/colors.js'
import { getBerrySprite } from '../utils/pokemon.js'
import SpriteImg from './SpriteImg.vue'

const props = defineProps({
  type: {
    type: String,
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
  berryCount: {
    type: Number,
    default: 0,
  },
  defeated: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['click'])

const berrySprite = computed(() => getBerrySprite(BERRY_BY_TYPE[props.type]))

const rowBackgroundStyle = computed(() => {
  return getTypeBackground(props.type, 0.2)
})
</script>

<style scoped>
.gym-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: transform var(--transition-base), box-shadow var(--transition-base), opacity var(--transition-base);
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
}

.gym-card:active {
  transform: scale(0.98);
}

.gym-card.defeated {
  opacity: 0.4;
}

.type-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.berry-corner {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
}

.berry-sprite {
  margin-left: -6px;
}

.berry-sprite:first-child {
  margin-left: 0;
}

.score-corner {
  position: absolute;
  bottom: 8px;
  right: 8px;
  font-weight: 700;
  font-size: 0.95rem;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-light);
  color: var(--color-text-secondary);
}

.score-corner.positive {
  color: var(--color-success);
}

.score-corner.negative {
  color: var(--color-danger);
}
</style>
