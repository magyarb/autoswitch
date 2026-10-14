import { defineStore } from 'pinia'

export type Phase = 'A' | 'B' | 'C'
export type ConsumerMode = 'auto' | 'on' | 'off'

export type Consumer = {
  name: string
  ip: string
  status: 'on' | 'off' | 'unknown'
  online: boolean
  current_consumption: number | null
  max_consumption: number
  mode: ConsumerMode
  phase: Phase
}

// the fields the controller script stores, everything else is runtime state
export type ConsumerInput = Pick<Consumer, 'name' | 'ip' | 'max_consumption' | 'phase' | 'mode'>

export const useMainStore = defineStore(
  'main',
  () => {
    const controllerIp = ref('192.168.0.40')
    const productionIp = ref('192.168.0.40')
    const consumptionIp = ref('192.168.0.49')
    const scriptId = ref(1)
    // always loaded from the controller, never persisted
    const consumers = ref<Consumer[]>([])
    return { controllerIp, consumptionIp, productionIp, scriptId, consumers }
  },
  {
    persist: {
      // new key, so stale state saved by older versions (test consumers, null IPs) is ignored
      key: 'autoswitch-settings',
      paths: ['controllerIp', 'productionIp', 'consumptionIp', 'scriptId']
    }
  }
)
