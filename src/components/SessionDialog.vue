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
              {{ deathBoxMode ? 'View Team' : 'View Death Box' }}
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
              <template v-if="isSyncAvailable">
                <template v-if="showJoinInput">
                  <div class="session-input-row">
                    <input
                      ref="joinCodeInputEl"
                      v-model="joinCodeValue"
                      class="session-code-input"
                      type="text"
                      maxlength="6"
                      placeholder="Invite code"
                      @keydown.enter="handleJoin"
                    />
                    <button class="reset-option session-confirm-btn" @click="handleJoin" :disabled="sessionActionPending">
                      Join
                    </button>
                  </div>
                  <div v-if="joinError" class="session-join-error">{{ joinError }}</div>
                </template>
                <button v-else class="reset-option" @click="openJoinInput">
                  {{ joinRunLabel }}
                </button>
              </template>
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
import { nextTick, ref } from 'vue'
import DialogActionSection from './DialogActionSection.vue'

defineProps({
  visible: { type: Boolean, required: true },
  title: { type: String, required: true },
  sessionCode: { type: String, default: null },
  copyLabel: { type: String, default: 'tap to copy' },
  hasRemoteSession: { type: Boolean, default: false },
  deathBoxMode: { type: Boolean, default: false },
  showViewPlayer: { type: Boolean, default: false },
  otherPlayerName: { type: String, default: '' },
  newRunLabel: { type: String, required: true },
  joinRunLabel: { type: String, required: true },
  isSyncAvailable: { type: Boolean, default: false },
  sessionActionPending: { type: Boolean, default: false },
  joinError: { type: String, default: null },
})

const emit = defineEmits([
  'update:visible',
  'copyCode',
  'viewDeathBox',
  'viewOtherPlayer',
  'newRun',
  'joinSession',
])

const showJoinInput = ref(false)
const joinCodeValue = ref('')
const joinCodeInputEl = ref(null)

function openJoinInput() {
  showJoinInput.value = true
  nextTick(() => joinCodeInputEl.value?.focus())
}

function handleJoin() {
  const code = joinCodeValue.value.trim()
  if (!code) return
  emit('joinSession', code)
}
</script>
