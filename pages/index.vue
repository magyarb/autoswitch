<template>
  <v-row>
    <v-col cols="12" class="text-h4"> Status </v-col>

    <v-col cols="12" lg="4">
      <v-card>
        <v-card-title> <v-icon class="mr-2">$mdi-solar-power-variant-outline</v-icon>Production</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" lg="4">
              <p class="text-end text-">A</p>
              <p class="text-end text-h6">{{ cData?.a_production }} W</p>
            </v-col>
            <v-col cols="12" lg="4">
              <p class="text-end text-body-1">B</p>
              <p class="text-end text-h6">{{ cData?.b_production }} W</p>
            </v-col>
            <v-col cols="12" lg="4">
              <p class="text-end text-body-1">C</p>
              <p class="text-end text-h6">{{ cData?.c_production }} W</p>
            </v-col>
            <v-col cols="12" lg="12">
              <p class="text-center text-h5">Total</p>
              <p class="text-center text-h4">{{ totalProduction }} W</p>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" lg="4">
      <v-card>
        <v-card-title><v-icon class="mr-2">$mdi-home-lightning-bolt-outline</v-icon>Consumption</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" lg="4">
              <p class="text-end text-">A</p>
              <p class="text-end text-h6">{{ cData?.a_consumption }} W</p>
            </v-col>
            <v-col cols="12" lg="4">
              <p class="text-end text-body-1">B</p>
              <p class="text-end text-h6">{{ cData?.b_consumption }} W</p>
            </v-col>
            <v-col cols="12" lg="4">
              <p class="text-end text-body-1">C</p>
              <p class="text-end text-h6">{{ cData?.c_consumption }} W</p>
            </v-col>
            <v-col cols="12" lg="12">
              <p class="text-center text-h5">Total</p>
              <p class="text-center text-h4">{{ totalConsumption }} W</p>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" lg="4">
      <v-card>
        <v-card-title><v-icon class="mr-2">$mdi-plus-minus-variant</v-icon>Balance</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" lg="4">
              <p class="text-end text-">A</p>
              <p class="text-end text-h6">
                {{ parseFloat((cData?.a_production! - cData?.a_consumption!).toString()).toFixed(2) }} W
              </p>
            </v-col>
            <v-col cols="12" lg="4">
              <p class="text-end text-body-1">B</p>
              <p class="text-end text-h6">
                {{ parseFloat((cData?.b_production! - cData?.b_consumption!).toString()).toFixed(2) }} W
              </p>
            </v-col>
            <v-col cols="12" lg="4">
              <p class="text-end text-body-1">C</p>
              <p class="text-end text-h6">
                {{ parseFloat((cData?.c_production! - cData?.c_consumption!).toString()).toFixed(2) }} W
              </p>
            </v-col>
            <v-col cols="12" lg="12">
              <p class="text-center text-h5">Total</p>
              <p class="text-center text-h4">
                {{ parseFloat((totalProduction - totalConsumption).toString()).toFixed(2) }} W
              </p>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-col>
    <v-btn color="primary" @click="getChartData"><v-icon>$mdi-plus</v-icon>getChartData</v-btn>
    <v-col v-if="showCharts" cols="12" class="text-h4"> Chart </v-col>

    <v-col v-if="showCharts" cols="12">
      <Line :data="mergedChartData" />
    </v-col>
    <!--v-col v-if="showCharts" cols="6">
      <Line :data="prodChartData" />
    </v-col-->
    <v-col cols="12" class="text-h4 d-flex" :style="{ alignItems: 'center' }">
      <div>Consumers</div>
      <v-spacer></v-spacer>
      <v-btn color="primary" @click="addConsumer"><v-icon>$mdi-plus</v-icon>add consumer</v-btn>
    </v-col>
    <v-col cols="12">
      <client-only>
        <v-table>
          <template #default>
            <thead>
              <tr>
                <th class="text-start">Order</th>
                <th class="text-start">Name</th>
                <th class="text-start">Phase</th>
                <th class="text-end">Status</th>
                <th class="text-end">Consumption</th>
                <th class="text-end">Mode</th>
                <th class="text-end">Edit</th>
              </tr>
            </thead>
            <draggable v-model="mainStore.consumers" tag="tbody" item-key="order" handle=".handle" @end="orderChanged">
              <template #item="{ element: lineItem }">
                <tr>
                  <td class="text-start handle">
                    <v-icon>$mdi-menu</v-icon>
                    {{ lineItem.order }}
                  </td>
                  <td>{{ lineItem.name }}</td>
                  <td>{{ lineItem.phase }}</td>
                  <td class="text-end">
                    <v-chip :color="lineItem.status === 'on' ? 'success' : 'error'">
                      {{ lineItem.status.toUpperCase() }}
                    </v-chip>
                  </td>
                  <td
                    v-if="lineItem.current_consumption !== null && lineItem.current_consumption !== undefined"
                    class="text-end"
                  >
                    {{ lineItem.current_consumption }} W
                  </td>
                  <td v-else class="text-end">-</td>
                  <td class="text-end">
                    <v-btn-toggle
                      v-model="lineItem.mode"
                      density="compact"
                      mandatory
                      :divided="true"
                      variant="outlined"
                      @update:model-value="updateConsumer(lineItem)"
                    >
                      <v-btn value="off" color="error"> off </v-btn>
                      <v-btn value="auto" color="primary"> auto </v-btn>
                      <v-btn value="on" color="success"> on </v-btn>
                    </v-btn-toggle>
                  </td>
                  <td class="text-end" :style="{ whiteSpace: 'nowrap' }">
                    <v-btn icon flat @click="editConsumer(lineItem.name)">
                      <v-icon color="warning"> $mdi-cog </v-icon>
                    </v-btn>
                  </td>
                </tr>
              </template>
            </draggable>
          </template>
        </v-table>
      </client-only>
    </v-col>
    <!--v-col cols="12" class="text-h4"> Events </v-col>
    <v-col cols="12">
      <client-only>
        <v-table>
          <thead>
            <tr>
              <th class="text-start">Date</th>
              <th class="text-start">Event</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in [0, 1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 5, 6, 4]">
              <td class="text-start">date</td>
              <td class="text-start">event</td>
            </tr>
          </tbody>
        </v-table>
      </client-only>
    </v-col-->
    <ConsumerDialog
      v-model="consumerDialog"
      :consumer-name="editedConsumerName"
      @cancel-clicked="consumerDialog = false"
      @confirm-clicked="consumerDialog = false"
    />
  </v-row>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'
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
import ConsumerDialog from '~/components/ConsumerDialog.vue'
import { Consumer, useMainStore } from '~/stores/main'

ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement)

const mainStore = useMainStore()

const consumerDialog = ref(false)
const editedConsumerName = ref<undefined | string>(undefined)

function addConsumer() {
  editedConsumerName.value = undefined
  consumerDialog.value = true
}

function editConsumer(name: string) {
  editedConsumerName.value = name
  consumerDialog.value = true
}

function orderChanged() {
  console.log('order changed')
}

type Data = {
  a_consumption: number
  b_consumption: number
  c_consumption: number
  a_production: number
  b_production: number
  c_production: number
  mode: 'CONSUME_LESS' | 'CONSUME_MORE'
  consumers: Consumer[]
}

const cData = ref<Data | null>(null)
const totalConsumption = computed(() => {
  if (!cData.value) return 0
  return Number(
    parseFloat((cData.value.a_consumption + cData.value.b_consumption + cData.value.c_consumption).toString()).toFixed(
      2
    )
  )
})

const totalProduction = computed(() => {
  if (!cData.value) return 0
  return Number(
    parseFloat((cData.value.a_production + cData.value.b_production + cData.value.c_production).toString()).toFixed(2)
  )
})

onMounted(() => {
  setInterval(() => {
    getData()
  }, 4000)
})

async function getData() {
  const response = await fetch('http://192.168.0.40/script/1/getCData')
  cData.value = await response.json()
  if (cData.value) mainStore.consumers = cData.value.consumers
}

async function updateConsumer(consumer: Consumer) {
  const response = await fetch('http://192.168.0.40/script/1/setConsumer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(consumer)
  })
  console.log(await response.text())
}

const prodChartData = computed(() => {
  // Calculate labels (timestamps) for each data point

  if (!productionData.value) return { labels: [], datasets: [] }

  const labels = productionData.value.data[0].values.map((_, index) => {
    const ts = productionData.value!.data[0].ts + index * productionData.value!.data[0].period
    return new Date(ts * 1000).toLocaleTimeString()
  })

  // Create datasets for each key
  const datasets = productionData.value.keys
    .map((key, index) => ({
      label: key,
      data: productionData.value!.data[0].values.map(valueArray => valueArray[index] * 60),
      borderColor: `hsl(${(index * 360) / productionData.value!.keys.length}, 70%, 50%)`,
      backgroundColor: `hsla(${(index * 360) / productionData.value!.keys.length}, 70%, 50%, 0.3)`,
      fill: false,
      tension: 0.4
    }))
    .filter(k => ['a_total_act_energy', 'b_total_act_energy', 'c_total_act_energy'].includes(k.label))

  return {
    labels,
    datasets
  }
})

const consChartData = computed(() => {
  // Calculate labels (timestamps) for each data point

  if (!consumptionData.value) return { labels: [], datasets: [] }

  const labels = consumptionData.value.data[0].values.map((_, index) => {
    const ts = consumptionData.value!.data[0].ts + index * consumptionData.value!.data[0].period
    return new Date(ts * 1000).toLocaleTimeString()
  })

  // Create datasets for each key
  const datasets = consumptionData.value.keys
    .map((key, index) => ({
      label: key,
      data: consumptionData.value!.data[0].values.map(valueArray => valueArray[index] * 60),
      borderColor: `hsl(${(index * 360) / consumptionData.value!.keys.length}, 70%, 50%)`,
      backgroundColor: `hsla(${(index * 360) / consumptionData.value!.keys.length}, 70%, 50%, 0.3)`,
      fill: false,
      tension: 0.4
    }))
    .filter(k => ['a_total_act_energy', 'b_total_act_energy', 'c_total_act_energy'].includes(k.label))

  return {
    labels,
    datasets
  }
})

const mergedChartData = computed(() => {
  // Check if both datasets are available
  if (!prodChartData.value || !consChartData.value) return { labels: [], datasets: [] }

  // Use the labels from the first dataset (assuming they align)
  const labels = prodChartData.value.labels

  // Merge datasets from production and consumption
  const mergedDatasets = [
    ...prodChartData.value.datasets.map(dataset => ({
      ...dataset,
      label: `Production - ${dataset.label}`,
      borderColor: `hsl(${111}, 70%, 50%)`,
      backgroundColor: `hsla(${dataset.label.includes('a_') ? 50 : dataset.label.includes('b_') ? 189 : 305}, 70%, 50%)`
    })),
    ...consChartData.value.datasets.map(dataset => ({
      ...dataset,
      label: `Consumption - ${dataset.label}`,
      borderColor: `hsl(${0}, 70%, 50%)`,
      backgroundColor: `hsla(${dataset.label.includes('a_') ? 50 : dataset.label.includes('b_') ? 189 : 305}, 70%, 50%)`
    }))
  ]

  return {
    labels,
    datasets: mergedDatasets
  }
})

type EnergyData = {
  keys: string[]
  data: {
    ts: number
    period: number
    values: number[][]
  }[]
  next_record_ts: number
}

const productionData = ref<EnergyData | null>(null)
const consumptionData = ref<EnergyData | null>(null)
const showCharts = ref(false)

function getChartData() {
  showCharts.value = true
  getProdChartData()
  getConsChartData()
}

async function getProdChartData() {
  const timeNow = new Date().getTime()
  const oneDayAgo = timeNow - 86400000
  const response = await fetch(
    `http://192.168.0.40/rpc/EMData.GetData?id=0&ts=${Math.round(oneDayAgo / 1000)}&end_ts=${Math.round(
      timeNow / 1000
    )}`
  )
  let ret = await response.json()
  productionData.value = ret
  console.log(ret.next_record_ts)
  while (ret.next_record_ts) {
    const response = await fetch(`
      http://192.168.0.40/rpc/EMData.GetData?id=0&ts=${ret.next_record_ts}&end_ts=${Math.round(timeNow / 1000)}`)
    ret = await response.json()
    productionData.value?.data[0].values.push(...ret.data[0].values)
  }
}
async function getConsChartData() {
  const timeNow = new Date().getTime()
  const oneDayAgo = timeNow - 86400000
  const response = await fetch(
    `http://192.168.0.49/rpc/EMData.GetData?id=0&ts=${Math.round(oneDayAgo / 1000)}&end_ts=${Math.round(
      timeNow / 1000
    )}`
  )
  let ret = await response.json()
  consumptionData.value = ret
  console.log(ret.next_record_ts)
  while (ret.next_record_ts) {
    const response = await fetch(`
      http://192.168.0.49/rpc/EMData.GetData?id=0&ts=${ret.next_record_ts}&end_ts=${Math.round(timeNow / 1000)}`)
    ret = await response.json()
    consumptionData.value?.data[0].values.push(...ret.data[0].values)
  }
}
</script>
