import { RUN_MODES } from './runSnapshot.js'

export function resolveMostRecentRunMode({
  preferredMode = RUN_MODES.SOLO,
  soloRun = null,
  soulLinkRun = null,
} = {}) {
  if (soloRun && !soulLinkRun) return RUN_MODES.SOLO
  if (soulLinkRun && !soloRun) return RUN_MODES.SOUL_LINK
  return preferredMode
}
