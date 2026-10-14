<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon class="mr-2">$mdi-chart-line</v-icon>Last 24 hours
      <v-spacer />
      <v-btn icon flat :loading="isLoading" @click="load">
        <v-icon>$mdi-refresh</v-icon>
      </v-btn>
    </v-card-title>
    <v-card-text>
      <v-alert v-if="loadError" type="error" variant="tonal" class="mb-4">{{ loadError }}</v-alert>
      <Line :data="chartData" :options="chartOptions" />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement
} from 'chart.js'
import { useMainStore } from '~/stores/main'

ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement)

const KEYS = ['a_total_act_energy', 'b_total_act_energy', 'c_total_act_energy']
const PHASES = ['A', 'B', 'C']
const PHASE_COLORS = ['#e2741a', '#03DAC5', '#9575CD']
const MAX_PAGES = 50

// per phase: timestamp (s) -> average power (W)
type PhaseSeries = Map<number, number>[]

const mainStore = useMainStore()
const shelly = useShelly()

const isLoading = ref(false)
const loadError = ref<string | null>(null)
const production = ref<PhaseSeries>([])
const consumption = ref<PhaseSeries>([])

// EMData.GetData is paginated and may contain several blocks (one per gap in the
// recording), so every row gets its timestamp from its own block.
async function loadMeter(ip: string, from: number, to: number): Promise<PhaseSeries> {
  const series: PhaseSeries = KEYS.map(() => new Map())
  let ts = from
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await shelly.getEmData(ip, ts, to)
    const columns = KEYS.map(key => result.keys.indexOf(key))
    for (const block of result.data) {
      block.values.forEach((row, i) => {
        const rowTs = block.ts + i * block.period
        // energy per period (Wh) -> average power (W)
        columns.forEach((column, phase) => {
          if (column >= 0) series[phase].set(rowTs, (row[column] * 3600) / block.period)
        })
      })
    }
    if (!result.next_record_ts || result.next_record_ts <= ts) break
    ts = result.next_record_ts
  }
  return series
}

async function load() {
  if (isLoading.value) return
  isLoading.value = true
  loadError.value = null
  const to = Math.round(Date.now() / 1000)
  const from = to - 24 * 60 * 60
  try {
    const [prod, cons] = await Promise.all([
      loadMeter(mainStore.productionIp, from, to),
      loadMeter(mainStore.consumptionIp, from, to)
    ])
    production.value = prod
    consumption.value = cons
  } catch (e) {
    loadError.value = `Could not load the chart data: ${errorMessage(e)}`
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

const chartData = computed(() => {
  // align both meters on the union of their timestamps; missing points become gaps
  const timestamps = new Set<number>()
  for (const series of [...production.value, ...consumption.value]) {
    for (const ts of series.keys()) timestamps.add(ts)
  }
  const sorted = [...timestamps].sort((a, b) => a - b)

  const dataset = (label: string, series: Map<number, number> | undefined, phase: number, isDashed: boolean) => ({
    label,
    data: sorted.map(ts => series?.get(ts) ?? null),
    borderColor: PHASE_COLORS[phase],
    backgroundColor: PHASE_COLORS[phase],
    borderDash: isDashed ? [6, 4] : [],
    borderWidth: 1.5,
    pointRadius: 0,
    tension: 0.2
  })

  return {
    labels: sorted.map(ts => new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
    datasets: [
      ...PHASES.map((phase, i) => dataset(`Production ${phase}`, production.value[i], i, false)),
      ...PHASES.map((phase, i) => dataset(`Consumption ${phase}`, consumption.value[i], i, true))
    ]
  }
})

const chartOptions = {
  animation: false as const,
  interaction: { mode: 'index' as const, intersect: false },
  scales: {
    y: { title: { display: true, text: 'W' } }
  }
}
</script>
