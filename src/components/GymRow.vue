<template>
  <div
    class="gym-row"
    :class="'type-' + type"
    @click="$emit('click', type)"
  >
    <span class="gym-name">{{ type }}</span>
    <span>
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
