<template>
  <v-row>
    <v-col cols="12" class="text-h4 d-flex align-center">
      <div>Status</div>
      <v-spacer></v-spacer>
      <v-btn color="primary" @click="showChart = !showChart">{{ showChart ? 'hide chart' : 'show chart' }}</v-btn>
    </v-col>

    <v-col v-if="loadError" cols="12">
      <v-alert type="error" variant="tonal">
        Cannot reach the controller at {{ mainStore.controllerIp }}: {{ loadError }}
      </v-alert>
    </v-col>
    <v-col v-else-if="cData && !cData.meters_ok" cols="12">
      <v-alert type="warning" variant="tonal">
        The controller cannot read the energy meters, automatic switching is paused.
      </v-alert>
    </v-col>

    <v-col v-for="card in cards" :key="card.title" cols="12" lg="4">
      <v-card>
        <v-card-title
          ><v-icon class="mr-2">{{ card.icon }}</v-icon
          >{{ card.title }}</v-card-title
        >
        <v-card-text>
          <v-row>
            <v-col v-for="phase in PHASES" :key="phase" cols="12" lg="4">
              <p class="text-end text-body-1">{{ phase }}</p>
              <p class="text-end text-h6">{{ formatW(card.values?.[phase]) }}</p>
            </v-col>
            <v-col cols="12" lg="12">
              <p class="text-center text-h5">Total</p>
              <p class="text-center text-h4">{{ formatW(card.values?.total) }}</p>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col v-if="showChart" cols="12">
      <EnergyChart />
    </v-col>

    <v-col cols="12" class="text-h4 d-flex align-center">
      <div>Consumers</div>
      <v-spacer></v-spacer>
      <v-btn color="primary" @click="addConsumer"><v-icon>$mdi-plus</v-icon>add consumer</v-btn>
    </v-col>
    <v-col cols="12">
      <v-table>
        <thead>
          <tr>
            <th class="text-start">Priority</th>
            <th class="text-start">Name</th>
            <th class="text-start">Phase</th>
            <th class="text-end">Status</th>
            <th class="text-end">Consumption</th>
            <th class="text-end">Mode</th>
            <th class="text-end">Edit</th>
          </tr>
        </thead>
        <draggable
          v-model="mainStore.consumers"
          tag="tbody"
          item-key="name"
          handle=".handle"
          @start="isDragging = true"
          @end="orderChanged"
        >
          <template #item="{ element: consumer, index }">
            <tr>
              <td class="text-start handle">
                <v-icon>$mdi-menu</v-icon>
                {{ index + 1 }}
              </td>
              <td>{{ consumer.name }}</td>
              <td>{{ consumer.phase }}</td>
              <td class="text-end">
                <v-chip v-if="!consumer.online" color="grey">OFFLINE</v-chip>
                <v-chip v-else :color="statusColor(consumer.status)">{{ consumer.status.toUpperCase() }}</v-chip>
              </td>
              <td class="text-end">{{ formatW(consumer.current_consumption) }}</td>
              <td class="text-end">
                <v-btn-toggle
                  :model-value="consumer.mode"
                  density="compact"
                  mandatory
                  :divided="true"
                  variant="outlined"
                  @update:model-value="changeMode(consumer, $event)"
                >
                  <v-btn value="off" color="error"> off </v-btn>
                  <v-btn value="auto" color="primary"> auto </v-btn>
                  <v-btn value="on" color="success"> on </v-btn>
                </v-btn-toggle>
              </td>
              <td class="text-end" :style="{ whiteSpace: 'nowrap' }">
                <v-btn icon flat @click="editConsumer(consumer.name)">
                  <v-icon color="warning"> $mdi-cog </v-icon>
                </v-btn>
              </td>
            </tr>
          </template>
        </draggable>
      </v-table>
    </v-col>

    <ConsumerDialog
      v-model="consumerDialog"
      :consumer-name="editedConsumerName"
      @cancel-clicked="consumerDialog = false"
      @confirm-clicked="consumerSaved"
    />
    <v-snackbar v-model="showActionError" color="error" :timeout="6000">{{ actionError }}</v-snackbar>
  </v-row>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'
import ConsumerDialog from '~/components/ConsumerDialog.vue'
import EnergyChart from '~/components/EnergyChart.vue'
import { Consumer, ConsumerMode, Phase, useMainStore } from '~/stores/main'
import { ControllerData } from '~/composables/useShelly'

const PHASES: Phase[] = ['A', 'B', 'C']
const POLL_MS = 4000

const mainStore = useMainStore()
const shelly = useShelly()

const cData = ref<ControllerData | null>(null)
const loadError = ref<string | null>(null)
const showChart = ref(false)
const consumerDialog = ref(false)
const editedConsumerName = ref<undefined | string>(undefined)
const isDragging = ref(false)
// requests that change consumers; polling doesn't overwrite the list while any is running
const pendingWrites = ref(0)
const actionError = ref<string | null>(null)
const showActionError = computed({
  get: () => actionError.value !== null,
  set: value => {
    if (!value) actionError.value = null
  }
})

// ---- polling ----

let pollTimer: ReturnType<typeof setTimeout> | undefined
let isStopped = false

async function refresh() {
  try {
    const data = await shelly.getData()
    cData.value = data
    loadError.value = null
    // don't overwrite the list while the user is dragging, editing or saving
    if (!isDragging.value && !consumerDialog.value && pendingWrites.value === 0) mainStore.consumers = data.consumers
  } catch (e) {
    loadError.value = errorMessage(e)
  }
}

// the next request starts only after the previous one finished, so slow responses never pile up
async function poll() {
  await refresh()
  if (!isStopped) pollTimer = setTimeout(poll, POLL_MS)
}

onMounted(poll)
onBeforeUnmount(() => {
  isStopped = true
  clearTimeout(pollTimer)
})

// ---- measurements ----

type PhaseValues = Record<Phase | 'total', number>

function phaseValues(data: ControllerData | null, kind: 'production' | 'consumption'): PhaseValues | null {
  if (!data) return null
  const A = data[`a_${kind}` as const]
  const B = data[`b_${kind}` as const]
  const C = data[`c_${kind}` as const]
  return { A, B, C, total: A + B + C }
}

const cards = computed(() => {
  const production = phaseValues(cData.value, 'production')
  const consumption = phaseValues(cData.value, 'consumption')
  const balance =
    production && consumption
      ? {
          A: production.A - consumption.A,
          B: production.B - consumption.B,
          C: production.C - consumption.C,
          total: production.total - consumption.total
        }
      : null
  return [
    { title: 'Production', icon: '$mdi-solar-power-variant-outline', values: production },
    { title: 'Consumption', icon: '$mdi-home-lightning-bolt-outline', values: consumption },
    { title: 'Balance', icon: '$mdi-plus-minus-variant', values: balance }
  ]
})

function formatW(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-'
  return `${value.toFixed(0)} W`
}

function statusColor(status: Consumer['status']) {
  if (status === 'on') return 'success'
  if (status === 'off') return 'error'
  return 'grey'
}

// ---- consumers ----

async function write(action: () => Promise<unknown>) {
  pendingWrites.value++
  try {
    await action()
  } catch (e) {
    actionError.value = errorMessage(e)
  } finally {
    pendingWrites.value--
  }
  await refresh()
}

function changeMode(consumer: Consumer, mode: ConsumerMode) {
  const { name, ip, max_consumption: maxConsumption, phase } = consumer
  consumer.mode = mode
  write(() => shelly.setConsumer({ name, ip, max_consumption: maxConsumption, phase, mode }, name))
}

function orderChanged() {
  isDragging.value = false
  write(() => shelly.setOrder(mainStore.consumers.map(c => c.name)))
}

function addConsumer() {
  editedConsumerName.value = undefined
  consumerDialog.value = true
}

function editConsumer(name: string) {
  editedConsumerName.value = name
  consumerDialog.value = true
}

function consumerSaved() {
  consumerDialog.value = false
  refresh()
}
</script>
