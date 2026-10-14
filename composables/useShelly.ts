import { ConsumerInput, ControllerData, useMainStore } from '~/stores/main'

export type EnergyPage = {
  keys?: string[]
  data: {
    ts: number
    period: number
    values: number[][]
  }[]
  next_record_ts?: number
}

// The device answered, but with an error (e.g. a method older firmware doesn't have).
export class ShellyHttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

const TIMEOUT_MS = 5000
const ENERGY_TIMEOUT_MS = 15000

async function request<T>(url: string, init: RequestInit = {}, timeoutMs = TIMEOUT_MS): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    if (!response.ok) {
      const text = await response.text()
      let message = `HTTP ${response.status}`
      try {
        const body = JSON.parse(text)
        message = body.error ?? body.message ?? message
      } catch {
        if (text) message = text
      }
      throw new ShellyHttpError(message, response.status)
    }
    return await response.json()
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw new Error(`${url} timed out`)
    throw e
  } finally {
    clearTimeout(timer)
  }
}

export function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : String(e)
}

// Talks to the controller script (fw.js) and the energy meters.
export function useShelly() {
  const mainStore = useMainStore()

  const scriptUrl = (endpoint: string) => `http://${mainStore.controllerIp}/script/${mainStore.scriptId}/${endpoint}`

  const post = (endpoint: string, body: unknown) =>
    request<{ status: string }>(scriptUrl(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

  return {
    getData: () => request<ControllerData>(scriptUrl('getCData')),
    // originalName is the current name when editing, undefined when adding
    setConsumer: (consumer: ConsumerInput, originalName?: string) =>
      post('setConsumer', { ...consumer, original_name: originalName }),
    deleteConsumer: (name: string) => post('deleteConsumer', { name }),
    setOrder: (names: string[]) => post('setOrder', { names }),
    // net energy per phase, pre-aggregated by the meter: 3 values per record
    getNetEnergies: (ip: string, query: { ts: number; endTs: number; period: number; addKeys: boolean }) =>
      request<EnergyPage>(
        `http://${ip}/rpc/EMData.GetNetEnergies?id=0&ts=${query.ts}&end_ts=${query.endTs}` +
          `&period=${query.period}&add_keys=${query.addKeys}`,
        {},
        ENERGY_TIMEOUT_MS
      ),
    // raw 1-minute records with 51 values each; only used when GetNetEnergies isn't available
    getData1m: (ip: string, ts: number, endTs: number) =>
      request<EnergyPage>(`http://${ip}/rpc/EMData.GetData?id=0&ts=${ts}&end_ts=${endTs}`, {}, ENERGY_TIMEOUT_MS)
  }
}
