import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useInventory } from '../context/InventoryContext'
export function useDashboard(period) {
  const { data: inventory, setRevision } = useInventory()
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const [retry, setRetry] = useState(0)
  useEffect(() => { setRevision(value => value + 1) }, [setRevision])
  useEffect(() => {
    const controller = new AbortController()
    setState({ data: null, loading: true, error: '' })
    api.dashboard(period, controller.signal).then(data => setState({ data, loading: false, error: '' })).catch(error => {
      if (!controller.signal.aborted) setState({ data: null, loading: false, error: error.message })
    })
    return () => controller.abort()
  }, [period, inventory, retry])
  return { ...state, retry: () => setRetry(value => value + 1) }
}
