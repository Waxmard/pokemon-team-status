import { RUN_MODES } from './runSnapshot.js'

function toTimestamp(value) {
  return new Date(value ?? 0).getTime()
}

export function resolveMostRecentRunMode({
  preferredMode = RUN_MODES.SOLO,
  soloRun = null,
  soulLinkRun = null,
} = {}) {
  if (soloRun && !soulLinkRun) return RUN_MODES.SOLO
  if (soulLinkRun && !soloRun) return RUN_MODES.SOUL_LINK
  if (!soloRun && !soulLinkRun) return preferredMode

  const soloUpdatedAt = toTimestamp(soloRun?.updatedAt)
  const soulLinkUpdatedAt = toTimestamp(soulLinkRun?.updatedAt)

  if (soloUpdatedAt === soulLinkUpdatedAt) {
    return preferredMode
  }

  return soloUpdatedAt > soulLinkUpdatedAt
    ? RUN_MODES.SOLO
    : RUN_MODES.SOUL_LINK
}
