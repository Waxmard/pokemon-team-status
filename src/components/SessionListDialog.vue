<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="modelValue" class="reset-overlay" @click.self="$emit('update:modelValue', false)">
        <div class="reset-dialog session-list-dialog">
          <h3 class="reset-dialog-title">Your Soul Links</h3>

          <div v-if="loading" class="session-list-loading">Loading...</div>

          <div v-else-if="sessions.length === 0" class="session-list-empty">
            No Soul Link sessions yet.
          </div>

          <div v-else class="session-list">
            <button
              v-for="session in sessions"
              :key="session.sessionId"
              class="reset-option session-list-item"
              @click="$emit('rejoin', session.inviteCode)"
            >
              <span class="session-list-name">{{ sessionDisplayName(session) }}</span>
              <span class="session-list-meta">{{ formatDate(session.updatedAt) }}</span>
            </button>
          </div>

          <div class="reset-dialog-options session-list-actions">
            <button class="reset-option" @click="$emit('newSession')">
              New Soul Link Run
            </button>
            <button class="reset-option" @click="$emit('joinByCode')">
              Join by Code
            </button>
          </div>

          <button class="reset-dialog-cancel" @click="$emit('update:modelValue', false)">✕</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useAuthStore } from '../composables/useAuthStore.js'
import { createAuthRepository } from '../services/authRepository.js'

const props = defineProps({
  modelValue: Boolean,
})
defineEmits(['update:modelValue', 'rejoin', 'newSession', 'joinByCode'])

const authStore = useAuthStore()
const authRepo = createAuthRepository()

const sessions = ref([])
const loading = ref(false)

function sessionDisplayName(session) {
  const name = session.state?.metadata?.name
  if (name) return name

  const players = session.state?.players ?? []
  const names = players.map((p) => p.name).filter(Boolean)
  return names.length > 0 ? names.join(' & ') : `Session ${session.inviteCode}`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

watch(
  () => props.modelValue,
  async (visible) => {
    if (!visible || !authStore.isAuthenticated.value) return
    loading.value = true
    try {
      sessions.value = await authRepo.fetchUserSessions(authStore.user.value.id)
    } catch (error) {
      console.error('Failed to load sessions:', error)
      sessions.value = []
    } finally {
      loading.value = false
    }
  },
)
</script>

<style scoped>
.session-list-dialog {
  max-height: 80vh;
  overflow-y: auto;
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  max-height: 300px;
  overflow-y: auto;
}

.session-list-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  text-align: left;
}

.session-list-name {
  font-size: 0.95rem;
}

.session-list-meta {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.session-list-loading,
.session-list-empty {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin-bottom: var(--space-4);
}

.session-list-actions {
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-4);
}
</style>
