import { defineStore } from 'pinia'

export type Consumer = {
  order: number
  name: string
  ip: string
  status: 'on' | 'off'
  current_consumption: number | null
  max_consumption: number
  mode: 'auto' | 'on' | 'off'
  phase: 'A' | 'B' | 'C'
}

export const useMainStore = defineStore(
  'main',
  () => {
    const controllerIp = ref<null | string>(null)
    const productionIp = ref<null | string>(null)
    const consumptionIp = ref<null | string>(null)
    const consumers = ref<Partial<Consumer>[]>([
      {
        name: 'bojlerA',
        ip: '127.0.0.1',
        status: 'off',
        current_consumption: 1,
        max_consumption: 800,
        mode: 'on',
        phase: 'A'
      },
      {
        name: 'bojlerB',
        ip: '192.168.0.37',
        status: 'on',
        current_consumption: null,
        max_consumption: 800,
        mode: 'auto',
        phase: 'B'
      },
      {
        name: 'bojlerC',
        ip: '192.168.0.38',
        status: 'on',
        current_consumption: null,
        max_consumption: 800,
        mode: 'auto',
        phase: 'C'
      },
      {
        name: 'radiatorKonyha',
        ip: '192.168.0.41',
        status: 'on',
        current_consumption: null,
        max_consumption: 800,
        mode: 'auto',
        phase: 'A'
      }
    ])
    return { controllerIp, consumptionIp, productionIp, consumers }
  },
  { persist: true }
)
