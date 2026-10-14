/* eslint-disable */
// Autoswitch controller script for a Shelly Gen2+ device (e.g. Pro 3EM).
//
// Written for the Shelly scripting subset: only let, function, if/for, closures,
// try/catch, JSON, Shelly.call, Timer.set and HTTPServer are used. No arrow functions,
// template literals, classes, spread, promises or hoisting.
// Device limits (checked by `yarn lint:shelly`): at most 5 HTTP endpoints, 5 timers and
// 5 calls in flight, and callbacks nested at most one level deep (deeper nesting can
// crash the device), so multi-step chains use named top-level functions.

// ---- configuration ---------------------------------------------------------

let consumption_device_ip = '192.168.0.49'
let production_device_ip = '192.168.0.40'
let controller_ip = '192.168.0.40'

// The app fills in these values when it installs the script (Devices page).
let SCRIPT_VERSION = 'dev'

let CYCLE_MS = 5000 // the control loop runs this often
let HTTP_TIMEOUT = 3 // seconds, for every HTTP.GET
let ON_RATIO = 0.8 // turn on when surplus > max_consumption * ON_RATIO
let OFF_RATIO = 0.5 // turn off when deficit > drawn power * OFF_RATIO
let IDLE_W = 20 // a consumer drawing less than this is idle (e.g. thermostat cut out)
let MIN_SWITCH_TICKS = 12 // min time between automatic switches of one consumer (12 * 5 s = 60 s)
let SETTLE_TICKS = 2 // after a switch, wait this many cycles before deciding again on that phase
let WATCHDOG_TICKS = 24 // start a new cycle if the previous one hangs this long (24 * 5 s = 120 s)
let KVS_PREFIX = 'autoswitch_'
let LOG_SIZE = 30 // events kept for the app's activity log

// Used only on first start, when nothing is saved in KVS yet.
// Order = priority: the first consumer is turned on first and turned off last.
let default_consumers = [
  { name: 'bojlerA', ip: '192.168.0.39', max_consumption: 800, phase: 'A', mode: 'auto' },
  { name: 'bojlerB', ip: '192.168.0.37', max_consumption: 800, phase: 'B', mode: 'auto' },
  { name: 'bojlerC', ip: '192.168.0.38', max_consumption: 800, phase: 'C', mode: 'auto' },
  { name: 'nagyszobaJobb', ip: '192.168.0.59', max_consumption: 800, phase: 'A', mode: 'auto' },
  { name: 'nagyszobaBal', ip: '192.168.0.60', max_consumption: 800, phase: 'A', mode: 'auto' },
  { name: 'radiatorKonyha', ip: '192.168.0.41', max_consumption: 800, phase: 'B', mode: 'auto' },
  { name: 'folyoso', ip: '192.168.0.56', max_consumption: 800, phase: 'B', mode: 'auto' },
  { name: 'nagyszobaAjto', ip: '192.168.0.58', max_consumption: 800, phase: 'C', mode: 'auto' },
  { name: 'boriSzoba', ip: '192.168.0.57', max_consumption: 800, phase: 'C', mode: 'auto' }
]

// ---- state -----------------------------------------------------------------

let a_consumption = 0
let b_consumption = 0
let c_consumption = 0
let a_production = 0
let b_production = 0
let c_production = 0
let meters_ok = false
let production_ok = false

let consumers = []

let tick = 0
let cycle_id = 0
let busy = false
let busy_since = 0
let phase_last_switch = { A: -1000, B: -1000, C: -1000 }

let saving = false
let save_again = false

let log_entries = []
let log_seq = 0
let log_forwarded_seq = 0 // last event the app has forwarded to its log service
let boot_id = ''
let meters_state = 'unknown' // unknown | ok | failed

// ---- activity log ----------------------------------------------------------
//
// The last LOG_SIZE events, served by getLog; everything is printed as well.

function now_unix() {
  let sys = Shelly.getComponentStatus('sys')
  return sys && sys.unixtime ? sys.unixtime : null
}

function log_event(level, message) {
  log_seq++
  log_entries.push({ seq: log_seq, ts: now_unix(), level: level, msg: message })
  if (log_entries.length > LOG_SIZE) {
    let kept = []
    for (let i = 1; i < log_entries.length; i++) kept.push(log_entries[i])
    log_entries = kept
  }
  print('[' + level + '] ' + message)
}

// logs only when a consumer goes offline or comes back, not on every poll
function set_online(c, online) {
  if (!online && !c.offline_logged) {
    log_event('warn', c.name + ' (' + c.ip + ') is unreachable')
    c.offline_logged = true
  }
  if (online && c.offline_logged) {
    log_event('info', c.name + ' is reachable again')
    c.offline_logged = false
  }
  c.online = online
}

// ---- helpers ---------------------------------------------------------------

function make_consumer(s) {
  return {
    name: s.name,
    ip: s.ip,
    max_consumption: s.max_consumption,
    phase: s.phase,
    mode: s.mode,
    status: 'unknown',
    online: false,
    current_consumption: null,
    last_switch: -1000,
    // a manual mode (on/off) still has to be applied to the device
    pending: s.mode !== 'auto'
  }
}

function contains(list, item) {
  for (let i = 0; i < list.length; i++) {
    if (list[i] === item) return true
  }
  return false
}

function find_consumer(name) {
  for (let i = 0; i < consumers.length; i++) {
    if (consumers[i].name === name) return consumers[i]
  }
  return null
}

// JSON.parse throws on malformed text; that must never stop the script
function parse_json(text) {
  try {
    return JSON.parse(text)
  } catch (e) {
    return null
  }
}

// Returns the parsed body of a successful HTTP.GET, or null on any error.
function get_json(result, error_code) {
  if (error_code !== 0 || !result || result.code !== 200 || !result.body) return null
  return parse_json(result.body)
}

// Reads EM.GetStatus from the local device or a remote one. cb(status or null, id)
function read_em(ip, id, cb) {
  if (ip === controller_ip) {
    Shelly.call('EM.GetStatus', { id: 0 }, function (result, error_code) {
      cb(error_code === 0 && result ? result : null, id)
    })
    return
  }
  Shelly.call(
    'HTTP.GET',
    { url: 'http://' + ip + '/rpc/EM.GetStatus?id=0', timeout: HTTP_TIMEOUT },
    function (result, error_code) {
      cb(get_json(result, error_code), id)
    }
  )
}

// Switches a consumer's relay. cb(ok)
function set_relay(c, on, cb) {
  if (c.ip === controller_ip) {
    Shelly.call('Switch.Set', { id: 0, on: on }, function (result, error_code) {
      set_online(c, error_code === 0)
      if (c.online) c.status = on ? 'on' : 'off'
      cb(c.online)
    })
    return
  }
  Shelly.call(
    'HTTP.GET',
    { url: 'http://' + c.ip + '/relay/0?turn=' + (on ? 'on' : 'off'), timeout: HTTP_TIMEOUT },
    function (result, error_code) {
      let relay = get_json(result, error_code)
      set_online(c, !!relay && relay.ison !== undefined)
      if (c.online) c.status = relay.ison ? 'on' : 'off'
      cb(c.online && relay.ison === on)
    }
  )
}

// ---- control loop ----------------------------------------------------------
//
// One cycle is a single sequential chain, so at most one call is in flight:
// read production -> read consumption -> switch relays -> poll every consumer.
// A new cycle never starts while the previous one is still running.

function cycle() {
  tick++
  start_cycle()
}

// Also called directly to apply a manual change right away instead of on the next tick.
function start_cycle() {
  if (busy && tick - busy_since < WATCHDOG_TICKS) return
  if (busy) log_event('warn', 'previous control cycle did not finish, starting a new one')
  busy = true
  busy_since = tick
  cycle_id++
  read_em(production_device_ip, cycle_id, on_production)
}

// The steps of a cycle are top-level functions that pass the cycle id along:
// read production -> read consumption -> decide and switch -> poll consumers.
function on_production(production, id) {
  production_ok = !!production
  if (production) {
    a_production = production.a_act_power
    b_production = production.b_act_power
    c_production = production.c_act_power
  }
  read_em(consumption_device_ip, id, on_consumption)
}

function on_consumption(consumption, id) {
  if (consumption) {
    a_consumption = consumption.a_act_power
    b_consumption = consumption.b_act_power
    c_consumption = consumption.c_act_power
  }
  meters_ok = production_ok && !!consumption
  if (!meters_ok && meters_state !== 'failed') {
    log_event('error', 'cannot read the energy meters, automatic switching is paused')
    meters_state = 'failed'
  }
  if (meters_ok && meters_state === 'failed') log_event('info', 'energy meters readable again')
  if (meters_ok) meters_state = 'ok'

  let actions = []
  decide_phase('A', a_production - a_consumption, actions)
  decide_phase('B', b_production - b_consumption, actions)
  decide_phase('C', c_production - c_consumption, actions)
  run_actions(actions, 0, id)
}

function can_switch(c) {
  return tick - c.last_switch >= MIN_SWITCH_TICKS
}

// Measured power if known, otherwise assume the worst case.
function drawn_power(c) {
  if (c.current_consumption === null || c.current_consumption === undefined) return c.max_consumption
  return c.current_consumption
}

function decide_phase(phase, available, actions) {
  let manual_action = false
  let auto_list = []
  for (let i = 0; i < consumers.length; i++) {
    let c = consumers[i]
    if (c.phase !== phase || !c.online) continue
    if (c.mode === 'auto') {
      auto_list.push(c)
      continue
    }
    // manual modes are applied once, after a mode change or a restart
    if (c.pending) {
      actions.push({ consumer: c, on: c.mode === 'on' })
      manual_action = true
    }
  }

  // one change per phase per cycle, and let the meters settle after a switch
  if (manual_action || !meters_ok) return
  if (tick - phase_last_switch[phase] < SETTLE_TICKS) return

  // surplus: turn on the highest-priority consumer that fits
  if (available > 0) {
    for (let i = 0; i < auto_list.length; i++) {
      let c = auto_list[i]
      if (c.status === 'on' || !can_switch(c)) continue
      if (c.max_consumption * ON_RATIO < available) {
        log_event('info', 'turning on ' + c.name + ' (phase ' + phase + ', ' + Math.round(available) + ' W surplus)')
        actions.push({ consumer: c, on: true })
        return
      }
    }
    return
  }

  // deficit: only the lowest-priority consumer that actually draws power is
  // considered, so a higher-priority one is never switched off before it
  if (available < 0) {
    for (let i = auto_list.length - 1; i >= 0; i--) {
      let c = auto_list[i]
      if (c.status === 'off') continue
      let draw = drawn_power(c)
      if (draw < IDLE_W) continue // switching an idle consumer off would not help
      if (draw * OFF_RATIO < -available && can_switch(c)) {
        log_event('info', 'turning off ' + c.name + ' (phase ' + phase + ', ' + Math.round(-available) + ' W deficit)')
        actions.push({ consumer: c, on: false })
      }
      return
    }
  }
}

// switches one relay after the other, then polls the consumers
function run_actions(actions, i, id) {
  if (i >= actions.length) {
    poll_status(id, 0)
    return
  }
  let c = actions[i].consumer
  let on = actions[i].on
  set_relay(c, on, function (ok) {
    if (ok) {
      c.last_switch = tick
      phase_last_switch[c.phase] = tick
      if (c.mode === (on ? 'on' : 'off')) c.pending = false
    } else {
      log_event('warn', 'failed to switch ' + c.name + (on ? ' on' : ' off'))
    }
    run_actions(actions, i + 1, id)
  })
}

function poll_status(id, i) {
  if (id !== cycle_id) return // a newer cycle took over
  if (i >= consumers.length) {
    busy = false
    return
  }
  let c = consumers[i]

  if (c.ip === controller_ip) {
    Shelly.call('Switch.GetStatus', { id: 0 }, function (result, error_code) {
      set_online(c, error_code === 0 && !!result)
      if (c.online) {
        c.status = result.output ? 'on' : 'off'
        c.current_consumption = result.apower === undefined ? null : result.apower
      }
      poll_status(id, i + 1)
    })
    return
  }

  Shelly.call('HTTP.GET', { url: 'http://' + c.ip + '/meter/0', timeout: HTTP_TIMEOUT }, function (result, error_code) {
    if (error_code !== 0) {
      // unreachable: don't wait for a second timeout on /relay/0
      set_online(c, false)
      c.current_consumption = null
      poll_status(id, i + 1)
      return
    }
    // devices without a power meter answer /meter/0 with an error, that's fine
    let meter = get_json(result, error_code)
    c.current_consumption = meter && meter.power !== undefined ? meter.power : null
    poll_relay(id, i, c)
  })
}

function poll_relay(id, i, c) {
  Shelly.call('HTTP.GET', { url: 'http://' + c.ip + '/relay/0', timeout: HTTP_TIMEOUT }, function (result, error_code) {
    let relay = get_json(result, error_code)
    set_online(c, !!relay && relay.ison !== undefined)
    if (c.online) c.status = relay.ison ? 'on' : 'off'
    poll_status(id, i + 1)
  })
}

// ---- persistence (KVS) -----------------------------------------------------
//
// One KVS key per consumer keeps every value well below the KVS size limit:
// autoswitch_count, autoswitch_0, autoswitch_1, ...

function save_consumers() {
  if (saving) {
    save_again = true
    return
  }
  saving = true
  save_consumer(0)
}

function save_consumer(i) {
  if (i >= consumers.length) {
    Shelly.call('KVS.Set', { key: KVS_PREFIX + 'count', value: '' + consumers.length }, function (result, error_code) {
      if (error_code !== 0) log_event('error', 'could not save the consumer list (' + error_code + ')')
      saving = false
      if (save_again) {
        save_again = false
        save_consumers()
      }
    })
    return
  }
  let c = consumers[i]
  let value = JSON.stringify({
    name: c.name,
    ip: c.ip,
    max_consumption: c.max_consumption,
    phase: c.phase,
    mode: c.mode
  })
  Shelly.call('KVS.Set', { key: KVS_PREFIX + i, value: value }, function (result, error_code) {
    if (error_code !== 0) log_event('error', 'could not save ' + c.name + ' (' + error_code + ')')
    save_consumer(i + 1)
  })
}

function load_consumers(done) {
  Shelly.call('KVS.Get', { key: KVS_PREFIX + 'count' }, function (result, error_code) {
    if (error_code !== 0 || !result || !result.value) {
      log_event('info', 'no saved consumers yet, using the default list')
      for (let i = 0; i < default_consumers.length; i++) {
        consumers.push(make_consumer(default_consumers[i]))
      }
      save_consumers()
      done()
      return
    }
    load_consumer(0, parse_json(result.value) * 1, [], done)
  })
}

function load_consumer(i, count, list, done) {
  if (i >= count) {
    consumers = list
    print('[kvs] loaded', list.length, 'consumers')
    done()
    return
  }
  Shelly.call('KVS.Get', { key: KVS_PREFIX + i }, function (result, error_code) {
    let stored = error_code === 0 && result && result.value ? parse_json(result.value) : null
    if (stored) list.push(make_consumer(stored))
    else log_event('error', 'could not load saved consumer ' + i + ' (' + error_code + ')')
    load_consumer(i + 1, count, list, done)
  })
}

// ---- HTTP API --------------------------------------------------------------
//
// A script may register at most 5 endpoints, so all changes go through one.
//
// GET  /script/<id>/getCData  measurements and consumers
// GET  /script/<id>/getLog    recent activity (the last LOG_SIZE events)
// POST /script/<id>/update    { action, ... }:
//   set_consumer     add, or edit when original_name is sent
//   delete_consumer  { name }
//   set_order        { names: [...] } highest priority first
//   ack_log          { seq } events up to seq were forwarded by the app

function send_json(response, code, obj) {
  response.code = code
  response.body = JSON.stringify(obj)
  response.headers = [
    ['Content-Type', 'application/json'],
    ['Access-Control-Allow-Origin', '*'],
    ['Access-Control-Allow-Methods', 'GET,POST,OPTIONS'],
    ['Access-Control-Allow-Headers', 'Content-Type']
  ]
  response.send()
}

function send_error(response, code, message) {
  send_json(response, code, { status: 'error', error: message })
}

// Answers CORS preflights and empty requests; returns the parsed body or null.
function read_body(request, response) {
  if (request.method === 'OPTIONS') {
    send_json(response, 200, { status: 'ok' })
    return null
  }
  let body = request.body ? parse_json(request.body) : null
  if (!body) send_error(response, 400, 'missing or invalid JSON body')
  return body
}

// Returns an error message, or null if the consumer is valid.
function validate_consumer(body) {
  if (!body.name || body.name.length > 32) return 'name must be 1-32 characters'
  if (!body.ip || body.ip.length > 40) return 'ip must be 1-40 characters'
  if (body.phase !== 'A' && body.phase !== 'B' && body.phase !== 'C') return 'phase must be A, B or C'
  if (body.mode !== 'auto' && body.mode !== 'on' && body.mode !== 'off') return 'mode must be auto, on or off'
  if (!(body.max_consumption * 1 > 0)) return 'max_consumption must be a positive number'
  return null
}

function handle_get_data(request, response) {
  send_json(response, 200, {
    a_consumption: a_consumption,
    b_consumption: b_consumption,
    c_consumption: c_consumption,
    a_production: a_production,
    b_production: b_production,
    c_production: c_production,
    meters_ok: meters_ok,
    script_version: SCRIPT_VERSION,
    consumers: consumers
  })
}

function handle_get_log(request, response) {
  send_json(response, 200, { boot_id: boot_id, seq: log_seq, forwarded_seq: log_forwarded_seq, entries: log_entries })
}

// the app reports which events it has forwarded, so other open browsers don't send them again
function ack_log(body, response) {
  let seq = body.seq * 1
  if (seq > log_forwarded_seq && seq <= log_seq) log_forwarded_seq = seq
  send_json(response, 200, { status: 'ok', forwarded_seq: log_forwarded_seq })
}

function set_consumer(body, response) {
  let error = validate_consumer(body)
  if (error) {
    send_error(response, 400, error)
    return
  }
  body.max_consumption = body.max_consumption * 1

  // original_name present = edit (possibly a rename), absent = new consumer
  let c = body.original_name ? find_consumer(body.original_name) : null
  if (!c && body.original_name) {
    send_error(response, 404, 'consumer not found: ' + body.original_name)
    return
  }
  let same_name = find_consumer(body.name)
  if (same_name && same_name !== c) {
    send_error(response, 409, 'a consumer named ' + body.name + ' already exists')
    return
  }

  if (!c) {
    c = make_consumer(body)
    consumers.push(c)
    log_event('info', 'added ' + c.name)
  } else {
    if (c.ip !== body.ip) {
      c.online = false
      c.status = 'unknown'
      c.current_consumption = null
    }
    if (c.mode !== body.mode) {
      c.pending = body.mode !== 'auto'
      log_event('info', c.name + ' set to ' + body.mode)
    }
    c.name = body.name
    c.ip = body.ip
    c.max_consumption = body.max_consumption
    c.phase = body.phase
    c.mode = body.mode
    print('[api] updated', c.name)
  }
  save_consumers()
  send_json(response, 200, { status: 'ok' })
  if (c.pending) start_cycle()
}

function delete_consumer(body, response) {
  let kept = []
  for (let i = 0; i < consumers.length; i++) {
    if (consumers[i].name !== body.name) kept.push(consumers[i])
  }
  if (kept.length === consumers.length) {
    send_error(response, 404, 'consumer not found: ' + body.name)
    return
  }
  consumers = kept
  log_event('info', 'deleted ' + body.name)
  save_consumers()
  send_json(response, 200, { status: 'ok' })
}

function set_order(body, response) {
  if (!body.names) {
    send_error(response, 400, 'names is required')
    return
  }
  let ordered = []
  for (let i = 0; i < body.names.length; i++) {
    let c = find_consumer(body.names[i])
    if (c && !contains(ordered, c)) ordered.push(c)
  }
  // never lose a consumer that was missing from the request
  for (let i = 0; i < consumers.length; i++) {
    if (!contains(ordered, consumers[i])) ordered.push(consumers[i])
  }
  consumers = ordered
  log_event('info', 'priority order changed')
  save_consumers()
  send_json(response, 200, { status: 'ok' })
}

function handle_update(request, response) {
  let body = read_body(request, response)
  if (!body) return
  if (body.action === 'set_consumer') set_consumer(body, response)
  else if (body.action === 'delete_consumer') delete_consumer(body, response)
  else if (body.action === 'set_order') set_order(body, response)
  else if (body.action === 'ack_log') ack_log(body, response)
  else send_error(response, 400, 'unknown action: ' + body.action)
}

// ---- start -----------------------------------------------------------------

function start() {
  log_event('info', 'autoswitch ' + SCRIPT_VERSION + ' started with ' + consumers.length + ' consumers')
  HTTPServer.registerEndpoint('getCData', handle_get_data)
  HTTPServer.registerEndpoint('getLog', handle_get_log)
  HTTPServer.registerEndpoint('update', handle_update)
  Timer.set(CYCLE_MS, true, cycle)
  cycle()
}

let sys = Shelly.getComponentStatus('sys')
boot_id = sys && sys.unixtime ? '' + sys.unixtime : 'u' + (sys ? sys.uptime : 0)
load_consumers(start)
