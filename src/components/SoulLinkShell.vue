<template>
  <section class="soul-link-shell">
    <header class="shell-header">
      <div>
        <p class="shell-eyebrow">Soul Link</p>
        <h2 class="shell-title">{{ title }}</h2>
      </div>
      <div class="shell-meta">
        <span class="shell-chip">Viewing {{ viewedPlayerName }}</span>
        <span class="shell-chip">{{ generationLabel }}</span>
      </div>
    </header>

    <div class="player-grid">
      <article
        v-for="player in playerSummaries"
        :key="player.id"
        class="player-card"
        :class="{ 'player-card-viewed': player.isViewed }"
      >
        <div class="player-card-header">
          <h3>{{ player.name }}</h3>
          <span class="player-role">{{ player.roleLabel }}</span>
        </div>
        <p class="player-counts">Team {{ player.teamCount }} · Box {{ player.boxCount }}</p>
        <p class="player-progress">
          Defeated gyms {{ player.defeatedGymCount }} · Pinned {{ player.pinnedGymLabel }}
        </p>
      </article>
    </div>
  </section>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  viewedPlayerName: {
    type: String,
    required: true,
  },
  generationLabel: {
    type: String,
    required: true,
  },
  playerSummaries: {
    type: Array,
    required: true,
  },
})
</script>

<style scoped>
.soul-link-shell {
  display: grid;
  gap: var(--space-4);
}

.shell-header,
.player-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
}

.shell-header {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-5);
}

.shell-eyebrow {
  margin: 0 0 var(--space-1);
  color: var(--color-text-muted);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.shell-title {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 1.4rem;
}

.shell-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.shell-chip {
  background: var(--color-surface-light);
  border-radius: 999px;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  padding: var(--space-1) var(--space-3);
}

.player-grid {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.player-card {
  padding: var(--space-4);
}

.player-card-viewed {
  border-color: var(--color-primary);
}

.player-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.player-card-header h3,
.player-counts,
.player-progress {
  margin: 0;
}

.player-card-header h3 {
  color: var(--color-text-primary);
  font-size: 1.05rem;
}

.player-role {
  color: var(--color-text-muted);
  font-size: 0.82rem;
  font-weight: 600;
  text-transform: uppercase;
}

.player-counts,
.player-progress {
  color: var(--color-text-secondary);
  font-size: 0.95rem;
}

.player-counts {
  margin-top: var(--space-3);
}

.player-progress {
  margin-top: var(--space-1);
}
</style>
