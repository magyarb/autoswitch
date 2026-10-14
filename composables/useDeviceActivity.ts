import { ActivityEntry, ActivityLog } from '~/composables/useShelly'
import { useMainStore } from '~/stores/main'

const POLL_MS = 15000
const SEVERITY = { info: 'INFO', warn: 'WARN', error: 'ERROR' } as const

// shared by the layout (which polls) and the Devices page (which shows the list)
const entries = ref<ActivityEntry[]>([])
const isSupported = ref(true)
const loadError = ref<string | null>(null)

export function useDeviceActivity() {
  return { entries: readonly(entries), isSupported: readonly(isSupported), loadError: readonly(loadError) }
}

// Call once, from the layout.
export function useDeviceActivityPolling() {
  const mainStore = useMainStore()
  const shelly = useShelly()
  let timer: ReturnType<typeof setTimeout> | undefined
  // two overlapping loads would forward the same events twice
  let isLoading = false

  // The controller keeps its last events in memory and remembers which ones were already sent to
  // Dash0, so each event is forwarded once, whichever browser has the app open.
  // Without Dash0 nothing is acknowledged, so a local copy of the app can't swallow events.
  async function forward(log: ActivityLog) {
    if (!isTelemetryEnabled()) return
    const pending = log.entries.filter(entry => entry.seq > log.forwarded_seq)
    if (!pending.length) return
    for (const entry of pending) {
      logEvent('device.activity', entry.msg, {
        severity: SEVERITY[entry.level] ?? 'INFO',
        timestamp: entry.ts ? entry.ts * 1000 : undefined,
        attributes: { 'device.ip': mainStore.controllerIp, 'activity.boot_id': log.boot_id, 'activity.seq': entry.seq }
      })
    }
    await shelly.ackLog(pending[pending.length - 1].seq)
  }

  async function load() {
    clearTimeout(timer)
    if (isLoading) return
    isLoading = true
    try {
      const log = await shelly.getLog()
      isSupported.value = true
      loadError.value = null
      entries.value = log.entries.slice().reverse()
      await forward(log)
    } catch (e) {
      // scripts installed before the in-app installer don't have getLog
      if (e instanceof ShellyHttpError && e.status === 404) isSupported.value = false
      else loadError.value = errorMessage(e)
    } finally {
      isLoading = false
    }
    if (!document.hidden) timer = setTimeout(load, POLL_MS)
  }

  function onVisibilityChange() {
    if (!document.hidden) load()
  }

  onMounted(() => {
    load()
    document.addEventListener('visibilitychange', onVisibilityChange)
  })
  onBeforeUnmount(() => {
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })
  watch(
    () => [mainStore.controllerIp, mainStore.scriptId],
    () => {
      entries.value = []
      load()
    }
  )

  return { refresh: load }
}
