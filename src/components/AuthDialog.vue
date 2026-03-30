<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="modelValue" class="reset-overlay" @click.self="$emit('update:modelValue', false)">
        <div class="reset-dialog">
          <h3 class="reset-dialog-title">Account</h3>

          <div v-if="isAuthenticated" class="reset-dialog-options">
            <div class="auth-user-info">
              {{ userEmail }}
            </div>
            <button class="reset-option" @click="handleSignOut">
              Sign Out
            </button>
          </div>

          <div v-else class="reset-dialog-options">
            <button class="reset-option" @click="handleGoogleSignIn" :disabled="signingIn">
              Sign in with Google
            </button>
            <p v-if="authError" class="auth-error">{{ authError }}</p>
          </div>

          <button class="reset-dialog-cancel" @click="$emit('update:modelValue', false)">✕</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useAuthStore } from '../composables/useAuthStore.js'

defineProps({
  modelValue: Boolean,
})
defineEmits(['update:modelValue'])

const authStore = useAuthStore()
const signingIn = ref(false)

const isAuthenticated = computed(() => authStore.isAuthenticated.value)
const userEmail = computed(() => authStore.user.value?.email ?? '')
const authError = computed(() => authStore.authError.value)

async function handleGoogleSignIn() {
  signingIn.value = true
  await authStore.signInWithGoogle()
  signingIn.value = false
}

async function handleSignOut() {
  await authStore.signOut()
}
</script>

<style scoped>
.auth-user-info {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
  word-break: break-all;
}

.auth-error {
  font-size: 0.85rem;
  color: var(--color-danger);
  margin-top: var(--space-2);
}
</style>
