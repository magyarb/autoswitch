/* eslint-disable */
// Safety net: restarts the autoswitch script (fw.js) if it stops.

let SCRIPT_ID = 1 // id of fw.js on the device
let CHECK_MS = 15000

function check() {
  Shelly.call('Script.GetStatus', { id: SCRIPT_ID }, function (result, error_code) {
    if (error_code !== 0 || !result || result.running) return
    print('[restarter] script', SCRIPT_ID, 'is not running, restarting')
    if (result.errors) print('[restarter] errors:', JSON.stringify(result.errors))
    Shelly.call('Script.Start', { id: SCRIPT_ID }, function (result, error_code, error_message) {
      if (error_code === 0) print('[restarter] restarted')
      else print('[restarter] restart failed', error_code, error_message)
    })
  })
}

Timer.set(CHECK_MS, true, check)
