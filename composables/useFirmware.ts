import { useMainStore } from '~/stores/main'

export type DeviceRow = {
  ip: string
  name: string
  roles: string[]
  gen: number | null
  model: string
  version: string
  available: string | null
  state: 'checking' | 'current' | 'available' | 'updating' | 'updated' | 'unreachable' | 'error'
  error: string | null
}

type Gen1Ota = { status: string; has_update: boolean; new_version: string; old_version: string }

const UPDATE_TIMEOUT_MS = 5 * 60 * 1000
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Gen1 versions look like "20230913-112003/v1.14.0-gcb84623"; shown as "v1.14.0"
export function shortVersion(version: string) {
  return version.match(/v?\d+\.\d+\.\d+/)?.[0] ?? version
}

export function useFirmware() {
  const mainStore = useMainStore()
  const devices = ref<DeviceRow[]>([])
  const isChecking = ref(false)
  const isUpdating = ref(false)

  // every device the app knows about, once per IP
  function deviceList(): DeviceRow[] {
    const rows = new Map<string, DeviceRow>()
    const add = (ip: string, name: string, role: string) => {
      const row = rows.get(ip)
      if (row) row.roles.push(role)
      else
        rows.set(ip, {
          ip,
          name,
          roles: [role],
          gen: null,
          model: '',
          version: '',
          available: null,
          state: 'checking',
          error: null
        })
    }
    add(mainStore.controllerIp, 'Controller', 'controller')
    add(mainStore.productionIp, 'Production meter', 'production meter')
    add(mainStore.consumptionIp, 'Consumption meter', 'consumption meter')
    for (const consumer of mainStore.consumers) add(consumer.ip, consumer.name, 'consumer')
    return [...rows.values()]
  }

  async function check(row: DeviceRow) {
    row.state = 'checking'
    row.error = null
    try {
      const identity = await identify(row.ip)
      row.gen = identity.gen ?? 1
      row.model = identity.model ?? identity.type ?? ''
      row.version = shortVersion(identity.ver ?? identity.fw ?? '')
      if (row.gen >= 2) {
        const updates = await rpc<{ stable?: { version: string } }>(row.ip, 'Shelly.CheckForUpdate')
        row.available = updates.stable?.version ?? null
      } else {
        // Gen1: start a check, then read the result
        await gen1(row.ip, '/ota/check')
        await sleep(3000)
        const ota = await gen1<Gen1Ota>(row.ip, '/ota')
        row.available = ota.has_update ? shortVersion(ota.new_version) : null
      }
      row.state = row.available ? 'available' : 'current'
    } catch (e) {
      row.state = e instanceof ShellyHttpError ? 'error' : 'unreachable'
      row.error = errorMessage(e)
    }
  }

  async function checkAll() {
    isChecking.value = true
    devices.value = deviceList()
    await Promise.all(devices.value.map(check))
    isChecking.value = false
  }

  // starts the update, then waits for the device to come back with a different version
  async function update(row: DeviceRow) {
    const from = row.version
    row.state = 'updating'
    row.error = null
    logEvent('firmware.update_started', `Updating ${row.name} from ${from} to ${row.available}`, {
      attributes: {
        'device.ip': row.ip,
        'device.model': row.model,
        'firmware.from': from,
        'firmware.to': row.available ?? ''
      }
    })
    try {
      if (row.gen && row.gen >= 2) await rpc(row.ip, 'Shelly.Update', { stage: 'stable' })
      else await gen1(row.ip, '/ota?update=true')

      const deadline = Date.now() + UPDATE_TIMEOUT_MS
      for (;;) {
        await sleep(5000)
        if (Date.now() > deadline) throw new Error('did not come back with new firmware within 5 minutes')
        try {
          const identity = await identify(row.ip)
          const version = shortVersion(identity.ver ?? identity.fw ?? '')
          if (version && version !== from) {
            row.version = version
            break
          }
        } catch {
          // restarting
        }
      }
      row.available = null
      row.state = 'updated'
      logEvent('firmware.update_succeeded', `${row.name} updated to ${row.version}`, {
        attributes: {
          'device.ip': row.ip,
          'device.model': row.model,
          'firmware.from': from,
          'firmware.to': row.version
        }
      })
    } catch (e) {
      row.state = 'error'
      row.error = errorMessage(e)
      logEvent('firmware.update_failed', `Updating ${row.name} failed: ${row.error}`, {
        severity: 'ERROR',
        attributes: { 'device.ip': row.ip, 'device.model': row.model, 'firmware.from': from }
      })
    }
  }

  // one at a time, the controller last: its restart briefly interrupts the switching
  async function updateAll() {
    isUpdating.value = true
    const pending = devices.value.filter(row => row.state === 'available')
    pending.sort((a, b) => Number(a.roles.includes('controller')) - Number(b.roles.includes('controller')))
    for (const row of pending) await update(row)
    isUpdating.value = false
  }

  async function updateOne(row: DeviceRow) {
    isUpdating.value = true
    await update(row)
    isUpdating.value = false
  }

  return { devices, isChecking, isUpdating, checkAll, updateOne, updateAll }
}
