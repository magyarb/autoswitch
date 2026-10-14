<template>
  <section>
    <div class="section-header">
      <h2 class="section-title">Controller activity</h2>
      <span class="muted ml-3 hint">What the script did recently, newest first</span>
    </div>
    <div class="panel">
      <div v-if="!isSupported" class="empty muted">
        The installed script doesn't keep an activity log yet. Install the update above.
      </div>
      <div v-else-if="!entries.length" class="empty muted">{{ loadError ?? 'No activity yet' }}</div>
      <div v-for="entry in entries" :key="entry.seq" class="entry">
        <span class="time">{{ entry.ts ? formatEntryTime(entry.ts) : '' }}</span>
        <v-icon :icon="LEVELS[entry.level].icon" size="16" :color="LEVELS[entry.level].color" />
        <span class="message">{{ entry.msg }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { mdiAlertCircle, mdiAlertOutline, mdiInformationOutline } from '@mdi/js'

const LEVELS = {
  info: { icon: mdiInformationOutline, color: undefined },
  warn: { icon: mdiAlertOutline, color: 'warning' },
  error: { icon: mdiAlertCircle, color: 'error' }
}

const { entries, isSupported, loadError } = useDeviceActivity()

function formatEntryTime(ts: number) {
  const date = new Date(ts * 1000)
  const isToday = date.toDateString() === new Date().toDateString()
  return isToday
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : date.toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.empty {
  padding: 24px;
  text-align: center;
}

.hint {
  font-size: 13px;
}

.entry {
  display: grid;
  grid-template-columns: 84px 18px 1fr;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  font-size: 14px;
}

.entry + .entry {
  border-top: 1px solid var(--viz-hairline);
}

.time {
  color: var(--viz-muted);
  font-variant-numeric: tabular-nums;
  font-size: 13px;
}
</style>
