// Current time in ms, updated every second while any component uses it.
const now = ref(Date.now())
let users = 0
let timer: ReturnType<typeof setInterval> | undefined

export function useNow() {
  onMounted(() => {
    if (users++ === 0) timer = setInterval(() => (now.value = Date.now()), 1000)
  })
  onBeforeUnmount(() => {
    if (--users === 0) clearInterval(timer)
  })
  return readonly(now)
}
