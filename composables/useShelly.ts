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

export type ActivityEntry = { seq: number; ts: number | null; level: 'info' | 'warn' | 'error'; msg: string }
// forwarded_seq: the last event an app has already forwarded to Dash0
export type ActivityLog = { boot_id: string; seq: number; forwarded_seq: number; entries: ActivityEntry[] }

const TIMEOUT_MS = 5000
const ENERGY_TIMEOUT_MS = 15000
const RPC_TIMEOUT_MS = 10000

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

// Gen2+ JSON-RPC. The body is sent as text/plain, so the browser doesn't need a CORS preflight.
export async function rpc<T = unknown>(ip: string, method: string, params: object = {}, timeoutMs = RPC_TIMEOUT_MS) {
  const body = await request<{ result?: T; error?: { code: number; message: string } }>(
    `http://${ip}/rpc`,
    { method: 'POST', body: JSON.stringify({ id: 1, method, params }) },
    timeoutMs
  )
  if (body.error) throw new ShellyHttpError(`${method}: ${body.error.message}`, body.error.code)
  return body.result as T
}

// Calls an api_* function inside the running script through RPC and returns its JSON answer.
// Current firmware answers cross-origin requests to script endpoints (/script/<id>/...) with 403,
// while the RPC API allows them, so the app never uses the endpoints directly.
export async function evalScript<T>(ip: string, scriptId: number, code: string) {
  const { result } = await rpc<{ result: string }>(ip, 'Script.Eval', { id: scriptId, code })
  let value: unknown = JSON.parse(result)
  // depending on the firmware, a returned string may come back quoted once more
  if (typeof value === 'string') value = JSON.parse(value)
  return value as T
}

// Gen1 HTTP API, e.g. /ota or /relay/0
export function gen1<T = unknown>(ip: string, path: string) {
  return request<T>(`http://${ip}${path}`)
}

// /shelly answers on every generation: Gen2+ report `gen`, Gen1 report `type` and `fw`
export type DeviceIdentity = { gen?: number; model?: string; ver?: string; app?: string; type?: string; fw?: string }

export function identify(ip: string) {
  return request<DeviceIdentity>(`http://${ip}/shelly`)
}

// Talks to the controller script (fw.js) and the energy meters.
export function useShelly() {
  const mainStore = useMainStore()

  const scriptUrl = (endpoint: string) => `http://${mainStore.controllerIp}/script/${mainStore.scriptId}/${endpoint}`
  const call = <T>(code: string) => evalScript<T>(mainStore.controllerIp, mainStore.scriptId, code)

  // every change goes through api_update, picked by `action`
  async function update(action: string, body: object) {
    const text = JSON.stringify({ action, ...body })
    const answer = await call<{ code: number; body: { status: string; error?: string } }>(
      `api_update(${JSON.stringify(text)})`
    )
    if (answer.code >= 400) throw new ShellyHttpError(answer.body.error ?? `HTTP ${answer.code}`, answer.code)
    return answer.body
  }

  async function getData() {
    try {
      return await call<ControllerData>('api_get_data()')
    } catch (e) {
      // scripts older than the RPC API only have the endpoint
      if (e instanceof ShellyHttpError) return request<ControllerData>(scriptUrl('getCData'))
      throw e
    }
  }

  async function getLog() {
    try {
      return await call<ActivityLog>('api_get_log()')
    } catch (e) {
      // older scripts have no activity log
      if (e instanceof ShellyHttpError) throw new ShellyHttpError(e.message, 404)
      throw e
    }
  }

  return {
    getData,
    getLog,
    ackLog: (seq: number) => update('ack_log', { seq }),
    // originalName is the current name when editing, undefined when adding
    setConsumer: (consumer: ConsumerInput, originalName?: string) =>
      update('set_consumer', { ...consumer, original_name: originalName }),
    deleteConsumer: (name: string) => update('delete_consumer', { name }),
    setOrder: (names: string[]) => update('set_order', { names }),
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
