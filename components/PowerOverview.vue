<template>
  <v-row :class="{ stale: isStale }">
    <v-col cols="12" md="5">
      <div class="panel pa-5 fill-height d-flex flex-column">
        <div class="label">Balance</div>
        <div class="hero">{{ formatPower(totals?.balance, true) }}</div>
        <div v-if="totals" class="status">
          <v-icon :icon="direction.icon" size="18" :color="direction.color" />
          <span>{{ direction.label }}</span>
        </div>
        <v-spacer />
        <div class="stats">
          <div class="stat">
            <div class="label"><span class="key production"></span>Production</div>
            <div class="stat-value">{{ formatPower(totals?.production) }}</div>
          </div>
          <div class="stat">
            <div class="label"><span class="key consumption"></span>Consumption</div>
            <div class="stat-value">{{ formatPower(totals?.consumption) }}</div>
          </div>
          <div class="stat">
            <div class="label">Consumers on</div>
            <div class="stat-value">
              {{ activeConsumers.count }}<span class="muted"> / {{ consumers.length }}</span>
            </div>
          </div>
        </div>
      </div>
    </v-col>

    <v-col cols="12" md="7">
      <div class="panel pa-5 fill-height">
        <div class="d-flex align-center mb-3">
          <div class="label">Per phase</div>
          <v-spacer />
          <div class="legend">
            <span class="legend-item"><span class="rect-key production"></span>Production</span>
            <span class="legend-item"><span class="rect-key consumption"></span>Consumption</span>
          </div>
        </div>
        <div v-for="phase in phases" :key="phase.name" class="phase">
          <div class="phase-name">{{ phase.name }}</div>
          <div class="bars">
            <div class="bar-row" :title="`Phase ${phase.name} production: ${formatPower(phase.production)}`">
              <div
                class="bar production"
                :style="{ width: barWidth(phase.production), minWidth: barMinWidth(phase.production) }"
              ></div>
              <span class="bar-value">{{ formatPower(phase.production) }}</span>
            </div>
            <div class="bar-row" :title="`Phase ${phase.name} consumption: ${formatPower(phase.consumption)}`">
              <div
                class="bar consumption"
                :style="{ width: barWidth(phase.consumption), minWidth: barMinWidth(phase.consumption) }"
              ></div>
              <span class="bar-value">{{ formatPower(phase.consumption) }}</span>
            </div>
          </div>
          <div class="phase-balance">
            <v-icon
              v-if="phase.balance !== null"
              :icon="phase.balance >= 0 ? mdiArrowUpThin : mdiArrowDownThin"
              size="18"
              :color="phase.balance >= 0 ? 'success' : 'warning'"
            />
            {{ formatPower(phase.balance, true) }}
          </div>
        </div>
      </div>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import {
  mdiArrowDownThin,
  mdiArrowUpThin,
  mdiScaleBalance,
  mdiTransmissionTowerExport,
  mdiTransmissionTowerImport
} from '@mdi/js'
import { Consumer, ControllerData } from '~/stores/main'
import { formatPower } from '~/utils/format'

const props = defineProps<{
  data: ControllerData | null
  consumers: Consumer[]
  isStale: boolean
}>()

// below this the grid exchange is shown as balanced
const BALANCED_W = 50

const phases = computed(() =>
  (['a', 'b', 'c'] as const).map(p => {
    const production = props.data ? props.data[`${p}_production`] : null
    const consumption = props.data ? props.data[`${p}_consumption`] : null
    return {
      name: p.toUpperCase(),
      production,
      consumption,
      balance: production === null || consumption === null ? null : production - consumption
    }
  })
)

const totals = computed(() => {
  if (!props.data) return null
  const production = phases.value.reduce((s, p) => s + (p.production ?? 0), 0)
  const consumption = phases.value.reduce((s, p) => s + (p.consumption ?? 0), 0)
  return { production, consumption, balance: production - consumption }
})

const direction = computed(() => {
  const balance = totals.value?.balance ?? 0
  if (Math.abs(balance) < BALANCED_W) return { label: 'Balanced', icon: mdiScaleBalance, color: undefined }
  if (balance > 0) return { label: 'Exporting surplus', icon: mdiTransmissionTowerExport, color: 'success' }
  return { label: 'Importing from grid', icon: mdiTransmissionTowerImport, color: 'warning' }
})

const activeConsumers = computed(() => ({
  count: props.consumers.filter(c => c.online && c.status === 'on').length
}))

// one scale for all phases; bars use at most 75% of the track so the value fits after them
const scaleMax = computed(() => Math.max(100, ...phases.value.flatMap(p => [p.production ?? 0, p.consumption ?? 0])))
const barWidth = (value: number | null) => `${(Math.max(0, value ?? 0) / scaleMax.value) * 75}%`
// no bar at all without data, but a visible stub for a real near-zero value
const barMinWidth = (value: number | null) => (value === null ? '0' : '2px')
</script>

<style scoped>
.stale {
  opacity: 0.55;
  transition: opacity 0.2s;
}

.label {
  font-size: 13px;
  color: var(--viz-text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.hero {
  font-size: 56px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin-top: 4px;
}

.status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--viz-text-secondary);
  margin-top: 4px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--viz-hairline);
}

.stat-value {
  font-size: 22px;
  font-weight: 600;
  margin-top: 2px;
}

.key {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.key.production,
.rect-key.production,
.bar.production {
  background: var(--series-production);
}

.key.consumption,
.rect-key.consumption,
.bar.consumption {
  background: var(--series-consumption);
}

.legend {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--viz-text-secondary);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.rect-key {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.phase {
  display: grid;
  grid-template-columns: 28px 1fr 96px;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
}

.phase + .phase {
  border-top: 1px solid var(--viz-hairline);
}

.phase-name {
  font-weight: 600;
  color: var(--viz-text-secondary);
}

.bars {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 18px;
}

/* square at the baseline, 4px rounded data-end */
.bar {
  height: 12px;
  border-radius: 0 4px 4px 0;
  transition: width 0.4s ease;
}

.bar-value {
  font-size: 12px;
  color: var(--viz-text-secondary);
  white-space: nowrap;
}

.phase-balance {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  font-weight: 600;
  white-space: nowrap;
}

@media (max-width: 600px) {
  .hero {
    font-size: 48px;
  }

  .stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
