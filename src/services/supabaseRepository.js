import { supabase } from './supabaseClient.js'

function assertClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
  }
  return supabase
}

function mapRow(row) {
  return {
    id: row.id,
    inviteCode: row.invite_code,
    state: row.state,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createSupabaseRepository() {
  return {
    async createSession({ sessionId, inviteCode, state }) {
      const client = assertClient()
      const { data, error } = await client
        .from('sessions')
        .insert({
          id: sessionId,
          invite_code: inviteCode,
          state,
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create session: ${error.message}`)
      }
      return mapRow(data)
    },

    async fetchSessionById(sessionId) {
      const client = assertClient()
      const { data, error } = await client
        .from('sessions')
        .select()
        .eq('id', sessionId)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) {
        throw new Error(`Failed to fetch session: ${error.message}`)
      }
      return data ? mapRow(data) : null
    },

    async fetchSessionByInviteCode(inviteCode) {
      const client = assertClient()
      const { data, error } = await client
        .from('sessions')
        .select()
        .eq('invite_code', inviteCode)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) {
        throw new Error(
          `Failed to fetch session by invite code: ${error.message}`,
        )
      }
      return data ? mapRow(data) : null
    },

    async pushSessionState(sessionId, state, expectedVersion) {
      const client = assertClient()
      const { data, error } = await client
        .from('sessions')
        .update({
          state,
          version: expectedVersion + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('version', expectedVersion)
        .select()
        .maybeSingle()

      if (error) {
        throw new Error(`Failed to push session state: ${error.message}`)
      }

      if (!data) {
        return { success: false, version: null }
      }
      return { success: true, version: data.version }
    },

    async deleteSession(sessionId) {
      const client = assertClient()
      const { error } = await client
        .from('sessions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', sessionId)

      if (error) {
        throw new Error(`Failed to delete session: ${error.message}`)
      }
    },

    subscribeToSession(sessionId, onUpdate) {
      const client = assertClient()
      const channel = client
        .channel(`session-${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'sessions',
            filter: `id=eq.${sessionId}`,
          },
          (payload) => onUpdate(mapRow(payload.new)),
        )
        .subscribe()

      return () => client.removeChannel(channel)
    },
  }
}
