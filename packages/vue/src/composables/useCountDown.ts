import { computed, onBeforeMount, onMounted, ref, watch } from 'vue'
import { t as translate } from '@/i18n/t'

interface Duration {
  seconds: number
  minutes: number
}

export function getFormattedDuration({
  seconds,
  minutes,
  t,
  short = false,
}: Duration & {
  t: typeof translate
  short?: boolean
}): string {
  if (minutes > 0) {
    return t(short ? 'time.minutes_short' : 'time.minutes', {
      count: minutes,
    })
  }

  if (seconds <= 0)
    return 'few seconds'

  return t(short ? 'time.seconds_short' : 'time.seconds', {
    count: seconds,
  })
}

export function useCountDown({
  duration,
  immediate = false,
  short = false,
}: {
  duration: number
  immediate?: boolean
  short?: boolean
}) {
  const t = translate

  const distance = ref(0)
  const hours = ref(0)
  const minutes = ref(0)
  const seconds = ref(0)
  const timer = ref()
  const isRunning = ref(false)

  const durationMs = ref(duration)

  const endTime = ref(0)

  const countdown = () => {
    const now = Date.now()
    distance.value = endTime.value - now
    hours.value = Math.floor(distance.value / (1000 * 60 * 60))
    minutes.value = Math.floor(
      (distance.value % (1000 * 60 * 60)) / (1000 * 60),
    )
    seconds.value = Math.floor((distance.value % (1000 * 60)) / 1000)
  }

  const startCountDown = () => {
    isRunning.value = true
    endTime.value = Date.now() + durationMs.value
    countdown()
    timer.value = setInterval(countdown, 1000)
  }

  onMounted(() => {
    if (immediate) {
      startCountDown()
    }
  })

  const stop = () => clearInterval(timer.value)

  onBeforeMount(stop)

  const displayDuration = computed(() => {
    if (!isRunning.value && durationMs.value) {
      const totalSeconds = Math.floor(durationMs.value / 1000)
      return getFormattedDuration({
        minutes: Math.floor(totalSeconds / 60),
        seconds: totalSeconds % 60,
        short,
        t,
      })
    }
    return getFormattedDuration({
      seconds: seconds.value,
      minutes: minutes.value,
      t,
      short,
    })
  })

  watch(distance, () => {
    if (distance.value <= 0) {
      stop()
    }
  })

  return {
    hours,
    minutes,
    seconds,
    displayDuration,
    distance,
    startCountDown,
    isRunning,
  }
}
