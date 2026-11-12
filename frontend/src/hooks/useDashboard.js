import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useInventory } from '../context/InventoryContext'

const loadingState = { data: null, loading: true, error: '' }
export function useDashboard(period) {
  const { dataRevision, requestScope } = useInventory()
  const [state, setState] = useState(loadingState)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const identity = { requestScope, period, dataRevision, retry }
    setState({ ...identity, ...loadingState })
    requestScope.read(`dashboard:${JSON.stringify([period, dataRevision])}`, signal => api.dashboard(period, signal), controller.signal)
      .then(data => { if (!controller.signal.aborted) setState({ ...identity, data, loading: false, error: '' }) })
      .catch(error => { if (!controller.signal.aborted) setState({ ...identity, data: null, loading: false, error: error.message }) })
    return () => controller.abort()
  }, [period, requestScope, dataRevision, retry])
  const current = state.requestScope === requestScope && state.period === period && state.dataRevision === dataRevision && state.retry === retry
  return { ...(current ? state : loadingState), retry: () => setRetry(value => value + 1) }
}
