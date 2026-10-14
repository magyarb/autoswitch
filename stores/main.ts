import { defineStore } from 'pinia'

export type Phase = 'A' | 'B' | 'C'
export type ConsumerMode = 'auto' | 'on' | 'off'

export type Consumer = {
  name: string
  ip: string
  status: 'on' | 'off' | 'unknown'
  online: boolean
  // a manual mode change the controller hasn't applied yet
  pending?: boolean
  current_consumption: number | null
  max_consumption: number
  mode: ConsumerMode
  phase: Phase
}

// the fields the controller script stores, everything else is runtime state
export type ConsumerInput = Pick<Consumer, 'name' | 'ip' | 'max_consumption' | 'phase' | 'mode'>

export type ControllerData = {
  a_consumption: number
  b_consumption: number
  c_consumption: number
  a_production: number
  b_production: number
  c_production: number
  meters_ok: boolean
  consumers: Consumer[]
}

export const useMainStore = defineStore(
  'main',
  () => {
    const controllerIp = ref('192.168.0.40')
    const productionIp = ref('192.168.0.40')
    const consumptionIp = ref('192.168.0.49')
    const scriptId = ref(1)
    const theme = ref<'dark' | 'light'>('dark')

    // live controller state, never persisted
    const data = ref<ControllerData | null>(null)
    const consumers = ref<Consumer[]>([])
    const lastUpdated = ref<number | null>(null)
    const loadError = ref<string | null>(null)

    return {
      controllerIp,
      consumptionIp,
      productionIp,
      scriptId,
      theme,
      data,
      consumers,
      lastUpdated,
      loadError
    }
  },
  {
    persist: {
      // new key, so stale state saved by older versions (test consumers, null IPs) is ignored
      key: 'autoswitch-settings',
      storage: persistedState.localStorage,
      paths: ['controllerIp', 'productionIp', 'consumptionIp', 'scriptId', 'theme']
    }
  }
)
