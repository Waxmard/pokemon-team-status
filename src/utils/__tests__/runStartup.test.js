import { describe, expect, it } from 'vitest'
import { RUN_MODES } from '../runSnapshot.js'
import { resolveMostRecentRunMode } from '../runStartup.js'

describe('resolveMostRecentRunMode', () => {
  it('returns the preferred mode when neither run exists', () => {
    expect(
      resolveMostRecentRunMode({ preferredMode: RUN_MODES.SOUL_LINK }),
    ).toBe(RUN_MODES.SOUL_LINK)
  })

  it('returns solo when only a solo run exists', () => {
    expect(
      resolveMostRecentRunMode({
        preferredMode: RUN_MODES.SOUL_LINK,
        soloRun: { updatedAt: '2026-04-01T10:00:00.000Z' },
      }),
    ).toBe(RUN_MODES.SOLO)
  })

  it('returns the preferred mode when both runs exist', () => {
    expect(
      resolveMostRecentRunMode({
        preferredMode: RUN_MODES.SOLO,
        soloRun: { updatedAt: '2026-04-01T10:00:00.000Z' },
        soulLinkRun: { updatedAt: '2026-04-01T11:00:00.000Z' },
      }),
    ).toBe(RUN_MODES.SOLO)
  })

  it('returns soul link preferred mode when both runs exist', () => {
    expect(
      resolveMostRecentRunMode({
        preferredMode: RUN_MODES.SOUL_LINK,
        soloRun: { updatedAt: '2026-04-01T10:00:00.000Z' },
        soulLinkRun: { updatedAt: '2026-04-01T10:00:00.000Z' },
      }),
    ).toBe(RUN_MODES.SOUL_LINK)
  })
})
