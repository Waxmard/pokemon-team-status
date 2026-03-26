import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDevTools } from '../devTools.js'

function member(id, overrides = {}) {
  return {
    id,
    speciesName: 'Pikachu',
    catchLocation: 'Route 1',
    pairId: null,
    updatedAt: 100,
    ...overrides,
  }
}

function roster(team = [], box = []) {
  return { team, box }
}

describe('createDevTools', () => {
  const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
  const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fixes asymmetric pairings and pushes when a remote session exists', async () => {
    const updateRosterMember = vi.fn()
    const pushState = vi.fn().mockResolvedValue(undefined)
    const tools = createDevTools({
      players: { value: [] },
      rosters: {
        value: {
          'player-1': roster([member('a', { pairId: 'b' })]),
          'player-2': roster([member('b')]),
        },
      },
      sessionMetadata: { value: { sessionId: 'session-1' } },
      updateRosterMember,
      removeRosterMember: vi.fn(),
      setPlayerRoster: vi.fn(),
      pullState: vi.fn(),
      pushState,
    })

    await tools.fixAsymmetricPairings()

    expect(updateRosterMember).toHaveBeenCalledWith('player-2', 'team', 'b', {
      pairId: 'a',
    })
    expect(pushState).toHaveBeenCalledTimes(1)
    expect(consoleWarn).not.toHaveBeenCalled()
  })

  it('skips conflicting pairings unless force is enabled', async () => {
    const updateRosterMember = vi.fn()
    const pushState = vi.fn().mockResolvedValue(undefined)
    const tools = createDevTools({
      players: { value: [] },
      rosters: {
        value: {
          'player-1': roster([member('a', { pairId: 'b' })]),
          'player-2': roster([member('b', { pairId: 'c' })]),
        },
      },
      sessionMetadata: { value: { sessionId: 'session-1' } },
      updateRosterMember,
      removeRosterMember: vi.fn(),
      setPlayerRoster: vi.fn(),
      pullState: vi.fn(),
      pushState,
    })

    await tools.fixAsymmetricPairings()

    expect(updateRosterMember).not.toHaveBeenCalled()
    expect(pushState).not.toHaveBeenCalled()
    expect(consoleWarn).toHaveBeenCalledTimes(1)
  })

  it('deduplicates box members using the reciprocated keeper', async () => {
    const removeRosterMember = vi.fn()
    const pushState = vi.fn().mockResolvedValue(undefined)
    const tools = createDevTools({
      players: { value: [] },
      rosters: {
        value: {
          'player-1': roster(
            [],
            [
              member('keep', {
                speciesName: 'Zubat',
                catchLocation: 'Cave',
                pairId: 'partner-1',
                updatedAt: 500,
              }),
              member('remove', {
                speciesName: 'Zubat',
                catchLocation: 'Cave',
                updatedAt: 100,
              }),
            ],
          ),
          'player-2': roster([member('partner-1', { pairId: 'keep' })]),
        },
      },
      sessionMetadata: { value: { sessionId: 'session-1' } },
      updateRosterMember: vi.fn(),
      removeRosterMember,
      setPlayerRoster: vi.fn(),
      pullState: vi.fn(),
      pushState,
    })

    await tools.dedupBox('player-1')

    expect(removeRosterMember).toHaveBeenCalledWith('player-1', 'box', 'remove')
    expect(pushState).toHaveBeenCalledTimes(1)
    expect(consoleLog).toHaveBeenCalledWith('Pushed to remote')
  })
})
