/* eslint-disable */
// Safety net: restarts the autoswitch script (fw.js) if it stops.

let SCRIPT_ID = 1 // id of fw.js on the device
let CHECK_MS = 15000

function on_started(result, error_code, error_message) {
  if (error_code === 0) print('[restarter] restarted')
  else print('[restarter] restart failed', error_code, error_message)
}

function on_status(result, error_code) {
  if (error_code !== 0 || !result || result.running) return null
  print('[restarter] script', SCRIPT_ID, 'is not running, restarting')
  if (result.errors) print('[restarter] errors:', JSON.stringify(result.errors))
  Shelly.call('Script.Start', { id: SCRIPT_ID }, on_started)
}

function check() {
  Shelly.call('Script.GetStatus', { id: SCRIPT_ID }, on_status)
}

Timer.set(CHECK_MS, true, check)
