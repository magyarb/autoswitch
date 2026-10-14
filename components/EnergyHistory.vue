<template>
  <section>
    <div class="section-header">
      <h2 class="section-title">History</h2>
      <v-btn
        :icon="mdiRefresh"
        variant="text"
        density="comfortable"
        size="small"
        :loading="isLoading"
        aria-label="Refresh history"
        @click="refresh"
      />
      <v-spacer />
      <div class="controls">
        <v-btn-toggle v-model="range" mandatory density="compact" variant="text" class="segmented">
          <v-btn v-for="(r, key) in HISTORY_RANGES" :key="key" :value="key">{{ r.label }}</v-btn>
        </v-btn-toggle>
        <v-btn-toggle v-model="view" mandatory density="compact" variant="text" class="segmented">
          <v-btn value="total">Total</v-btn>
          <v-btn value="phases">Per phase</v-btn>
        </v-btn-toggle>
        <v-btn-toggle v-model="display" mandatory density="compact" variant="text" class="segmented">
          <v-btn value="chart" aria-label="Chart"><v-icon :icon="mdiChartLine" size="18" /></v-btn>
          <v-btn value="table" aria-label="Table"><v-icon :icon="mdiTable" size="18" /></v-btn>
        </v-btn-toggle>
      </div>
    </div>

    <div class="panel pa-4">
      <v-alert v-if="loadError" type="error" variant="tonal" density="compact" class="mb-3">{{ loadError }}</v-alert>

      <div v-if="!rows.length" class="placeholder" :style="{ height: `${CHART_HEIGHT}px` }">
        <v-progress-circular v-if="isLoading" indeterminate size="28" width="2" />
        <span v-else-if="!loadError" class="muted">No records in this range yet</span>
      </div>

      <!-- while reloading, keep the previous frame at reduced opacity -->
      <div v-else :class="{ refetching: isLoading }">
        <template v-if="display === 'chart'">
          <div class="legend">
            <span class="legend-item"><span class="line-key production"></span>Production</span>
            <span class="legend-item"><span class="line-key consumption"></span>Consumption</span>
          </div>
          <LineChart
            v-if="view === 'total'"
            :series="totalSeries"
            :from="from * 1000"
            :to="to * 1000"
            :tick-hours="rangeConfig.tickHours"
            :height="CHART_HEIGHT"
            :has-end-labels="true"
            description="Production and consumption over time, all phases"
          />
          <v-row v-else dense>
            <v-col v-for="(phase, i) in PHASES" :key="phase" cols="12" md="4">
              <div class="phase-title">Phase {{ phase }}</div>
              <LineChart
                :series="phaseSeries[i]"
                :from="from * 1000"
                :to="to * 1000"
                :tick-hours="rangeConfig.tickHours * (rangeConfig.tickHours < 24 ? 2 : 1)"
                :height="PHASE_CHART_HEIGHT"
                :suggested-min="phaseScale.min"
                :suggested-max="phaseScale.max"
                :description="`Production and consumption over time, phase ${phase}`"
              />
            </v-col>
          </v-row>
        </template>

        <div v-else class="table-wrap">
          <v-table density="compact" fixed-header height="360">
            <thead>
              <tr>
                <th>Time</th>
                <template v-if="view === 'total'">
                  <th class="text-end">Production</th>
                  <th class="text-end">Consumption</th>
                  <th class="text-end">Balance</th>
                </template>
                <template v-else>
                  <template v-for="phase in PHASES" :key="phase">
                    <th class="text-end">{{ phase }} production</th>
                    <th class="text-end">{{ phase }} consumption</th>
                  </template>
                </template>
              </tr>
            </thead>
            <tbody class="numeric">
              <tr v-for="row in tableRows" :key="row.ts">
                <td>{{ formatDateTime(row.ts * 1000) }}</td>
                <template v-if="view === 'total'">
                  <td class="text-end">{{ formatPower(sum(row.production)) }}</td>
                  <td class="text-end">{{ formatPower(sum(row.consumption)) }}</td>
                  <td class="text-end">{{ formatPower(balance(row), true) }}</td>
                </template>
                <template v-else>
                  <template v-for="(phase, i) in PHASES" :key="phase">
                    <td class="text-end">{{ formatPower(row.production?.[i]) }}</td>
                    <td class="text-end">{{ formatPower(row.consumption?.[i]) }}</td>
                  </template>
                </template>
              </tr>
            </tbody>
          </v-table>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { mdiChartLine, mdiRefresh, mdiTable } from '@mdi/js'
import LineChart, { ChartSeries } from '~/components/LineChart.vue'
import { HISTORY_RANGES, HistoryRange, HistoryRow, PhasePower } from '~/composables/useEnergyHistory'
import { formatDateTime, formatPower } from '~/utils/format'

const PHASES = ['A', 'B', 'C'] as const
const CHART_HEIGHT = 300
const PHASE_CHART_HEIGHT = 200

const range = ref<HistoryRange>('24h')
const view = ref<'total' | 'phases'>('total')
const display = ref<'chart' | 'table'>('chart')

const { rows, from, to, isLoading, loadError, refresh } = useEnergyHistory(range)
const rangeConfig = computed(() => HISTORY_RANGES[range.value])

const sum = (power: PhasePower | null) => (power ? power[0] + power[1] + power[2] : null)
const balance = (row: HistoryRow) => {
  const production = sum(row.production)
  const consumption = sum(row.consumption)
  return production === null || consumption === null ? null : production - consumption
}

function series(pick: (power: PhasePower | null) => number | null): ChartSeries[] {
  return [
    {
      key: 'production',
      label: 'Production',
      colorVar: '--series-production',
      isFilled: true,
      points: rows.value.map(row => ({ x: row.ts * 1000, y: pick(row.production) }))
    },
    {
      key: 'consumption',
      label: 'Consumption',
      colorVar: '--series-consumption',
      isFilled: false,
      points: rows.value.map(row => ({ x: row.ts * 1000, y: pick(row.consumption) }))
    }
  ]
}

const totalSeries = computed(() => series(sum))
const phaseSeries = computed(() => PHASES.map((_, i) => series(power => (power ? power[i] : null))))

// small multiples share one y scale so the phases can be compared
const phaseScale = computed(() => {
  let min = 0
  let max = 0
  for (const row of rows.value) {
    for (const power of [row.production, row.consumption]) {
      if (!power) continue
      min = Math.min(min, ...power)
      max = Math.max(max, ...power)
    }
  }
  return { min, max }
})

const tableRows = computed(() => rows.value.slice().reverse())
</script>

<style scoped>
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.refetching {
  opacity: 0.5;
  transition: opacity 0.2s;
}

.legend {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--viz-text-secondary);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.line-key {
  display: inline-block;
  width: 16px;
  height: 2px;
  border-radius: 1px;
}

.line-key.production {
  background: var(--series-production);
}

.line-key.consumption {
  background: var(--series-consumption);
}

.phase-title {
  font-size: 13px;
  color: var(--viz-text-secondary);
  margin: 4px 0;
}

.numeric {
  font-variant-numeric: tabular-nums;
}
</style>
