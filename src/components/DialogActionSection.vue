<template>
  <section class="dialog-action-section">
    <slot />
  </section>
</template>

<style scoped>
.dialog-action-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.dialog-action-section + .dialog-action-section {
  margin-top: var(--space-4);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
}
</style>
