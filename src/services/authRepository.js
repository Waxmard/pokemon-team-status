import { supabase } from './supabaseClient.js'

function assertClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
  }
  return supabase
}

export function createAuthRepository() {
  return {
    async signInWithGoogle() {
      const client = assertClient()
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (error) throw new Error(`Google sign-in failed: ${error.message}`)
    },

    async signOut() {
      const client = assertClient()
      const { error } = await client.auth.signOut()
      if (error) throw new Error(`Sign-out failed: ${error.message}`)
    },

    async getSession() {
      const client = assertClient()
      const { data, error } = await client.auth.getSession()
      if (error) throw new Error(`Failed to get session: ${error.message}`)
      return data.session
    },

    onAuthStateChange(callback) {
      const client = assertClient()
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((_event, session) => {
        callback(session?.user ?? null)
      })
      return () => subscription.unsubscribe()
    },

    async fetchUserSessions(userId) {
      const client = assertClient()
      const { data, error } = await client
        .from('session_members')
        .select(
          'session_id, joined_at, sessions (id, invite_code, state, updated_at)',
        )
        .eq('user_id', userId)
        .order('joined_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch user sessions: ${error.message}`)
      }

      return (data ?? []).map((row) => ({
        sessionId: row.sessions.id,
        inviteCode: row.sessions.invite_code,
        state: row.sessions.state,
        updatedAt: row.sessions.updated_at,
        joinedAt: row.joined_at,
      }))
    },

    async leaveSession(sessionId, userId) {
      const client = assertClient()
      const { error } = await client
        .from('session_members')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', userId)

      if (error) {
        throw new Error(`Failed to leave session: ${error.message}`)
      }
    },

    async fetchSoloRun(userId) {
      const client = assertClient()
      const { data, error } = await client
        .from('user_solo_runs')
        .select()
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        throw new Error(`Failed to fetch solo run: ${error.message}`)
      }
      return data
        ? {
            state: data.state,
            version: data.version,
            updatedAt: data.updated_at,
          }
        : null
    },

    async upsertSoloRun(userId, state, expectedVersion) {
      const client = assertClient()
      const { data, error } = await client
        .from('user_solo_runs')
        .upsert(
          {
            user_id: userId,
            state,
            version: (expectedVersion ?? 0) + 1,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )
        .select()
        .maybeSingle()

      if (error) {
        throw new Error(`Failed to upsert solo run: ${error.message}`)
      }
      return data ? { version: data.version } : null
    },
  }
}
