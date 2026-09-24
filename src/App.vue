<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <div class="app-container">
      <div v-if="activeLoadError" class="load-error-banner" @click="retryLoad">
        Failed to load saved data. Tap to retry.
      </div>
      <AppHeader>
        <template #actions>
          <button @click="showResetDialog = true" aria-label="Options">⚙️</button>
          <button @click="showSoloDialog = true" aria-label="Solo Run">⚔️</button>
          <button @click="showSoulLinkDialog = true" aria-label="Soul Link">🔗</button>
        </template>
        <template #title>
          <span v-if="isSoloMode" class="title-player-row">
            <label class="title-player-field">
              <input
                ref="soloRunNameInput"
                :value="soloRunDisplayName"
                :size="Math.max(soloRunDisplayName.length, 1)"
                class="title-player-input"
                type="text"
                maxlength="32"
                placeholder="Weakness Calculator"
                aria-label="Solo run name"
                @blur="handleRenameSoloRun"
                @focus="soloRunNameInput?.select()"
              />
            </label>
          </span>
          <span v-else class="title-player-row">
            <label class="title-player-field">
              <input
                ref="playerNameInput"
                :value="viewedSoulLinkPlayerName"
                :size="Math.max(viewedSoulLinkPlayerName.length, 1)"
                class="title-player-input"
                type="text"
                maxlength="32"
                aria-label="Viewed Soul Link player name"
                @blur="handleRenameViewedSoulLinkPlayerInput"
                @focus="selectPlayerNameInput"
              />
            </label>
          </span>
        </template>
      </AppHeader>

      <template v-if="ready">
      <template v-if="isSoloMode">
        <TeamSection :team="team" :box="box" :dead="dead" :has-death-box="true" :death-box-mode="deathBoxMode"
          @autosaveDraft="autosaveDraft" @immediateSwap="handleImmediateSwap" :generation-rules="generationRules" :tera-enabled="teraEnabled"
          @deleteTeamPokemon="deleteTeamPokemon" @deleteBoxPokemon="deleteBoxPokemon" @cancelSwap="handleCancelSwap"
          @deletePokemon="handleDeleteFromDraft" @swapSuggestion="handleSwapSuggestion"
          @killPokemon="handleSoloKillPokemon" @revivePokemon="handleSoloRevivePokemon"
          @deleteDeadPokemon="handleSoloDeleteDeadPokemon" @exitDeathBox="deathBoxMode = false" />

        <GymColumns :team="team" :box="box" :remainingGyms="remainingGyms" :defeatedGymsList="defeatedGymsList"
          :defeated-gym-types="defeatedGyms" :pinned-type="pinnedGym" :persist-pinned-gym="persistPinnedGym" :generation-rules="generationRules"
          :draftActive="hasDraft"
          @defeatGym="defeatGym" @undefeatGym="undefeatGym" @swapSuggestion="handleSwapSuggestion" />
      </template>

      <SoulLinkShell
        v-else-if="!isSoloMode"
        :generation-rules="soulLinkGenerationRules"
        :tera-enabled="soulLinkTeraEnabled"
        :viewed-player-board="viewedSoulLinkPlayerBoard"
        :draft-active="hasDraft"
        :persist-pinned-gym="handleSoulLinkPersistPinnedGym"
        :partner-roster="soulLinkPartnerRoster"
        :player-id="viewedSoulLinkPlayerId"
        :death-box-mode="deathBoxMode"
        @autosaveDraft="handleSoulLinkAutosaveDraft"
        @immediateSwap="handleSoulLinkImmediateSwap"
        @deleteTeamPokemon="handleSoulLinkDeleteTeamPokemon"
        @deleteBoxPokemon="handleSoulLinkDeleteBoxPokemon"
        @cancelSwap="handleSoulLinkCancelSwap"
        @deletePokemon="handleSoulLinkDeleteFromDraft"
        @swapSuggestion="handleSoulLinkSwapSuggestion"
        @defeatGym="handleSoulLinkDefeatGym"
        @undefeatGym="handleSoulLinkUndefeatGym"
        @killPokemon="(e) => { handleSoulLinkKillPokemon(e); deathBoxMode = true }"
        @revivePokemon="(e) => { handleSoulLinkRevivePokemon(e); deathBoxMode = false }"
        @exitDeathBox="deathBoxMode = false"
        @deleteDeadPokemon="handleSoulLinkDeleteDeadPokemon"
      />
      </template>
    </div>
  </n-config-provider>

  <Teleport to="body">
    <Transition name="dialog">
    <div v-if="showResetDialog" class="reset-overlay" @click.self="showResetDialog = false">
      <div class="reset-dialog">
        <h3 class="reset-dialog-title">Options</h3>
        <div class="reset-dialog-options">
          <DialogActionSection>
            <div class="reset-option-group">
              <button class="reset-option" @click="toggleGenerationRules">
                {{ generationRulesLabel }}
              </button>
              <button class="reset-option" @click="toggleTeraTypes">
                {{ teraTypesLabel }}
              </button>
            </div>
          </DialogActionSection>
          <DialogActionSection v-if="allInactiveRuns.length > 0">
            <div class="reset-option-group">
              <div class="my-runs-header">Switch Run</div>
              <button
                v-for="run in allInactiveRuns"
                :key="run.id"
                class="reset-option"
                @click="run.type === 'solo' ? handleSwitchSoloRun(run.id) : handleSwitchRun(run.id)"
              >
                {{ run.label }}
              </button>
            </div>
          </DialogActionSection>
          <DialogActionSection v-if="isSupabaseAvailable">
            <div class="reset-option-group">
              <template v-if="showOptionsJoinInput">
                <div class="session-input-row">
                  <input
                    ref="optionsJoinInputEl"
                    v-model="optionsJoinCode"
                    class="session-code-input"
                    type="text"
                    maxlength="6"
                    placeholder="Invite code"
                    @keydown.enter="handleJoinRun"
                  />
                  <button class="reset-option session-confirm-btn" @click="handleJoinRun" :disabled="sessionActionPending">
                    Join
                  </button>
                </div>
                <div v-if="joinRunError" class="session-join-error">{{ joinRunError }}</div>
              </template>
              <button v-else class="reset-option" @click="openOptionsJoinInput">
                Join Run
              </button>
            </div>
          </DialogActionSection>
          <DialogActionSection>
            <div class="reset-option-group">
              <button class="reset-option" @click="resetPokemon">
                Reset Team & Box
              </button>
              <button class="reset-option" @click="resetGyms">
                Reset Gyms
              </button>
            </div>
          </DialogActionSection>
          <DialogActionSection v-if="(hasSoloRemoteSession && isSoloMode) || (hasRemoteSession && !isSoloMode)">
            <button class="reset-option" @click="isSoloMode ? handleLeaveSoloSession() : handleLeaveSoulLinkSession()">
              Leave This Run
            </button>
          </DialogActionSection>
          <DialogActionSection v-if="currentActiveRunId">
            <div class="reset-option-group">
              <button class="reset-option reset-option-danger" @click="deleteRunTarget = currentActiveRunId; showResetDialog = false">
                Delete This Run
              </button>
            </div>
          </DialogActionSection>
        </div>
        <button class="reset-dialog-cancel" @click="showResetDialog = false">✕</button>
      </div>
    </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <Transition name="dialog">
    <div v-if="deleteRunTarget" class="reset-overlay"
         @click.self="deleteRunTarget = null">
      <div class="reset-dialog">
        <h3 class="reset-dialog-title">Delete Run</h3>
        <p class="linked-delete-text">
          This run and all its data will be permanently deleted.
        </p>
        <div class="reset-dialog-options">
          <DialogActionSection>
            <button class="reset-option reset-option-danger"
                    @click="isSoloDeleteTarget ? handleDeleteSoloRun(deleteRunTarget) : handleDeleteRun(deleteRunTarget)">
              Delete
            </button>
          </DialogActionSection>
        </div>
        <button class="reset-dialog-cancel"
                @click="deleteRunTarget = null">✕</button>
      </div>
    </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <Transition name="dialog">
    <div v-if="linkedDeleteTarget" class="reset-overlay"
         @click.self="linkedDeleteTarget = null">
      <div class="reset-dialog">
        <h3 class="reset-dialog-title">Delete Linked Pair</h3>
        <p class="linked-delete-text">
          This linked Pokemon and its partner will both be deleted.
        </p>
        <div class="reset-dialog-options">
          <DialogActionSection>
            <button class="reset-option reset-option-danger"
                    @click="confirmLinkedDelete">
              Delete Both
            </button>
          </DialogActionSection>
        </div>
        <button class="reset-dialog-cancel"
                @click="linkedDeleteTarget = null">✕</button>
      </div>
    </div>
    </Transition>
  </Teleport>

  <SessionDialog
    v-model:visible="showSoulLinkDialog"
    title="Soul Link"
    :session-code="soulLinkSessionMetadata?.inviteCode"
    :copy-label="copyLabel"
    :has-remote-session="hasRemoteSession && isSupabaseAvailable"
    :show-view-player="!isSoloMode"
    :show-death-box="!isSoloMode"
    :other-player-name="otherSoulLinkPlayerName"
    new-run-label="New Soul Link Run"
    @copy-code="copyInviteCode"
    @view-death-box="handleViewDeathBox('soulLink')"
    @view-other-player="handleViewOtherSoulLinkPlayer"
    @new-run="startNewRun(RUN_MODES.SOUL_LINK)"
  />

  <SessionDialog
    v-model:visible="showSoloDialog"
    title="Solo Run"
    :session-code="soloInviteCode"
    :copy-label="soloCopyLabel"
    :has-remote-session="hasSoloRemoteSession && isSoloSyncAvailable"
    :show-death-box="isSoloMode"
    new-run-label="New Solo Run"
    @copy-code="copySoloInviteCode"
    @view-death-box="handleViewDeathBox('solo')"
    @new-run="startNewRun(RUN_MODES.SOLO)"
  />
</template>

<script setup>
import { NConfigProvider } from 'naive-ui'
import { computed, nextTick, ref, watch } from 'vue'
import AppHeader from './components/AppHeader.vue'
import DialogActionSection from './components/DialogActionSection.vue'
import GymColumns from './components/GymColumns.vue'
import SessionDialog from './components/SessionDialog.vue'
import SoulLinkShell from './components/SoulLinkShell.vue'
import TeamSection from './components/TeamSection.vue'
import { useDraftAction } from './composables/useDraftAction.js'
import { useRunOrchestration } from './composables/useRunOrchestration.js'
import { useRunStore } from './composables/useRunStore.js'
import { useSoloDraftHandlers } from './composables/useSoloDraftHandlers.js'
import { useSoloSync } from './composables/useSoloSync.js'
import { useSoulLinkHandlers } from './composables/useSoulLinkHandlers.js'
import { useSoulLinkStore } from './composables/useSoulLinkStore.js'
import { GENERATION_RULESETS } from './data/types.js'
import { themeOverrides } from './theme/colors.js'
import {
  sanitizeDraftActionForRules,
  sanitizePokemonCollectionForRules,
} from './utils/generationRules.js'
import {
  RUN_MODES,
  sanitizeTeraTypeForCollection,
} from './utils/runSnapshot.js'
import {
  adaptSoulLinkMemberToUiMember,
  buildSoulLinkPlayerBoard,
} from './utils/soulLinkUi.js'

const {
  team,
  defeatedGyms,
  box,
  dead,
  generationRules,
  persistGenerationRules,
  teraEnabled,
  persistTeraEnabled,
  pinnedGym,
  deleteTeamPokemon,
  deleteBoxPokemon,
  revivePokemon,
  deleteDeadPokemon,
  defeatGym,
  undefeatGym,
  persistPinnedGym,
} = useRunStore()

const {
  players: soulLinkPlayers,
  rosters: soulLinkRosters,
  gymProgress: soulLinkGymProgress,
  generationRules: soulLinkGenerationRules,
  teraEnabled: soulLinkTeraEnabled,
  localPreferences: soulLinkLocalPreferences,
  sessionMetadata: soulLinkSessionMetadata,
  setGenerationRules: setSoulLinkGenerationRules,
  setTeraEnabled: setSoulLinkTeraEnabled,
  getPlayerRoster,
  getFullPlayerRoster,
  setPlayerRoster: setSoulLinkPlayerRoster,
  updateRosterMember: updateSoulLinkRosterMember,
  removeRosterMember: removeSoulLinkRosterMember,
  pullState: pullSoulLinkState,
  pushState: pushSoulLinkState,
} = useSoulLinkStore()

const { swapMode, sanitizeDraft } = useDraftAction()

const { inviteCode: soloInviteCode, isAvailable: isSoloSyncAvailable } =
  useSoloSync()

const playerNameInput = ref(null)
const soloRunNameInput = ref(null)
const optionsJoinInputEl = ref(null)
const appTitle = computed(() =>
  isSoloMode.value ? 'Weakness Calculator' : viewedSoulLinkPlayerName.value,
)

const activeGenerationRules = computed(() =>
  isSoloMode.value ? generationRules.value : soulLinkGenerationRules.value,
)

function toggleGenerationRules() {
  const nextRuleset =
    activeGenerationRules.value === GENERATION_RULESETS.PRE_GEN_6
      ? GENERATION_RULESETS.POST_GEN_6
      : GENERATION_RULESETS.PRE_GEN_6

  if (isSoloMode.value) {
    persistGenerationRules(nextRuleset)
    return
  }

  setSoulLinkGenerationRules(nextRuleset)
}

const generationRulesLabel = computed(() => {
  return activeGenerationRules.value === GENERATION_RULESETS.PRE_GEN_6
    ? 'Using Pre-Gen 6 Rules'
    : 'Using Post-Gen 6 Rules'
})

const activeTeraEnabled = computed(() =>
  isSoloMode.value ? teraEnabled.value : soulLinkTeraEnabled.value,
)

function toggleTeraTypes() {
  const nextEnabled = !activeTeraEnabled.value

  if (!nextEnabled) clearPendingTeraTypes(Date.now())

  if (isSoloMode.value) {
    persistTeraEnabled(nextEnabled)
    return
  }

  setSoulLinkTeraEnabled(nextEnabled)
}

const teraTypesLabel = computed(() => {
  return activeTeraEnabled.value ? 'Disable Tera Types' : 'Enable Tera Types'
})

const viewedSoulLinkPlayerId = computed(() => {
  const preferredPlayerId = soulLinkLocalPreferences.value.preferredPlayerId
  const cachedPlayerSlot = soulLinkLocalPreferences.value.cachedPlayerSlot
  const devicePlayerId = soulLinkLocalPreferences.value.devicePlayerId

  return preferredPlayerId ?? cachedPlayerSlot ?? devicePlayerId
})

const viewedSoulLinkPlayer = computed(() => {
  return (
    soulLinkPlayers.value.find(
      (player) => player.id === viewedSoulLinkPlayerId.value,
    ) ?? soulLinkPlayers.value[0]
  )
})

const viewedSoulLinkPlayerName = computed(
  () => viewedSoulLinkPlayer.value?.name ?? 'Unknown Player',
)

const otherSoulLinkPlayerName = computed(() => {
  const other = soulLinkPlayers.value.find(
    (player) => player.id !== viewedSoulLinkPlayerId.value,
  )
  return other?.name ?? 'Other Player'
})

const soulLinkPartnerRoster = computed(() => {
  const partnerId = soulLinkPlayers.value.find(
    (p) => p.id !== viewedSoulLinkPlayerId.value,
  )?.id
  if (!partnerId) return null
  const roster = getFullPlayerRoster(partnerId)
  return [...roster.team, ...roster.box, ...(roster.dead ?? [])]
    .map(adaptSoulLinkMemberToUiMember)
    .filter(Boolean)
})

const viewedSoulLinkPlayerBoard = computed(() => {
  if (!viewedSoulLinkPlayer.value) {
    return {
      team: [],
      box: [],
      remainingGyms: [],
      defeatedGymsList: [],
      pinnedGym: null,
    }
  }

  return buildSoulLinkPlayerBoard(
    viewedSoulLinkPlayer.value.id,
    soulLinkRosters.value,
    soulLinkGymProgress.value,
    soulLinkGenerationRules.value,
    soulLinkPartnerRoster.value,
  )
})

const {
  linkedDeleteTarget,
  soulLinkSwapOriginalRoster,
  handleSoulLinkConfirmDraft: confirmSoulLinkDraft,
  handleSoulLinkImmediateSwap,
  handleSoulLinkCancelSwap,
  handleSoulLinkSwapSuggestion,
  handleSoulLinkDeleteTeamPokemon,
  handleSoulLinkDeleteBoxPokemon,
  handleSoulLinkDeleteFromDraft,
  handleSoulLinkDefeatGym,
  handleSoulLinkUndefeatGym,
  handleSoulLinkPersistPinnedGym,
  confirmLinkedDelete,
  handleSoulLinkKillPokemon,
  handleSoulLinkRevivePokemon,
  handleSoulLinkDeleteDeadPokemon,
} = useSoulLinkHandlers(
  viewedSoulLinkPlayerId,
  soulLinkGenerationRules,
  soulLinkPlayers,
)

const {
  hasDraft,
  remainingGyms,
  defeatedGymsList,
  autosaveDraft,
  handleImmediateSwap,
  handleDeleteFromDraft,
  handleSwapSuggestion,
  handleCancelSwap,
  handleSoloKillPokemon,
  handleSoloRevivePokemon,
  handleSoloDeleteDeadPokemon,
  captureSwapOriginal,
  resetSwapOriginal,
  clearSoloTeraTypes,
  swapOriginalState,
} = useSoloDraftHandlers()

const {
  deathBoxMode,
  showResetDialog,
  showSoloDialog,
  showSoulLinkDialog,
  deleteRunTarget,
  ready,
  isSoloMode,
  currentActiveRunId,
  isSupabaseAvailable,
  hasRemoteSession,
  hasSoloRemoteSession,
  activeLoadError,
  soloRunDisplayName,
  allInactiveRuns,
  isSoloDeleteTarget,
  sessionActionPending,
  showOptionsJoinInput,
  optionsJoinCode,
  joinRunError,
  copyLabel,
  soloCopyLabel,
  retryLoad,
  resetPokemon,
  resetGyms,
  handleJoinRun,
  handleSwitchRun,
  handleSwitchSoloRun,
  handleDeleteRun,
  handleDeleteSoloRun,
  handleLeaveSoloSession,
  handleLeaveSoulLinkSession,
  handleViewDeathBox,
  handleViewOtherSoulLinkPlayer,
  handleRenameSoloRun,
  handleRenameViewedSoulLinkPlayerInput,
  copyInviteCode,
  copySoloInviteCode,
  startNewRun,
} = useRunOrchestration({
  viewedSoulLinkPlayerId,
  cancelSwap: handleCancelSwap,
  resetSwapOriginal,
  handleSoulLinkCancelSwap,
  soulLinkSwapOriginalRoster,
})

function handleSoulLinkAutosaveDraft() {
  const result = confirmSoulLinkDraft({ closeAfterPersist: false })
  if (result?.placedInDead) {
    deathBoxMode.value = true
  }
}

function selectPlayerNameInput() {
  playerNameInput.value?.select()
}

function openOptionsJoinInput() {
  showOptionsJoinInput.value = true
  nextTick(() => optionsJoinInputEl.value?.focus())
}

watch(swapMode, (isSwapMode) => {
  if (isSwapMode) {
    captureSwapOriginal()
    if (!isSoloMode.value && !soulLinkSwapOriginalRoster.value) {
      soulLinkSwapOriginalRoster.value = getPlayerRoster(
        viewedSoulLinkPlayerId.value,
      )
    }
  } else {
    resetSwapOriginal()
  }
})

watch(generationRules, (ruleset) => {
  sanitizeDraft((draft) => sanitizeDraftActionForRules(draft, ruleset))

  if (swapOriginalState.value) {
    swapOriginalState.value = {
      team: sanitizePokemonCollectionForRules(
        swapOriginalState.value.team,
        ruleset,
      ),
      box: sanitizePokemonCollectionForRules(
        swapOriginalState.value.box,
        ruleset,
      ),
    }
  }
})

function clearPendingTeraTypes(clearedAt = null) {
  clearSoloTeraTypes(clearedAt)

  if (soulLinkSwapOriginalRoster.value) {
    const original = soulLinkSwapOriginalRoster.value
    soulLinkSwapOriginalRoster.value = {
      ...original,
      team: sanitizeTeraTypeForCollection(original.team, false, clearedAt),
      box: sanitizeTeraTypeForCollection(original.box, false, clearedAt),
      ...(original.dead
        ? {
            dead: sanitizeTeraTypeForCollection(
              original.dead,
              false,
              clearedAt,
            ),
          }
        : {}),
    }
  }
}

watch(activeTeraEnabled, (enabled) => {
  if (!enabled) clearPendingTeraTypes()
})

if (import.meta.env.DEV) {
  import('./utils/devTools.js').then(({ createDevTools }) => {
    window.__sl = createDevTools({
      players: soulLinkPlayers,
      rosters: soulLinkRosters,
      sessionMetadata: soulLinkSessionMetadata,
      updateRosterMember: updateSoulLinkRosterMember,
      removeRosterMember: removeSoulLinkRosterMember,
      setPlayerRoster: setSoulLinkPlayerRoster,
      pullState: pullSoulLinkState,
      pushState: pushSoulLinkState,
    })
  })
}
</script>

<style scoped>
.app-container {
  position: relative;
  max-width: 900px;
  margin: 0 auto;
  animation: fadeIn var(--transition-slow) ease forwards;
}

.title-player-row {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: min(100%, 28rem);
}

.title-player-field {
  display: inline-flex;
  flex: 0 1 auto;
  min-width: 0;
}

.title-player-input {
  width: auto;
  max-width: min(100%, 24rem);
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-primary);
  font: inherit;
  font-weight: 700;
  text-align: center;
  cursor: text;
  background-image: linear-gradient(135deg, var(--color-primary) 0%, var(--color-success) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-player-input:focus {
  outline: none;
}

.title-player-input::selection {
  -webkit-text-fill-color: var(--color-text-primary);
}

@media (orientation: landscape) and (max-height: 500px) {
  .app-container {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--space-4);
    max-width: 100%;
  }

  .app-container :deep(.app-header) {
    flex: 0 0 100%;
    margin-bottom: var(--space-2);
  }

  .app-container :deep(.app-header .header-actions) {
    justify-self: center;
  }

  .load-error-banner {
    background: var(--color-danger);
    color: white;
    text-align: center;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-4);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    animation: fadeIn var(--transition-base) ease forwards;
  }

}

@media (min-width: 1024px) {
  .app-container {
    max-width: 1200px;
  }
}
</style>

<style>
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity var(--transition-base);
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-active .reset-dialog,
.dialog-leave-active .reset-dialog {
  transition: transform var(--transition-base), opacity var(--transition-base);
}

.dialog-enter-from .reset-dialog,
.dialog-leave-to .reset-dialog {
  opacity: 0;
  transform: scale(0.95);
}

.reset-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.reset-dialog {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  padding: var(--space-6);
  min-width: 220px;
  text-align: center;
  position: relative;
}

.reset-dialog-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: var(--space-4);
  color: var(--color-text-primary);
}

.reset-dialog-options {
  display: flex;
  flex-direction: column;
}

.reset-option {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  -webkit-appearance: none;
  appearance: none;
  padding: var(--space-2) var(--space-4);
  font-size: 0.95rem;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background var(--transition-base), border-color var(--transition-base);
  -webkit-tap-highlight-color: transparent;
}

.reset-option:focus,
.reset-option:focus-visible,
.reset-option:active {
  background: transparent;
  outline: none;
}

.reset-option-danger {
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.reset-option-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

@media (hover: hover) and (pointer: fine) {
  .reset-option:hover:not(:disabled) {
    background: var(--color-surface-light);
    border-color: var(--color-text-muted);
  }

  .reset-option-danger:hover {
    background: rgba(239, 68, 68, 0.08);
    border-color: var(--color-danger);
  }
}

.reset-dialog-cancel {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: 1rem;
  cursor: pointer;
  padding: var(--space-1);
  transition: color var(--transition-base);
}

.reset-dialog-cancel:hover {
  color: var(--color-text-primary);
}

.linked-delete-text {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin-bottom: var(--space-4);
}

.session-input-row {
  display: flex;
  gap: var(--space-2);
}

.session-code-input {
  flex: 1;
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface-light);
  color: var(--color-text-primary);
  font-size: 1rem;
  font-family: monospace;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  text-align: center;
}

.session-code-input::placeholder {
  text-transform: none;
  letter-spacing: normal;
  color: var(--color-text-muted);
}

.session-confirm-btn {
  flex-shrink: 0;
}

.session-join-error {
  color: var(--color-danger);
  font-size: 0.8rem;
  margin-top: var(--space-1);
}

.session-code-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-family: monospace;
  font-size: 0.95rem;
  letter-spacing: 0.15em;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background var(--transition-base);
}

.session-code-hint {
  font-family: inherit;
  font-size: 0.7rem;
  letter-spacing: normal;
  color: var(--color-text-muted);
}

@media (hover: hover) and (pointer: fine) {
  .session-code-display:hover {
    background: var(--color-surface-light);
  }
}

.my-runs-header {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-1);
}

@media (orientation: landscape) and (max-height: 500px) {
  .app-container .team-section-wrapper {
    flex: 1;
    min-width: 0;
  }

  .app-container .gym-section-wrapper {
    flex: 1;
    min-width: 0;
  }
}

</style>
