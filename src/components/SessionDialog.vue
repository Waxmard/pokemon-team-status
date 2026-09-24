<template>
  <DialogShell
    :visible="visible"
    :title="title"
    @update:visible="$emit('update:visible', $event)"
  >
    <DialogActionSection v-if="hasRemoteSession">
      <div class="reset-option-group">
        <div class="session-code-display" @click="$emit('copyCode')">
          {{ sessionCode }}
          <span class="session-code-hint">{{ copyLabel }}</span>
        </div>
      </div>
    </DialogActionSection>
    <DialogActionSection v-if="showDeathBox">
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
  </DialogShell>
</template>

<script setup>
import DialogActionSection from './DialogActionSection.vue'
import DialogShell from './DialogShell.vue'

defineProps({
  visible: { type: Boolean, required: true },
  title: { type: String, required: true },
  sessionCode: { type: String, default: null },
  copyLabel: { type: String, default: 'tap to copy' },
  hasRemoteSession: { type: Boolean, default: false },
  showViewPlayer: { type: Boolean, default: false },
  otherPlayerName: { type: String, default: '' },
  showDeathBox: { type: Boolean, default: true },
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
