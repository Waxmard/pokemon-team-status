<template>
  <header class="app-header">
    <div class="header-actions">
      <slot name="actions" />
    </div>
    <div class="header-title">
      <slot name="title" />
    </div>
    <div class="header-spacer" />
  </header>
</template>

<style scoped>
.app-header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-4);
}

.header-actions {
  justify-self: start;
  display: flex;
  gap: 2px;
}

.header-actions :slotted(button) {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0;
  min-height: 24px;
  min-width: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  filter: var(--drop-shadow-icon);
  transition: color var(--transition-base);
  -webkit-tap-highlight-color: transparent;
}

.header-title {
  justify-self: center;
  min-width: 0;
  max-width: 100%;
}

.header-title :slotted(*) {
  font-size: 1.15rem;
}

@media (hover: hover) and (pointer: fine) {
  .header-actions :slotted(button:hover) {
    color: rgba(139, 92, 246, 1);
  }
}

@media (min-width: 1024px) {
  .app-header {
    padding: var(--space-3) var(--space-4);
    margin-bottom: var(--space-6);
  }

  .header-actions :slotted(button) {
    font-size: 1.15rem;
    min-height: 36px;
    min-width: 36px;
  }

  .header-title :slotted(*) {
    font-size: 1.5rem;
  }
}
</style>
