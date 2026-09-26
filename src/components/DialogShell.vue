<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="visible"
        class="reset-overlay"
        @click.self="$emit('update:visible', false)"
      >
        <div class="reset-dialog">
          <h3 class="reset-dialog-title">{{ title }}</h3>
          <slot name="intro" />
          <div class="reset-dialog-options">
            <slot />
          </div>
          <button
            class="reset-dialog-cancel"
            @click="$emit('update:visible', false)"
          >
            ✕
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, required: true },
  title: { type: String, required: true },
})

defineEmits(['update:visible'])
</script>
