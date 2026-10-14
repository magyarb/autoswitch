<template>
  <div class="panel pa-5">
    <div class="d-flex align-center flex-wrap ga-3">
      <div>
        <div class="title">Controller script</div>
        <div class="muted small">autoswitch and its watchdog on {{ mainStore.controllerIp }}</div>
      </div>
      <v-spacer />
      <div class="status">
        <span class="dot" :class="status.kind"></span>
        <span>{{ status.label }}</span>
      </div>
    </div>

    <div class="versions">
      <div>
        <div class="label">Installed</div>
        <div class="value">{{ installedLabel }}</div>
      </div>
      <div>
        <div class="label">In this app</div>
        <div class="value">{{ BUNDLED_SCRIPT_VERSION }}</div>
      </div>
    </div>

    <p class="muted small mt-4">
      Takes about half a minute. Consumers keep their current state, and the saved consumer list is kept. The controller
      and meter IPs from Settings are written into the script.
    </p>

    <div class="d-flex mt-4">
      <v-btn
        :color="isOutdated ? 'primary' : undefined"
        :variant="isOutdated ? 'flat' : 'outlined'"
        :prepend-icon="mdiDownload"
        :loading="isRunning"
        :disabled="!mainStore.data && !mainStore.loadError"
        @click="isConfirmOpen = true"
      >
        {{ isOutdated ? 'Install update' : 'Reinstall' }}
      </v-btn>
    </div>

    <div v-if="steps.length" class="steps mt-4">
      <div v-for="step in steps" :key="step.key" class="step" :class="step.state">
        <v-progress-circular v-if="step.state === 'active'" indeterminate size="16" width="2" />
        <v-icon v-else :icon="stepIcon(step.state)" size="18" :color="stepColor(step.state)" />
        <span>{{ step.label }}</span>
        <span v-if="step.detail" class="muted small">{{ step.detail }}</span>
      </div>
    </div>
    <v-alert v-if="installError" type="error" variant="tonal" density="compact" class="mt-4">{{
      installError
    }}</v-alert>
    <v-alert v-else-if="isDone" type="success" variant="tonal" density="compact" class="mt-4">
      Installed and running.
    </v-alert>

    <ConfirmDialog
      v-model="isConfirmOpen"
      title="Install the controller script?"
      :text="`This stops the script on ${mainStore.controllerIp} for about half a minute while the new version is uploaded. If anything fails, the current script is put back.`"
      confirm-label="Install"
      @cancel="isConfirmOpen = false"
      @confirm="confirmInstall"
    />
  </div>
</template>

<script setup lang="ts">
import { mdiAlertCircle, mdiCheckCircle, mdiCircleOutline, mdiDownload } from '@mdi/js'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import { InstallStep } from '~/composables/useScriptInstaller'
import { useMainStore } from '~/stores/main'
import { BUNDLED_SCRIPT_VERSION } from '~/utils/scriptBundle'

const mainStore = useMainStore()
const { steps, isRunning, installError, install } = useScriptInstaller()
const isConfirmOpen = ref(false)

const installed = computed(() => mainStore.data?.script_version)
const isOutdated = computed(() => installed.value !== BUNDLED_SCRIPT_VERSION)
const isDone = computed(() => steps.value.length > 0 && steps.value.every(step => step.state === 'done'))

const installedLabel = computed(() => {
  if (!mainStore.data) return mainStore.loadError ? 'not reachable' : '…'
  return installed.value ?? 'an older version'
})

const status = computed(() => {
  if (mainStore.loadError) return { kind: 'critical', label: 'Not reachable' }
  if (!mainStore.data) return { kind: 'muted', label: 'Checking…' }
  if (isOutdated.value) return { kind: 'warning', label: 'Update available' }
  return { kind: 'good', label: 'Up to date' }
})

function stepIcon(state: InstallStep['state']) {
  if (state === 'done') return mdiCheckCircle
  if (state === 'error') return mdiAlertCircle
  return mdiCircleOutline
}

function stepColor(state: InstallStep['state']) {
  if (state === 'done') return 'success'
  if (state === 'error') return 'error'
  return undefined
}

function confirmInstall() {
  isConfirmOpen.value = false
  install()
}
</script>

<style scoped>
.title {
  font-weight: 600;
}

.small {
  font-size: 13px;
}

.status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--viz-text-secondary);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--viz-muted);
}

.dot.good {
  background: var(--status-good);
}

.dot.warning {
  background: var(--status-warning);
}

.dot.critical {
  background: var(--status-critical);
}

.versions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 200px));
  gap: 16px;
  margin-top: 16px;
}

.label {
  font-size: 13px;
  color: var(--viz-text-secondary);
}

.value {
  font-size: 18px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.step.pending {
  color: var(--viz-muted);
}
</style>
