import { Ref } from 'vue'
import { useMainStore } from '~/stores/main'

export type HistoryRange = '6h' | '24h' | '7d'

export const HISTORY_RANGES: Record<
  HistoryRange,
  { label: string; seconds: number; period: number; tickHours: number }
> = {
  '6h': { label: '6 h', seconds: 6 * 3600, period: 300, tickHours: 1 },
  '24h': { label: '24 h', seconds: 24 * 3600, period: 300, tickHours: 3 },
  '7d': { label: '7 d', seconds: 7 * 24 * 3600, period: 3600, tickHours: 24 }
}

// average power (W) per phase A, B, C
export type PhasePower = [number, number, number]

export type HistoryRow = {
  ts: number
  production: PhasePower | null
  consumption: PhasePower | null
}

type MeterCache = { from: number; to: number; rows: Map<number, PhasePower> }
// [from, to, period] in seconds
type Span = [number, number, number]
type Query = { start: number; end: number; period: number; isCurrent: () => boolean }

class Cancelled extends Error {}

const NET_KEYS = ['a_net_act_energy', 'b_net_act_energy', 'c_net_act_energy']
const ACT_KEYS = ['a_total_act_energy', 'b_total_act_energy', 'c_total_act_energy']
const RET_KEYS = ['a_total_act_ret_energy', 'b_total_act_ret_energy', 'c_total_act_ret_energy']
const MAX_PAGES = 200
const CACHE_KEY = 'autoswitch-energy-v1'
const CACHE_MAX_AGE_S = 8 * 24 * 3600
const AUTO_REFRESH_MS = 5 * 60 * 1000

// Records never change once written, so they are cached per meter and period (also
// across reloads) and only newer records are fetched on the next load.
const cache = new Map<string, MeterCache>()
const supportsNetEnergies = new Map<string, boolean>()
let isCacheLoaded = false

function loadCache() {
  if (isCacheLoaded) return
  isCacheLoaded = true
  try {
    const stored: Record<string, { from: number; to: number; rows: [number, ...PhasePower][] }> = JSON.parse(
      localStorage.getItem(CACHE_KEY) ?? '{}'
    )
    for (const [key, entry] of Object.entries(stored)) {
      cache.set(key, {
        from: entry.from,
        to: entry.to,
        rows: new Map(entry.rows.map(([ts, a, b, c]) => [ts, [a, b, c]]))
      })
    }
  } catch {
    localStorage.removeItem(CACHE_KEY)
  }
}

function saveCache() {
  const oldest = Date.now() / 1000 - CACHE_MAX_AGE_S
  const stored: Record<string, { from: number; to: number; rows: [number, ...PhasePower][] }> = {}
  for (const [key, entry] of cache) {
    const rows: [number, ...PhasePower][] = []
    for (const [ts, power] of entry.rows) if (ts >= oldest) rows.push([ts, ...power])
    stored[key] = { from: Math.max(entry.from, oldest), to: entry.to, rows }
  }
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(stored))
  } catch {
    // storage full: the cache is only an optimisation
  }
}

const round1 = (value: number) => Math.round(value * 10) / 10
const alignDown = (ts: number, period: number) => Math.floor(ts / period) * period

export function useEnergyHistory(range: Ref<HistoryRange>) {
  const mainStore = useMainStore()
  const shelly = useShelly()

  const rows = shallowRef<HistoryRow[]>([])
  const from = ref(0)
  const to = ref(0)
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)

  async function fetchNet(ip: string, query: Query) {
    const result = new Map<number, PhasePower>()
    let columns = [0, 1, 2]
    let ts = query.start
    for (let page = 0; page < MAX_PAGES; page++) {
      if (!query.isCurrent()) throw new Cancelled()
      const response = await shelly.getNetEnergies(ip, {
        ts,
        endTs: query.end,
        period: query.period,
        addKeys: page === 0
      })
      if (response.keys) columns = NET_KEYS.map(key => response.keys!.indexOf(key))
      for (const block of response.data) {
        block.values.forEach((row, i) => {
          const power = columns.map(column => round1((row[column] * 3600) / block.period)) as PhasePower
          result.set(block.ts + i * block.period, power)
        })
      }
      if (!response.next_record_ts || response.next_record_ts <= ts) break
      ts = response.next_record_ts
    }
    return result
  }

  // older firmware: aggregate the 1-minute records into periods ourselves
  async function fetchLegacy(ip: string, query: Query) {
    const buckets = new Map<number, { wh: PhasePower; seconds: number }>()
    let ts = query.start
    for (let page = 0; page < MAX_PAGES; page++) {
      if (!query.isCurrent()) throw new Cancelled()
      const response = await shelly.getData1m(ip, ts, query.end)
      const keys = response.keys ?? []
      const act = ACT_KEYS.map(key => keys.indexOf(key))
      const ret = RET_KEYS.map(key => keys.indexOf(key))
      for (const block of response.data) {
        block.values.forEach((row, i) => {
          const bucketTs = alignDown(block.ts + i * block.period, query.period)
          const bucket = buckets.get(bucketTs) ?? { wh: [0, 0, 0], seconds: 0 }
          for (let phase = 0; phase < 3; phase++) {
            bucket.wh[phase] += (row[act[phase]] ?? 0) - (ret[phase] >= 0 ? row[ret[phase]] : 0)
          }
          bucket.seconds += block.period
          buckets.set(bucketTs, bucket)
        })
      }
      if (!response.next_record_ts || response.next_record_ts <= ts) break
      ts = response.next_record_ts
    }
    const result = new Map<number, PhasePower>()
    for (const [bucketTs, { wh, seconds }] of buckets) {
      result.set(bucketTs, wh.map(value => round1((value * 3600) / seconds)) as PhasePower)
    }
    return result
  }

  async function fetchMeter(ip: string, query: Query) {
    if (supportsNetEnergies.get(ip) !== false) {
      try {
        const result = await fetchNet(ip, query)
        supportsNetEnergies.set(ip, true)
        return result
      } catch (e) {
        // only fall back when the device answered; a timeout means it is unreachable
        if (!(e instanceof ShellyHttpError) || supportsNetEnergies.get(ip)) throw e
        supportsNetEnergies.set(ip, false)
        logEvent('history.legacy_fallback', `${ip} has no EMData.GetNetEnergies, loading 1-minute records instead`, {
          severity: 'WARN',
          attributes: { 'device.ip': ip, error: errorMessage(e) }
        })
      }
    }
    return fetchLegacy(ip, query)
  }

  async function loadMeter(ip: string, span: Span, isCurrent: () => boolean) {
    const [rangeFrom, rangeTo, period] = span
    const key = `${ip}|${period}`
    const entry = cache.get(key)
    const isCovered = !!entry && entry.from <= rangeFrom && entry.to > rangeFrom
    // re-fetch the newest cached periods too: the last one may have been incomplete
    const start = alignDown(isCovered ? Math.max(rangeFrom, entry!.to - 2 * period) : rangeFrom, period)
    const fetched = await fetchMeter(ip, { start, end: rangeTo, period, isCurrent })

    const updated: MeterCache = entry ?? { from: start, to: rangeTo, rows: new Map() }
    for (const [ts, power] of fetched) updated.rows.set(ts, power)
    if (!isCovered) updated.from = start
    updated.to = rangeTo
    cache.set(key, updated)
    return updated.rows
  }

  // one row per period on a common grid; missing records become gaps
  function showGrid(production: Map<number, PhasePower>, consumption: Map<number, PhasePower>, span: Span) {
    const [rangeFrom, rangeTo, period] = span
    const grid: HistoryRow[] = []
    for (let ts = rangeFrom; ts < rangeTo; ts += period) {
      grid.push({ ts, production: production.get(ts) ?? null, consumption: consumption.get(ts) ?? null })
    }
    while (grid.length && !grid[grid.length - 1].production && !grid[grid.length - 1].consumption) grid.pop()
    from.value = rangeFrom
    to.value = rangeTo
    rows.value = grid
  }

  // every load supersedes the previous one; a superseded load stops before its next request
  let generation = 0

  async function load() {
    const current = ++generation
    const isCurrent = () => current === generation
    loadCache()
    const { seconds, period } = HISTORY_RANGES[range.value]
    const rangeTo = Math.floor(Date.now() / 1000)
    const span: Span = [alignDown(rangeTo - seconds, period), rangeTo, period]

    // draw what is cached right away, then fetch only the newer records
    const cachedProduction = cache.get(`${mainStore.productionIp}|${period}`)
    const cachedConsumption = cache.get(`${mainStore.consumptionIp}|${period}`)
    if (cachedProduction && cachedConsumption) showGrid(cachedProduction.rows, cachedConsumption.rows, span)

    isLoading.value = true
    loadError.value = null
    try {
      const [production, consumption] = await Promise.all([
        loadMeter(mainStore.productionIp, span, isCurrent),
        loadMeter(mainStore.consumptionIp, span, isCurrent)
      ])
      if (!isCurrent()) return
      showGrid(production, consumption, span)
      saveCache()
    } catch (e) {
      if (e instanceof Cancelled || !isCurrent()) return
      loadError.value = `Could not load the history: ${errorMessage(e)}`
      logEvent('history.load_failed', loadError.value, { severity: 'WARN', attributes: { range: range.value } })
    } finally {
      if (isCurrent()) isLoading.value = false
    }
  }

  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    load()
    timer = setInterval(load, AUTO_REFRESH_MS)
  })
  onBeforeUnmount(() => clearInterval(timer))
  watch(range, load)
  watch(() => [mainStore.productionIp, mainStore.consumptionIp], load)

  return { rows, from, to, isLoading, loadError, refresh: load }
}
