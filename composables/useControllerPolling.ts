import { ControllerData, useMainStore } from '~/stores/main'

const POLL_MS = 3000
const SNAPSHOT_KEY = 'autoswitch-snapshot'

type Snapshot = { controllerIp: string; ts: number; data: ControllerData }

// Polls the controller while mounted. The last response is kept in localStorage so a
// reload renders immediately (marked as stale until fresh data arrives).
// canReplaceConsumers() lets the page keep its local list while the user drags or edits.
export function useControllerPolling(canReplaceConsumers: () => boolean) {
  const mainStore = useMainStore()
  const shelly = useShelly()

  let timer: ReturnType<typeof setTimeout> | undefined
  let isStopped = false
  let inflight: Promise<void> | null = null

  function restoreSnapshot() {
    if (mainStore.data) return
    try {
      const snapshot: Snapshot | null = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) ?? 'null')
      if (!snapshot || snapshot.controllerIp !== mainStore.controllerIp) return
      mainStore.data = snapshot.data
      mainStore.consumers = snapshot.data.consumers
      mainStore.lastUpdated = snapshot.ts
    } catch {
      localStorage.removeItem(SNAPSHOT_KEY)
    }
  }

  async function load() {
    try {
      const data = await shelly.getData()
      if (mainStore.loadError) {
        logEvent('controller.reachable', `Controller ${mainStore.controllerIp} is reachable again`)
      }
      mainStore.data = data
      mainStore.lastUpdated = Date.now()
      mainStore.loadError = null
      if (canReplaceConsumers()) mainStore.consumers = data.consumers
      const snapshot: Snapshot = { controllerIp: mainStore.controllerIp, ts: Date.now(), data }
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot))
    } catch (e) {
      // only the change is logged, not every failed poll
      if (!mainStore.loadError) {
        logEvent(
          'controller.unreachable',
          `Cannot reach the controller ${mainStore.controllerIp}: ${errorMessage(e)}`,
          {
            severity: 'ERROR'
          }
        )
      }
      mainStore.loadError = errorMessage(e)
    }
  }

  // concurrent callers share one request
  function refresh() {
    if (!inflight) inflight = load().finally(() => (inflight = null))
    return inflight
  }

  // the next request starts only after the previous one finished, so slow responses never pile up
  async function poll() {
    clearTimeout(timer)
    await refresh()
    // clear again: another poll() may have started while this one was waiting
    clearTimeout(timer)
    if (!isStopped && !document.hidden) timer = setTimeout(poll, POLL_MS)
  }

  function onVisibilityChange() {
    if (!document.hidden) poll()
  }

  onMounted(() => {
    restoreSnapshot()
    poll()
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onBeforeUnmount(() => {
    isStopped = true
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  // a different controller: drop its data and load right away
  watch(
    () => [mainStore.controllerIp, mainStore.scriptId],
    () => {
      mainStore.data = null
      mainStore.consumers = []
      mainStore.lastUpdated = null
      mainStore.loadError = null
      poll()
    }
  )

  return { refresh }
}
