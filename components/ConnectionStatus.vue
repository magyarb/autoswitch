<template>
  <div class="connection" :title="title">
    <span class="dot" :class="state.kind"></span>
    <span class="text">{{ state.label }}</span>
  </div>
</template>

<script setup lang="ts">
import { useMainStore } from '~/stores/main'
import { formatAgo } from '~/utils/format'

const LIVE_MS = 10000

const mainStore = useMainStore()
const now = useNow()

const state = computed(() => {
  if (mainStore.loadError) return { kind: 'offline', label: 'Offline' }
  if (!mainStore.lastUpdated) return { kind: 'connecting', label: 'Connecting…' }
  if (now.value - mainStore.lastUpdated < LIVE_MS) return { kind: 'live', label: 'Live' }
  return { kind: 'stale', label: `Updated ${formatAgo(mainStore.lastUpdated, now.value)}` }
})

const title = computed(() => `Controller ${mainStore.controllerIp}`)
</script>

<style scoped>
.connection {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--viz-text-secondary);
  padding: 0 12px;
  white-space: nowrap;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--viz-muted);
}

.dot.live {
  background: var(--status-good);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--status-good) 25%, transparent);
}

.dot.stale {
  background: var(--status-warning);
}

.dot.offline {
  background: var(--status-critical);
}
</style>
