// The controller scripts, bundled into the app so it can install them on the device.
import controllerSource from '~/fw.js?raw'
import watchdogSource from '~/restarter.js?raw'

export const CONTROLLER_SCRIPT_NAME = 'autoswitch'
export const WATCHDOG_SCRIPT_NAME = 'autoswitch-watchdog'

// FNV-1a: a short, stable version id for exactly this script code
function hash(text: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

export const BUNDLED_SCRIPT_VERSION = hash(controllerSource + watchdogSource)

// Comments and indentation only cost device memory. Only whole-line comments are removed:
// a trailing "//" could be part of a string such as 'http://'.
function strip(source: string) {
  return source
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//') && !(line.startsWith('/*') && line.endsWith('*/')))
    .join('\n')
}

// Replaces the value of a top-level `let NAME = ...` line; the line must exist exactly once.
function setValue(source: string, name: string, value: string | number) {
  const pattern = new RegExp(`^let ${name} = .*$`, 'gm')
  const matches = source.match(pattern)
  if (matches?.length !== 1) throw new Error(`Script setting ${name} not found`)
  return source.replace(pattern, `let ${name} = ${JSON.stringify(value)}`)
}

export function buildControllerScript(settings: { controllerIp: string; productionIp: string; consumptionIp: string }) {
  let code = setValue(controllerSource, 'SCRIPT_VERSION', BUNDLED_SCRIPT_VERSION)
  code = setValue(code, 'controller_ip', settings.controllerIp)
  code = setValue(code, 'production_device_ip', settings.productionIp)
  code = setValue(code, 'consumption_device_ip', settings.consumptionIp)
  return strip(code)
}

export function buildWatchdogScript(controllerScriptId: number) {
  return strip(setValue(watchdogSource, 'SCRIPT_ID', controllerScriptId))
}
