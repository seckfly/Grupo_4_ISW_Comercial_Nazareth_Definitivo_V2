import { useEffect, useState } from 'react'
import { formatStoreDateTime } from '../utils/format'

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

  return formatStoreDateTime(now)
}
