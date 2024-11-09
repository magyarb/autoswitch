/* eslint-disable */
let consumption_device_ip = '192.168.0.49'
let production_device_ip = '192.168.0.40'

let controller_ip = '192.168.0.40'

let a_consumption = 0
let b_consumption = 0
let c_consumption = 0
let a_production = 0
let b_production = 0
let c_production = 0
let mode = 'CONSUME_LESS'

let consumers = [
  {
    name: 'bojlerA',
    ip: '192.168.0.39',
    status: 'on',
    current_consumption: null,
    max_consumption: 800,
    phase: 'A',
    mode: 'auto'
  },
  {
    name: 'bojlerB',
    ip: '192.168.0.37',
    status: 'on',
    current_consumption: null,
    max_consumption: 800,
    phase: 'B',
    mode: 'auto'
  },
  {
    name: 'bojlerC',
    ip: '192.168.0.38',
    status: 'on',
    current_consumption: null,
    max_consumption: 800,
    phase: 'C',
    mode: 'auto'
  },

  {
    name: 'nagyszobaJobb',
    ip: '192.168.0.59',
    status: 'on',
    current_consumption: null,
    max_consumption: 800,
    phase: 'A',
    mode: 'auto'
  },
  {
    name: 'nagyszobaBal',
    ip: '192.168.0.60',
    status: 'on',
    current_consumption: null,
    max_consumption: 800,
    phase: 'A',
    mode: 'auto'
  },
  {
    name: 'radiatorKonyha',
    ip: '192.168.0.41',
    status: 'on',
    current_consumption: null,
    max_consumption: 800,
    phase: 'B',
    mode: 'auto'
  },
  {
    name: 'folyoso',
    ip: '192.168.0.56',
    status: 'on',
    current_consumption: null,
    max_consumption: 800,
    phase: 'B',
    mode: 'auto'
  },
  {
    name: 'nagyszobaAjto',
    ip: '192.168.0.58',
    status: 'on',
    current_consumption: null,
    max_consumption: 800,
    phase: 'C',
    mode: 'auto'
  },
  {
    name: 'boriSzoba',
    ip: '192.168.0.57',
    status: 'on',
    current_consumption: null,
    max_consumption: 800,
    phase: 'C',
    mode: 'auto'
  }
]

function get_consumption() {
  //print('get_consumption')
  if (consumption_device_ip === controller_ip) {
    //print('get_consumption self')
    Shelly.call(
      'EM.GetStatus',
      {
        id: 0
      },
      function (result) {
        let parsed = result
        //print('parsed', parsed)
        a_consumption = parsed.a_act_power
        b_consumption = parsed.b_act_power
        c_consumption = parsed.c_act_power
        //print('get_consumption done')
        handle_measurement('A')
        handle_measurement('B')
        handle_measurement('C')
      }
    )
  } else {
    Shelly.call(
      'HTTP.GET',
      {
        url: 'http://' + consumption_device_ip + '/rpc/EM.GetStatus?id=0'
      },
      function (result) {
        let parsed = JSON.parse(result.body)
        a_consumption = parsed.a_act_power
        b_consumption = parsed.b_act_power
        c_consumption = parsed.c_act_power
        //print('get_consumption done')
        handle_measurement('A')
        handle_measurement('B')
        handle_measurement('C')
      }
    )
  }
  getStatus(0)
}

function get_production() {
  //print('get_production')
  if (production_device_ip === controller_ip) {
    //print('get_production self')
    Shelly.call(
      'EM.GetStatus',
      {
        id: 0
      },
      function (result) {
        let parsed = result
        //print('parsed', parsed)
        a_production = parsed.a_act_power
        b_production = parsed.b_act_power
        c_production = parsed.c_act_power
        //print('get_production done')
        get_consumption()
      }
    )
  } else {
    Shelly.call(
      'HTTP.GET',
      {
        url: 'http://' + production_device_ip + '/rpc/EM.GetStatus?id=0'
      },
      function (result) {
        let parsed = JSON.parse(result.body)
        a_production = parsed.a_act_power
        b_production = parsed.b_act_power
        c_production = parsed.c_act_power
        //print('get_consumption done')
        get_consumption()
      }
    )
  }
}

function getStatus(index) {
  //set all devices off
  let fixedIndex = index || 0
  //print('[getStatus] device', fixedIndex)

  let consumer = consumers[fixedIndex]
  if (!consumer) {
    //print('[getStatus] DONE by index', fixedIndex)
    return 0
  }
  //print('[getStatus] consumer', consumer.name)
  getStatusForConsumer(consumer, fixedIndex + 1)
  return 0
}

function getStatusForConsumer(consumer, nextIndex) {
  //update the status
  //print('getting status', consumer.name)
  let rootConsumer = null
  for (let rconsumer of consumers) {
    if (rconsumer.name === consumer.name) {
      rootConsumer = rconsumer
      //print('SET rootConsumer', rootConsumer.name)
      break
    }
  }
  if (!rootConsumer) {
    print('Root consumer not found!')
    return
  }
  if (rootConsumer.ip === controller_ip) {
    //print('getting status self')
    Shelly.call('Switch.GetStatus', {
      id: 0
    })
    if (nextIndex) getStatus(nextIndex)
  } else {
    Shelly.call(
      'HTTP.GET',
      {
        url: 'http://' + rootConsumer.ip + '/meter/0'
      },
      function (result, err) {
        if (!result || !result.body) {
          //print('[REST METER] error 1 in rest call', rootConsumer.name)
          getRelay(rootConsumer, nextIndex)
          return 0
        }
        let parsed = JSON.parse(result.body)
        if (!parsed || parsed.power === undefined) {
          //print('[REST METER] error 2 in rest call', rootConsumer.name)
          //print(parsed)
          getRelay(rootConsumer, nextIndex)
          return 0
        }
        //print('[REST METER]', rootConsumer.name, parsed.power)
        rootConsumer.current_consumption = parsed.power
        //print(rootConsumer.name, rootConsumer.current_consumption)
        getRelay(rootConsumer, nextIndex)
        return 0
      }
    )
  }
}

function getRelay(consumer, nextIndex) {
  let rootConsumer = null
  for (let rconsumer of consumers) {
    if (rconsumer.name === consumer.name) {
      rootConsumer = rconsumer
      //print('SET rootConsumer', rootConsumer.name)
      break
    }
  }
  if (!rootConsumer) {
    print('Root consumer not found!')
    return
  }
  if (rootConsumer.ip === controller_ip) {
    //print('getting status self')
    Shelly.call('Switch.GetStatus', {
      id: 0
    })
  } else {
    Shelly.call(
      'HTTP.GET',
      {
        url: 'http://' + rootConsumer.ip + '/relay/0'
      },
      function (result, err) {
        if (!result || !result.body) {
          //print('[REST RELAY] error 1 in rest call', rootConsumer.name)
          if (nextIndex) getStatus(nextIndex)
          return 0
        }
        let parsed = JSON.parse(result.body)
        if (!parsed || parsed.ison === undefined) {
          //print('[REST RELAY] error 2 in rest call', rootConsumer.name)
          //print(parsed)
          if (nextIndex) getStatus(nextIndex)
          return 0
        }
        //print('[REST RELAY]', rootConsumer.name, parsed.ison)
        rootConsumer.status = parsed.ison ? 'on' : 'off'
        //print(rootConsumer.name, rootConsumer.status)
        if (nextIndex) getStatus(nextIndex)
        return 0
      }
    )
  }
}

function init(index) {
  //set all devices off
  //print('[init] device', index)
  let consumer = consumers[index]
  if (!consumer) {
    print('[init] DONE by index', index)
    Timer.set(/* number of miliseconds */ 5000, /* repeat? */ true, /* callback */ get_production)
    return 0
  }
  //print('[init] consumer', consumer.name)
  if (consumer.mode !== 'on') {
    turnOffConsumer(consumer, index + 1)
  } else {
    turnOnConsumer(consumer, index + 1)
  }
  return 0
}

function turnOnConsumer(consumer, nextIndex) {
  //update the status
  //print('Turning on', consumer.name)
  let rootConsumer = null
  for (let rconsumer of consumers) {
    if (rconsumer.name === consumer.name) {
      rootConsumer = rconsumer
      //print('SET rootConsumer', rootConsumer.name)
      break
    }
  }
  if (!rootConsumer) {
    print('Root consumer not found!')
    return
  }
  //print('turning on', rootConsumer.name)
  if (rootConsumer.ip === controller_ip) {
    //print('turning on self')
    Shelly.call(
      'Switch.Set',
      {
        id: 0,
        on: true
      },
      function (result) {
        if (nextIndex) init(nextIndex)
      }
    )
  } else {
    Shelly.call(
      'HTTP.GET',
      {
        url: 'http://' + rootConsumer.ip + '/relay/0?turn=on'
      },
      function (result, err) {
        if (!result || !result.body) {
          //print('error in rest call', err)
          if (nextIndex) init(nextIndex)
          return 0
        }
        rootConsumer.status = 'on'
        //print(rootConsumer.name, 'is on')
        if (nextIndex) init(nextIndex)
        return 0
      }
    )
  }
}

function turnOffConsumer(consumer, nextIndex) {
  //print('Turning off', consumer.name)
  let rootConsumer = null
  for (let rconsumer of consumers) {
    if (rconsumer.name === consumer.name) {
      rootConsumer = rconsumer
      //print('SET rootConsumer', rootConsumer.name)
      break
    }
  }
  if (!rootConsumer) {
    print('Root consumer not found!')
    return 0
  }
  if (rootConsumer.ip === controller_ip) {
    //print('turning off self')
    Shelly.call(
      'Switch.Set',
      {
        id: 0,
        on: false
      },
      function (result) {
        if (nextIndex) init(nextIndex)
      }
    )
  } else {
    Shelly.call(
      'HTTP.GET',
      {
        url: 'http://' + rootConsumer.ip + '/relay/0?turn=off'
      },
      function (result) {
        if (!result || !result.body) {
          print('error in rest call')
          if (nextIndex) init(nextIndex)
          return 0
        }
        rootConsumer.status = 'off'
        //print(rootConsumer.name, 'is off')
        if (nextIndex) init(nextIndex)
        return 0
      }
    )
  }
}

function filter_consumers(c) {
  return c.mode === 'auto'
}

function filter_a(c) {
  return c.phase === 'A'
}

function filter_b(c) {
  return c.phase === 'B'
}

function filter_c(c) {
  return c.phase === 'C'
}

function handle_measurement(phase) {
  //print('handle_measurement', phase)
  let filteredConsumers = consumers
  if (phase === 'A') filteredConsumers = filteredConsumers.filter(filter_a)
  if (phase === 'B') filteredConsumers = filteredConsumers.filter(filter_b)
  if (phase === 'C') filteredConsumers = filteredConsumers.filter(filter_c)
  filteredConsumers = filteredConsumers.filter(filter_consumers)

  // Calculate the available production based on the overall consumption and production.
  let availableProduction = 0
  if (phase === 'A') availableProduction = a_production - a_consumption
  if (phase === 'B') availableProduction = b_production - b_consumption
  if (phase === 'C') availableProduction = c_production - c_consumption
  //print(phase, 'available production:', availableProduction)

  //we have excess power
  if (availableProduction > 0) {
    //iterate through all consumers
    for (let i = 0; i < filteredConsumers.length; i++) {
      let consumer = filteredConsumers[i]

      if (consumer.status === 'on') continue

      //turn on the consumer only if there is enough production
      if (consumer.max_consumption * 0.8 < availableProduction) {
        print(
          'phase',
          phase,
          availableProduction,
          'available',
          consumer.max_consumption * 0.8,
          'needed, turning on',
          consumer.name
        )
        turnOnConsumer(consumer)
        break
      } else {
        //print(consumer.max_consumption * 0.8, 'needed, skipping')
      }
      //turn on one more consumer regardless of the available production
      /*if (mode === 'CONSUME_MORE') {
        turnOnConsumer(consumer)
        break
      }*/
    }
  }

  //we have less power than we consume
  if (availableProduction < 0) {
    //iterate through all consumers backwards, turning them off if necessary
    for (let i = filteredConsumers.length - 1; i >= 0; i--) {
      let consumer = filteredConsumers[i]

      if (consumer.status === 'off') continue

      //turn off the consumer only if there is enough production
      if (consumer.max_consumption * 0.5 < Math.abs(availableProduction)) {
        print(
          'phase',
          phase,
          availableProduction,
          'available',
          consumer.max_consumption * 0.5,
          'needed, turning off',
          consumer.name
        )
        turnOffConsumer(consumer)
        break
      }
      //turn off one more consumer regardless of the available production
      /*if (mode === 'CONSUME_LESS') {
        turnOffConsumer(consumer)
        break
      }*/
    }
  }
}

function handler(request, response, userdata) {
  response.body = JSON.stringify({
    a_consumption: a_consumption,
    b_consumption: b_consumption,
    c_consumption: c_consumption,
    a_production: a_production,
    b_production: b_production,
    c_production: c_production,
    mode: mode,
    consumers: consumers
  })
  response.headers = [
    ['Content-Type', 'application/json'],
    ['Access-Control-Allow-Origin', '*']
  ]
  //print('http request handled')
  response.send()
}

HTTPServer.registerEndpoint('getCData', handler)

function setConsumer(request, response, userdata) {
  // print('setConsumer', request.body)
  if (request.body) {
    let consumer = JSON.parse(request.body)
    let rootConsumer = null
    for (let rconsumer of consumers) {
      if (rconsumer.ip === consumer.ip) {
        rootConsumer = rconsumer
        print('SET rootConsumer', rootConsumer.name)
        break
      }
    }
    if (!rootConsumer) {
      consumers.push(consumer)
    }
    rootConsumer.name = consumer.name
    rootConsumer.status = consumer.status
    rootConsumer.max_consumption = consumer.max_consumption
    rootConsumer.phase = consumer.phase
    rootConsumer.mode = consumer.mode

    if (rootConsumer.mode !== 'on') {
      turnOffConsumer(rootConsumer)
    } else {
      turnOnConsumer(rootConsumer)
    }
  }
  response.body = JSON.stringify({
    status: 'ok'
  })
  response.headers = [
    ['Content-Type', 'application/json'],
    ['Access-Control-Allow-Origin', '*'],
    ['Access-Control-Allow-Methods', 'GET,POST,OPTIONS'],
    ['Access-Control-Allow-Headers', 'Content-Type']
  ]
  //print('http request handled')
  response.send()
}

HTTPServer.registerEndpoint('setConsumer', setConsumer)

init(0)
