<template>
  <div class="page">
    <v-alert v-if="mainStore.loadError" type="error" variant="tonal" density="compact" class="mb-4">
      Cannot reach the controller at {{ mainStore.controllerIp }}: {{ mainStore.loadError }}
    </v-alert>
    <v-alert
      v-else-if="mainStore.data && !mainStore.data.meters_ok"
      type="warning"
      variant="tonal"
      density="compact"
      class="mb-4"
    >
      The controller cannot read the energy meters, automatic switching is paused.
    </v-alert>

    <PowerOverview :data="mainStore.data" :consumers="mainStore.consumers" :is-stale="isStale" />

    <EnergyHistory class="mt-8" />

    <section class="mt-8">
      <div class="section-header">
        <h2 class="section-title">Consumers</h2>
        <span class="muted ml-3 hint">Drag to change priority, the first is switched on first</span>
        <v-spacer />
        <v-btn color="primary" variant="flat" :prepend-icon="mdiPlus" @click="addConsumer">Add consumer</v-btn>
      </div>
      <ConsumerList
        v-model="mainStore.consumers"
        :class="{ stale: isStale }"
        :empty-text="mainStore.data ? 'No consumers yet' : `Connecting to ${mainStore.controllerIp}…`"
        @drag-start="isDragging = true"
        @drag-end="orderChanged"
        @mode-changed="changeMode"
        @edit="editConsumer"
      />
    </section>

    <ConsumerDialog
      v-model="consumerDialog"
      :consumer-name="editedConsumerName"
      @cancel-clicked="consumerDialog = false"
      @confirm-clicked="consumerSaved"
    />
    <v-snackbar v-model="showActionError" color="error" :timeout="6000">{{ actionError }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { mdiPlus } from '@mdi/js'
import ConsumerDialog from '~/components/ConsumerDialog.vue'
import ConsumerList from '~/components/ConsumerList.vue'
import EnergyHistory from '~/components/EnergyHistory.vue'
import PowerOverview from '~/components/PowerOverview.vue'
import { Consumer, ConsumerMode, useMainStore } from '~/stores/main'

// data older than this is shown dimmed (e.g. restored from the last visit)
const STALE_MS = 15000

const mainStore = useMainStore()
const shelly = useShelly()

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

const { refresh } = useControllerPolling(() => !isDragging.value && !consumerDialog.value && pendingWrites.value === 0)

const now = useNow()
const isStale = computed(() => !mainStore.lastUpdated || now.value - mainStore.lastUpdated > STALE_MS)

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
  consumer.pending = mode !== 'auto'
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

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
}

.stale {
  opacity: 0.55;
  transition: opacity 0.2s;
}

.hint {
  font-size: 13px;
}

@media (max-width: 600px) {
  .hint {
    display: none;
  }
}
</style>
