<template>
  <div
    class="gym-row touchable"
    :class="'type-' + type"
    @click="$emit('click', type)"
  >
    <span class="gym-name">{{ type }}</span>
    <span class="gym-scores">
      <span class="gym-score" :class="{ positive: score > 0, negative: score < 0 }">
        {{ score > 0 ? '+' : '' }}{{ score }}
      </span>
      <span
        v-if="diff !== 0"
        class="score-diff"
        :class="{ positive: diff > 0, negative: diff < 0 }"
      >
        ({{ diff > 0 ? '+' : '' }}{{ diff }})
      </span>
    </span>
  </div>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  diff: {
    type: Number,
    default: 0
  }
})

defineEmits(['click'])
</script>

<style scoped>
.gym-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  min-height: 44px;
  transition: transform 0.1s, opacity 0.1s;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.gym-row:hover {
  opacity: 0.9;
}

.gym-row:active {
  transform: scale(0.98);
  opacity: 0.8;
}

.gym-name {
  font-weight: 600;
  text-transform: capitalize;
}

.gym-scores {
  display: flex;
  align-items: center;
  gap: 4px;
}

.gym-score {
  font-weight: 700;
  font-size: 1.1rem;
}

.gym-score.positive {
  color: #2ecc71;
}

.gym-score.negative {
  color: #e74c3c;
}

.score-diff {
  font-size: 0.8rem;
}

.score-diff.positive {
  color: #2ecc71;
}

.score-diff.negative {
  color: #e74c3c;
}

/* Type colors */
.type-normal { background: #A8A878; }
.type-fire { background: #F08030; }
.type-water { background: #6890F0; }
.type-electric { background: #F8D030; color: #333; }
.type-grass { background: #78C850; }
.type-ice { background: #98D8D8; color: #333; }
.type-fighting { background: #C03028; }
.type-poison { background: #A040A0; }
.type-ground { background: #E0C068; color: #333; }
.type-flying { background: #A890F0; }
.type-psychic { background: #F85888; }
.type-bug { background: #A8B820; }
.type-rock { background: #B8A038; }
.type-ghost { background: #705898; }
.type-dragon { background: #7038F8; }
.type-dark { background: #705848; }
.type-steel { background: #B8B8D0; color: #333; }
.type-fairy { background: #EE99AC; color: #333; }
</style>
