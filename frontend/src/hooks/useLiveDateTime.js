import { useEffect, useState } from 'react'
import { formatStoreDateTime } from '../utils/format'

const dayMonth = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'long' })
const millisecondsPerDay = 24 * 60 * 60 * 1000

export function useLiveDateTime(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const update = () => setNow(new Date())
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    const timer = window.setInterval(update, intervalMs)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [intervalMs])

  return {
    ...formatStoreDateTime(now),
    today: dayMonth.format(now),
    yesterday: dayMonth.format(now.getTime() - millisecondsPerDay),
  }
}
