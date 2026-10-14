import { useMainStore } from '~/stores/main'
import {
  BUNDLED_SCRIPT_VERSION,
  CONTROLLER_SCRIPT_NAME,
  WATCHDOG_SCRIPT_NAME,
  buildControllerScript,
  buildWatchdogScript
} from '~/utils/scriptBundle'

type ScriptInfo = { id: number; name: string; enable: boolean; running: boolean }
type StepKey = 'connect' | 'find' | 'backup' | 'stop' | 'upload' | 'start' | 'verify' | 'watchdog'

export type InstallStep = {
  key: StepKey
  label: string
  state: 'pending' | 'active' | 'done' | 'error'
  detail?: string
}

const STEPS: [StepKey, string][] = [
  ['connect', 'Connect to the controller'],
  ['find', 'Find the scripts'],
  ['backup', 'Back up the current script'],
  ['stop', 'Stop the old scripts'],
  ['upload', 'Upload the new script'],
  ['start', 'Start it'],
  ['verify', 'Wait until it answers'],
  ['watchdog', 'Install the watchdog']
]

// the Python upload tool from Shelly uses the same chunk size
const CHUNK = 1024
const VERIFY_TIMEOUT_MS = 30000

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Installs fw.js and restarter.js on the controller over its RPC API, the same way the
// Shelly web UI does: stop, upload in chunks, enable on boot, start.
export function useScriptInstaller() {
  const mainStore = useMainStore()
  const steps = ref<InstallStep[]>([])
  const isRunning = ref(false)
  const installError = ref<string | null>(null)

  let current: InstallStep | null = null
  function begin(key: StepKey) {
    if (current?.state === 'active') current.state = 'done'
    current = steps.value.find(step => step.key === key)!
    current.state = 'active'
  }
  const detail = (text: string) => current && (current.detail = text)

  async function readCode(ip: string, id: number) {
    let code = ''
    for (let offset = 0; ; ) {
      const part = await rpc<{ data: string; left: number }>(ip, 'Script.GetCode', { id, offset, len: 4096 })
      code += part.data
      offset += part.data.length
      if (!part.left || !part.data.length) return code
    }
  }

  async function upload(ip: string, id: number, code: string) {
    for (let i = 0; i < code.length; i += CHUNK) {
      detail(`${Math.min(i + CHUNK, code.length)} / ${code.length} bytes`)
      await rpc(ip, 'Script.PutCode', { id, code: code.slice(i, i + CHUNK), append: i > 0 })
    }
  }

  async function findWatchdog(ip: string, scripts: ScriptInfo[], controllerId: number) {
    const byName = scripts.find(s => s.name === WATCHDOG_SCRIPT_NAME)
    if (byName) return byName.id
    // an older watchdog (restarter.js) installed by hand under another name
    for (const script of scripts) {
      if (script.id === controllerId) continue
      const start = await rpc<{ data: string }>(ip, 'Script.GetCode', { id: script.id, len: 2000 })
      if (start.data.includes('Script.GetStatus') && start.data.includes('Script.Start')) return script.id
    }
    return (await rpc<{ id: number }>(ip, 'Script.Create', { name: WATCHDOG_SCRIPT_NAME })).id
  }

  async function waitForVersion(ip: string, id: number) {
    const deadline = Date.now() + VERIFY_TIMEOUT_MS
    while (Date.now() < deadline) {
      try {
        const data = await evalScript<{ script_version?: string }>(ip, id, 'api_get_data()')
        if (data.script_version === BUNDLED_SCRIPT_VERSION) return
      } catch {
        // still starting
      }
      // a crash during startup would otherwise only show up as a timeout
      const status = await rpc<{ running: boolean; errors?: string[] }>(ip, 'Script.GetStatus', { id })
      if (!status.running) {
        const reason = status.errors?.length ? ` (${status.errors.join(', ')})` : ''
        throw new Error(`The new script stopped right after starting${reason}`)
      }
      await sleep(1000)
    }
    throw new Error('The new script did not answer within 30 s')
  }

  async function install() {
    const ip = mainStore.controllerIp
    steps.value = STEPS.map(([key, label]) => ({ key, label, state: 'pending' }))
    isRunning.value = true
    installError.value = null
    const fromVersion = mainStore.data?.script_version ?? 'unknown'
    logEvent('script.install_started', `Installing controller script ${BUNDLED_SCRIPT_VERSION}`, {
      attributes: { 'script.from_version': fromVersion, 'script.to_version': BUNDLED_SCRIPT_VERSION }
    })

    let backup: { id: number; code: string } | null = null
    let watchdogId: number | null = null
    let isWatchdogRunningBefore = false
    let isOldScriptStopped = false
    try {
      begin('connect')
      const info = await rpc<{ model: string; gen: number; ver: string }>(ip, 'Shelly.GetDeviceInfo')
      if (!info.gen || info.gen < 2) throw new Error('The controller must be a Gen2 or newer Shelly')
      detail(`${info.model}, firmware ${info.ver}`)

      begin('find')
      const { scripts } = await rpc<{ scripts: ScriptInfo[] }>(ip, 'Script.List')
      const existing =
        scripts.find(s => s.name === CONTROLLER_SCRIPT_NAME) ?? scripts.find(s => s.id === mainStore.scriptId)
      const id = existing?.id ?? (await rpc<{ id: number }>(ip, 'Script.Create', { name: CONTROLLER_SCRIPT_NAME })).id
      watchdogId = await findWatchdog(ip, scripts, id)
      isWatchdogRunningBefore = !!scripts.find(s => s.id === watchdogId)?.running
      detail(`script ${id}, watchdog ${watchdogId}`)

      begin('backup')
      if (existing) {
        backup = { id, code: await readCode(ip, id) }
        detail(backup.code ? `${backup.code.length} bytes` : 'empty')
      } else detail('nothing installed yet')

      // the watchdog first, or it would restart the controller script halfway through the upload
      begin('stop')
      await rpc(ip, 'Script.Stop', { id: watchdogId })
      await rpc(ip, 'Script.Stop', { id })
      isOldScriptStopped = true

      begin('upload')
      await upload(ip, id, buildControllerScript(mainStore))

      begin('start')
      await rpc(ip, 'Script.SetConfig', { id, config: { name: CONTROLLER_SCRIPT_NAME, enable: true } })
      await rpc(ip, 'Script.Start', { id })
      if (mainStore.scriptId !== id) mainStore.scriptId = id

      begin('verify')
      await waitForVersion(ip, id)
      backup = null

      begin('watchdog')
      await upload(ip, watchdogId, buildWatchdogScript(id))
      await rpc(ip, 'Script.SetConfig', { id: watchdogId, config: { name: WATCHDOG_SCRIPT_NAME, enable: true } })
      await rpc(ip, 'Script.Start', { id: watchdogId })
      current!.state = 'done'

      logEvent('script.install_succeeded', `Controller script ${BUNDLED_SCRIPT_VERSION} installed`, {
        attributes: { 'script.from_version': fromVersion, 'script.to_version': BUNDLED_SCRIPT_VERSION }
      })
    } catch (e) {
      const failedStep = current?.key ?? ''
      if (current) current.state = 'error'
      // the restore's upload progress must not show up on the failed step
      current = null
      const message = errorMessage(e)
      installError.value = /[.!]$/.test(message) ? message : `${message}.`
      // put the old script back, so the house keeps working
      if (backup?.code && isOldScriptStopped)
        installError.value += await restore(ip, backup, watchdogId, isWatchdogRunningBefore)
      logEvent('script.install_failed', `Installing the controller script failed: ${installError.value}`, {
        severity: 'ERROR',
        attributes: { 'script.step': failedStep, 'script.to_version': BUNDLED_SCRIPT_VERSION }
      })
    } finally {
      isRunning.value = false
    }
  }

  async function restore(
    ip: string,
    backup: { id: number; code: string },
    watchdogId: number | null,
    isWatchdogRunningBefore: boolean
  ) {
    try {
      await rpc(ip, 'Script.Stop', { id: backup.id })
      await upload(ip, backup.id, backup.code)
      await rpc(ip, 'Script.Start', { id: backup.id })
      if (watchdogId !== null && isWatchdogRunningBefore) await rpc(ip, 'Script.Start', { id: watchdogId })
      return ' The previous script was restored.'
    } catch (e) {
      return ` Restoring the previous script failed too: ${errorMessage(e)}`
    }
  }

  return { steps, isRunning, installError, install }
}
