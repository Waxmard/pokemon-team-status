import { afterAll, describe, expect, it } from 'vitest'
import { supabase } from '../supabaseClient.js'
import { createSupabaseRepository } from '../supabaseRepository.js'

const shouldRunIntegrationTests =
  import.meta.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true'
const isConfigured = !!supabase
const describeIf =
  shouldRunIntegrationTests && isConfigured ? describe : describe.skip

const createdSessionIds = []

afterAll(async () => {
  if (!supabase) return
  for (const id of createdSessionIds) {
    await supabase.from('sessions').delete().eq('id', id)
  }
})

function randomInviteCode() {
  return `test-${crypto.randomUUID().slice(0, 6)}`
}

describeIf('supabaseRepository (integration)', () => {
  const repo = createSupabaseRepository()

  it('creates and fetches a session by id', async () => {
    const sessionId = crypto.randomUUID()
    createdSessionIds.push(sessionId)

    const created = await repo.createSession({
      sessionId,
      inviteCode: randomInviteCode(),
      state: { players: [] },
    })

    expect(created.id).toBe(sessionId)
    expect(created.version).toBe(1)
    expect(created.state).toEqual({ players: [] })

    const fetched = await repo.fetchSessionById(sessionId)
    expect(fetched).toEqual(created)
  })

  it('fetches a session by invite code', async () => {
    const sessionId = crypto.randomUUID()
    const inviteCode = randomInviteCode()
    createdSessionIds.push(sessionId)

    await repo.createSession({
      sessionId,
      inviteCode,
      state: {},
    })

    const fetched = await repo.fetchSessionByInviteCode(inviteCode)
    expect(fetched).not.toBeNull()
    expect(fetched.id).toBe(sessionId)
    expect(fetched.inviteCode).toBe(inviteCode)
  })

  it('returns null for non-existent session', async () => {
    const fetched = await repo.fetchSessionById(crypto.randomUUID())
    expect(fetched).toBeNull()
  })

  it('returns null for non-existent invite code', async () => {
    const fetched = await repo.fetchSessionByInviteCode('nonexistent-code')
    expect(fetched).toBeNull()
  })

  it('pushes state with correct version (optimistic concurrency)', async () => {
    const sessionId = crypto.randomUUID()
    createdSessionIds.push(sessionId)

    await repo.createSession({
      sessionId,
      inviteCode: randomInviteCode(),
      state: { v: 1 },
    })

    const result = await repo.pushSessionState(sessionId, { v: 2 }, 1)
    expect(result).toEqual({ success: true, version: 2 })

    const fetched = await repo.fetchSessionById(sessionId)
    expect(fetched.state).toEqual({ v: 2 })
    expect(fetched.version).toBe(2)
  })

  it('rejects push with stale version', async () => {
    const sessionId = crypto.randomUUID()
    createdSessionIds.push(sessionId)

    await repo.createSession({
      sessionId,
      inviteCode: randomInviteCode(),
      state: { v: 1 },
    })

    // Push to version 2
    await repo.pushSessionState(sessionId, { v: 2 }, 1)

    // Try pushing with stale version 1
    const result = await repo.pushSessionState(sessionId, { v: 'conflict' }, 1)
    expect(result).toEqual({ success: false, version: null })
  })

  it('deletes a session', async () => {
    const sessionId = crypto.randomUUID()

    await repo.createSession({
      sessionId,
      inviteCode: randomInviteCode(),
      state: {},
    })

    await repo.deleteSession(sessionId)

    const fetched = await repo.fetchSessionById(sessionId)
    expect(fetched).toBeNull()
  })
})
