import { useEffect } from 'react'

export function usePriceRefresh(refresh, enabled) {
  useEffect(() => {
    if (!enabled) return
    let updating = false
    async function update() {
      if (updating || document.visibilityState !== 'visible') return
      updating = true
      try { await refresh() } finally { updating = false }
    }
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    const timer = window.setInterval(update, 30000)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [refresh, enabled])
}
