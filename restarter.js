/* eslint-disable */
function check() {
  Shelly.call(
    'Script.GetStatus',
    {
      id: 1
    },
    function (result) {
      if (!result || !result.running) {
        print('restarting')
        Shelly.call(
          'Script.Start',
          {
            id: 1
          },
          function (result) {
            if (!result || !result.running) {
              print('restarted')
              return 0
            }
          }
        )
        return 0
      }
    }
  )
}

function init() {
  Timer.set(/* number of miliseconds */ 15000, /* repeat? */ true, /* callback */ check)
  return 0
}

init(0)
