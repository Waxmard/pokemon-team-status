<template>
  <Teleport to="body">
    <Transition name="dialog">
    <div v-if="visible" class="reset-overlay" @click.self="$emit('update:visible', false)">
      <div class="reset-dialog">
        <h3 class="reset-dialog-title">{{ title }}</h3>
        <div class="reset-dialog-options">
          <DialogActionSection v-if="hasRemoteSession">
            <div class="reset-option-group">
              <div class="session-code-display" @click="$emit('copyCode')">
                {{ sessionCode }}
                <span class="session-code-hint">{{ copyLabel }}</span>
              </div>
            </div>
          </DialogActionSection>
          <DialogActionSection>
            <button class="reset-option" @click="$emit('viewDeathBox')">
              View Death Box
            </button>
          </DialogActionSection>
          <DialogActionSection v-if="showViewPlayer">
            <button class="reset-option" @click="$emit('viewOtherPlayer')">
              View {{ otherPlayerName }}
            </button>
          </DialogActionSection>
          <DialogActionSection>
            <div class="reset-option-group">
              <button class="reset-option" @click="$emit('newRun')">
                {{ newRunLabel }}
              </button>
            </div>
          </DialogActionSection>
        </div>
        <button class="reset-dialog-cancel" @click="$emit('update:visible', false)">✕</button>
      </div>
    </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import DialogActionSection from './DialogActionSection.vue'

defineProps({
  visible: { type: Boolean, required: true },
  title: { type: String, required: true },
  sessionCode: { type: String, default: null },
  copyLabel: { type: String, default: 'tap to copy' },
  hasRemoteSession: { type: Boolean, default: false },
  showViewPlayer: { type: Boolean, default: false },
  otherPlayerName: { type: String, default: '' },
  newRunLabel: { type: String, required: true },
})

defineEmits([
  'update:visible',
  'copyCode',
  'viewDeathBox',
  'viewOtherPlayer',
  'newRun',
])
</script>
