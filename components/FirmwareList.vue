<template>
  <section>
    <div class="section-header">
      <h2 class="section-title">Firmware</h2>
      <v-btn
        :icon="mdiRefresh"
        variant="text"
        density="comfortable"
        size="small"
        :loading="isChecking"
        :disabled="isUpdating"
        aria-label="Check for updates"
        @click="checkAll"
      />
      <v-spacer />
      <v-btn
        v-if="updatableCount > 1"
        color="primary"
        variant="flat"
        :prepend-icon="mdiUpdate"
        :disabled="isUpdating || isChecking"
        @click="confirm(null)"
      >
        Update all ({{ updatableCount }})
      </v-btn>
    </div>

    <div class="panel">
      <div v-if="!devices.length" class="empty muted">Checking the devices…</div>
      <div v-for="row in devices" :key="row.ip" class="device">
        <div class="identity">
          <div class="name">{{ row.name }}</div>
          <div class="details">{{ row.roles.join(', ') }} · {{ row.ip }}{{ row.model ? ` · ${row.model}` : '' }}</div>
        </div>

        <div class="version">
          <template v-if="row.version">
            {{ row.version }}
            <template v-if="row.available">
              <v-icon :icon="mdiArrowRight" size="14" class="mx-1" />
              <strong>{{ row.available }}</strong>
            </template>
          </template>
        </div>

        <div class="state">
          <template v-if="row.state === 'checking'">
            <v-progress-circular indeterminate size="14" width="2" />
            <span>Checking</span>
          </template>
          <template v-else-if="row.state === 'updating'">
            <v-progress-circular indeterminate size="14" width="2" />
            <span>Updating, the device restarts…</span>
          </template>
          <template v-else-if="row.state === 'available'">
            <v-btn size="small" color="primary" variant="tonal" :disabled="isUpdating" @click="confirm(row)">
              Update
            </v-btn>
          </template>
          <template v-else>
            <v-icon :icon="stateIcon(row.state)" size="16" :color="stateColor(row.state)" />
            <span :title="row.error ?? undefined">{{ stateLabel(row) }}</span>
          </template>
        </div>
      </div>
    </div>
    <p class="muted hint">
      The devices download the update from Shelly's servers, so they need internet access. A device restarts after the
      update, which can briefly switch a consumer.
    </p>

    <ConfirmDialog
      v-model="isConfirmOpen"
      :title="confirmTarget ? `Update ${confirmTarget.name}?` : `Update ${updatableCount} devices?`"
      :text="
        confirmTarget
          ? `${confirmTarget.name} downloads firmware ${confirmTarget.available} and restarts. It is unreachable for a minute or two.`
          : 'The devices are updated one after another; each restarts and is unreachable for a minute or two. The controller is updated last.'
      "
      confirm-label="Update"
      @cancel="isConfirmOpen = false"
      @confirm="startUpdate"
    />
  </section>
</template>

<script setup lang="ts">
import { mdiAlertCircle, mdiArrowRight, mdiCheckCircle, mdiCloseCircle, mdiRefresh, mdiUpdate } from '@mdi/js'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import { DeviceRow } from '~/composables/useFirmware'
import { useMainStore } from '~/stores/main'

const mainStore = useMainStore()
const { devices, isChecking, isUpdating, checkAll, updateOne, updateAll } = useFirmware()

const updatableCount = computed(() => devices.value.filter(row => row.state === 'available').length)

// check once the consumer list has arrived, so the plugs are included
let hasChecked = false
watch(
  () => mainStore.consumers.length > 0 || !!mainStore.loadError,
  isReady => {
    if (!isReady || hasChecked) return
    hasChecked = true
    checkAll()
  },
  { immediate: true }
)

const isConfirmOpen = ref(false)
const confirmTarget = ref<DeviceRow | null>(null)

function confirm(row: DeviceRow | null) {
  confirmTarget.value = row
  isConfirmOpen.value = true
}

function startUpdate() {
  isConfirmOpen.value = false
  if (confirmTarget.value) updateOne(confirmTarget.value)
  else updateAll()
}

function stateIcon(state: DeviceRow['state']) {
  if (state === 'current' || state === 'updated') return mdiCheckCircle
  if (state === 'unreachable') return mdiCloseCircle
  return mdiAlertCircle
}

function stateColor(state: DeviceRow['state']) {
  if (state === 'current' || state === 'updated') return 'success'
  return 'error'
}

function stateLabel(row: DeviceRow) {
  if (row.state === 'current') return 'Up to date'
  if (row.state === 'updated') return 'Updated'
  if (row.state === 'unreachable') return 'Not reachable'
  return row.error ?? 'Error'
}
</script>

<style scoped>
.empty {
  padding: 24px;
  text-align: center;
}

.device {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) 220px 220px;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}

.device + .device {
  border-top: 1px solid var(--viz-hairline);
}

.name {
  font-weight: 600;
}

.details {
  font-size: 12px;
  color: var(--viz-muted);
}

.version {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  display: flex;
  align-items: center;
}

.state {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  font-size: 14px;
  color: var(--viz-text-secondary);
}

.hint {
  font-size: 13px;
  margin-top: 8px;
}

@media (max-width: 760px) {
  .device {
    grid-template-columns: 1fr auto;
  }

  .version {
    grid-column: 1;
  }

  .state {
    grid-row: 1;
    grid-column: 2;
  }
}
</style>
