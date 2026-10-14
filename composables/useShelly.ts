import { Consumer, ConsumerInput, useMainStore } from '~/stores/main'

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

export type EmDataPage = {
  keys: string[]
  data: {
    ts: number
    period: number
    values: number[][]
  }[]
  next_record_ts?: number
}

const TIMEOUT_MS = 5000
const EM_DATA_TIMEOUT_MS = 20000

async function request<T>(url: string, init: RequestInit = {}, timeoutMs = TIMEOUT_MS): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    const body = await response.json()
    if (!response.ok) throw new Error(body?.error ?? `HTTP ${response.status}`)
    return body
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
    getEmData: (ip: string, ts: number, endTs: number) =>
      request<EmDataPage>(`http://${ip}/rpc/EMData.GetData?id=0&ts=${ts}&end_ts=${endTs}`, {}, EM_DATA_TIMEOUT_MS)
  }
}
