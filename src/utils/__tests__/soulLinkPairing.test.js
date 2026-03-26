import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  findLinkedDeleteTarget,
  preserveSoulLinkPairingFields,
  reconcileSoulLinkPairing,
} from '../soulLinkPairing.js'

function member(overrides = {}) {
  return {
    id: overrides.id ?? 'member-1',
    catchLocation: null,
    pairId: null,
    ...overrides,
  }
}

function roster(team = [], box = [], dead = []) {
  return { team, box, dead }
}

function createContext(rosters, partnerId = 'player-2') {
  const updateCalls = []
  return {
    getPlayerRoster: (playerId) => rosters[playerId] ?? roster(),
    updateRosterMember: vi.fn((...args) => updateCalls.push(args)),
    updateCalls,
    partnerId,
  }
}

describe('preserveSoulLinkPairingFields', () => {
  it('returns null/undefined member as-is', () => {
    expect(preserveSoulLinkPairingFields(null, {})).toBe(null)
    expect(preserveSoulLinkPairingFields(undefined, {})).toBe(undefined)
  })

  it('preserves member own catchLocation and pairId when present', () => {
    const m = { id: '1', catchLocation: 'Route 1', pairId: 'p-1' }
    const source = { catchLocation: 'Route 2', pairId: 'p-2' }
    const result = preserveSoulLinkPairingFields(m, source)
    expect(result.catchLocation).toBe('Route 1')
    expect(result.pairId).toBe('p-1')
  })

  it('falls back to sourceMember fields when member lacks them', () => {
    const m = { id: '1' }
    const source = { catchLocation: 'Route 2', pairId: 'p-2' }
    const result = preserveSoulLinkPairingFields(m, source)
    expect(result.catchLocation).toBe('Route 2')
    expect(result.pairId).toBe('p-2')
  })

  it('returns null for missing source fields', () => {
    const m = { id: '1' }
    const result = preserveSoulLinkPairingFields(m, null)
    expect(result.catchLocation).toBe(null)
    expect(result.pairId).toBe(null)
  })
})

describe('findLinkedDeleteTarget', () => {
  it('returns linked target when member has pairId and partner exists', () => {
    const ctx = createContext({
      'player-1': roster([member({ id: 'a', pairId: 'b' })]),
      'player-2': roster([member({ id: 'b' })]),
    })
    const result = findLinkedDeleteTarget('player-1', 'a', 'team', ctx)
    expect(result).toEqual({
      memberId: 'a',
      rosterKey: 'team',
      partnerPlayerId: 'player-2',
      partnerMemberId: 'b',
      partnerRosterKey: 'team',
    })
  })

  it('finds partner in box', () => {
    const ctx = createContext({
      'player-1': roster([member({ id: 'a', pairId: 'b' })]),
      'player-2': roster([], [member({ id: 'b' })]),
    })
    const result = findLinkedDeleteTarget('player-1', 'a', 'team', ctx)
    expect(result.partnerRosterKey).toBe('box')
  })

  it('finds partner in dead roster', () => {
    const ctx = createContext({
      'player-1': roster([member({ id: 'a', pairId: 'b' })]),
      'player-2': roster([], [], [member({ id: 'b' })]),
    })
    const result = findLinkedDeleteTarget('player-1', 'a', 'team', ctx)
    expect(result.partnerRosterKey).toBe('dead')
  })

  it('returns null when member has no pairId', () => {
    const ctx = createContext({
      'player-1': roster([member({ id: 'a' })]),
    })
    expect(findLinkedDeleteTarget('player-1', 'a', 'team', ctx)).toBe(null)
  })

  it('returns null when no partnerId', () => {
    const ctx = createContext(
      { 'player-1': roster([member({ id: 'a', pairId: 'b' })]) },
      null,
    )
    expect(findLinkedDeleteTarget('player-1', 'a', 'team', ctx)).toBe(null)
  })

  it('returns null when partner member not found', () => {
    const ctx = createContext({
      'player-1': roster([member({ id: 'a', pairId: 'missing' })]),
      'player-2': roster(),
    })
    expect(findLinkedDeleteTarget('player-1', 'a', 'team', ctx)).toBe(null)
  })
})

describe('reconcileSoulLinkPairing', () => {
  it('no-ops when member not found', () => {
    const ctx = createContext({ 'player-1': roster() })
    reconcileSoulLinkPairing('player-1', 'missing', 'team', ctx)
    expect(ctx.updateRosterMember).not.toHaveBeenCalled()
  })

  it('no-ops when no partnerId', () => {
    const ctx = createContext(
      { 'player-1': roster([member({ id: 'a', catchLocation: 'Route 1' })]) },
      null,
    )
    reconcileSoulLinkPairing('player-1', 'a', 'team', ctx)
    expect(ctx.updateRosterMember).not.toHaveBeenCalled()
  })

  it('clears pairing when catchLocation is removed', () => {
    const partnerMember = member({ id: 'b' })
    const ctx = createContext({
      'player-1': roster([
        member({ id: 'a', catchLocation: null, pairId: 'b' }),
      ]),
      'player-2': roster([partnerMember]),
    })
    reconcileSoulLinkPairing('player-1', 'a', 'team', ctx)
    // Should clear partner's pairId and own pairId
    expect(ctx.updateRosterMember).toHaveBeenCalledWith(
      'player-2',
      'team',
      'b',
      { pairId: null },
    )
    expect(ctx.updateRosterMember).toHaveBeenCalledWith(
      'player-1',
      'team',
      'a',
      { pairId: null },
    )
  })

  it('keeps existing pair when location still matches (case-insensitive)', () => {
    const ctx = createContext({
      'player-1': roster([
        member({ id: 'a', catchLocation: 'Route 1', pairId: 'b' }),
      ]),
      'player-2': roster([
        member({ id: 'b', catchLocation: 'route 1', pairId: 'a' }),
      ]),
    })
    reconcileSoulLinkPairing('player-1', 'a', 'team', ctx)
    // Should not update anything since pair is already correct
    expect(ctx.updateRosterMember).not.toHaveBeenCalled()
  })

  it('updates partner pairId when location matches but partner pairId is stale', () => {
    const ctx = createContext({
      'player-1': roster([
        member({ id: 'a', catchLocation: 'Route 1', pairId: 'b' }),
      ]),
      'player-2': roster([
        member({ id: 'b', catchLocation: 'route 1', pairId: 'stale' }),
      ]),
    })
    reconcileSoulLinkPairing('player-1', 'a', 'team', ctx)
    expect(ctx.updateRosterMember).toHaveBeenCalledWith(
      'player-2',
      'team',
      'b',
      { pairId: 'a' },
    )
  })

  it('repairs an existing pair when the partner is in the dead roster', () => {
    const ctx = createContext({
      'player-1': roster([
        member({ id: 'a', catchLocation: 'Route 1', pairId: 'b' }),
      ]),
      'player-2': roster(
        [],
        [],
        [member({ id: 'b', catchLocation: 'route 1', pairId: 'stale' })],
      ),
    })
    reconcileSoulLinkPairing('player-1', 'a', 'team', ctx)
    expect(ctx.updateRosterMember).toHaveBeenCalledWith(
      'player-2',
      'dead',
      'b',
      { pairId: 'a' },
    )
  })

  it('links new pair when matching partner location found', () => {
    const ctx = createContext({
      'player-1': roster([member({ id: 'a', catchLocation: 'Route 1' })]),
      'player-2': roster([member({ id: 'b', catchLocation: 'Route 1' })]),
    })
    reconcileSoulLinkPairing('player-1', 'a', 'team', ctx)
    expect(ctx.updateRosterMember).toHaveBeenCalledWith(
      'player-1',
      'team',
      'a',
      { pairId: 'b' },
    )
    expect(ctx.updateRosterMember).toHaveBeenCalledWith(
      'player-2',
      'team',
      'b',
      { pairId: 'a' },
    )
  })

  it('clears existing partner and links new one when location changes', () => {
    const ctx = createContext({
      'player-1': roster([
        member({ id: 'a', catchLocation: 'Route 2', pairId: 'b' }),
      ]),
      'player-2': roster([
        member({ id: 'b', catchLocation: 'Route 1' }),
        member({ id: 'c', catchLocation: 'Route 2' }),
      ]),
    })
    reconcileSoulLinkPairing('player-1', 'a', 'team', ctx)
    // Should clear old partner b, then link with c
    expect(ctx.updateRosterMember).toHaveBeenCalledWith(
      'player-2',
      'team',
      'b',
      { pairId: null },
    )
    expect(ctx.updateRosterMember).toHaveBeenCalledWith(
      'player-1',
      'team',
      'a',
      { pairId: 'c' },
    )
  })

  it('displaces old pair of matching partner', () => {
    const ctx = createContext({
      'player-1': roster([
        member({ id: 'a', catchLocation: 'Route 1' }),
        member({ id: 'old', pairId: null }),
      ]),
      'player-2': roster([
        member({ id: 'b', catchLocation: 'Route 1', pairId: 'old' }),
      ]),
    })
    reconcileSoulLinkPairing('player-1', 'a', 'team', ctx)
    // Should clear old's pairId, then link a↔b
    expect(ctx.updateRosterMember).toHaveBeenCalledWith(
      'player-1',
      'team',
      'old',
      { pairId: null },
    )
  })

  it('sets pairId to null when no matching partner found', () => {
    const ctx = createContext({
      'player-1': roster([member({ id: 'a', catchLocation: 'Route 99' })]),
      'player-2': roster([member({ id: 'b', catchLocation: 'Route 1' })]),
    })
    reconcileSoulLinkPairing('player-1', 'a', 'team', ctx)
    expect(ctx.updateRosterMember).toHaveBeenCalledWith(
      'player-1',
      'team',
      'a',
      { pairId: null },
    )
  })
})
