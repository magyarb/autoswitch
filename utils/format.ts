// 640 W, 1.2 kW, 12 kW
export function formatPower(value: number | null | undefined, signed = false) {
  if (value === null || value === undefined || Number.isNaN(value)) return '–'
  const sign = signed && value > 0 ? '+' : value < 0 ? '−' : ''
  const abs = Math.abs(value)
  if (abs < 1000) return `${sign}${Math.round(abs)} W`
  const kw = abs / 1000
  return `${sign}${kw < 10 ? kw.toFixed(1) : Math.round(kw)} kW`
}

// axis ticks: 0, 500, 1K, 1.5K
export function formatPowerTick(value: number) {
  const abs = Math.abs(value)
  const sign = value < 0 ? '−' : ''
  if (abs < 1000) return `${sign}${abs}`
  return `${sign}${Number((abs / 1000).toFixed(1))}K`
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

export function formatAgo(ts: number, now: number) {
  const seconds = Math.max(0, Math.round((now - ts) / 1000))
  if (seconds < 60) return `${seconds} s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} h ago`
  return `${Math.round(hours / 24)} days ago`
}
