import { computed, ref } from 'vue'
import { createAuthRepository } from '../services/authRepository.js'
import { supabase } from '../services/supabaseClient.js'

const user = ref(null)
const isLoading = ref(true)
const authError = ref(null)

let _initialized = false
let _unsubscribe = null
let _authRepo = null

function getAuthRepository() {
  if (!_authRepo) _authRepo = createAuthRepository()
  return _authRepo
}

export function useAuthStore() {
  async function initialize() {
    if (_initialized || !supabase) {
      isLoading.value = false
      return
    }
    _initialized = true

    try {
      const session = await getAuthRepository().getSession()
      user.value = session?.user ?? null
    } catch {
      user.value = null
    }

    _unsubscribe = getAuthRepository().onAuthStateChange((authUser) => {
      user.value = authUser
    })

    isLoading.value = false
  }

  async function signInWithGoogle() {
    authError.value = null
    try {
      await getAuthRepository().signInWithGoogle()
    } catch (error) {
      authError.value = error.message
    }
  }

  async function signOut() {
    authError.value = null
    try {
      await getAuthRepository().signOut()
      user.value = null
    } catch (error) {
      authError.value = error.message
    }
  }

  function clearError() {
    authError.value = null
  }

  return {
    user: computed(() => user.value),
    isAuthenticated: computed(() => !!user.value),
    isLoading: computed(() => isLoading.value),
    authError: computed(() => authError.value),
    initialize,
    signInWithGoogle,
    signOut,
    clearError,
  }
}
