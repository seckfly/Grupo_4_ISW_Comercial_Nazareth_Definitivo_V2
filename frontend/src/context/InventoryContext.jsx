import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { useAuth } from './AuthContext'
import { api } from '../services/api'
import { createInflightReads } from '../services/inflightReads'

const InventoryContext = createContext(null)
const emptyData = { products: [], categories: [] }
const initial = scope => ({ scope, data: emptyData, loading: true, error: '', revision: 0, dataRevision: 0 })
const apply = (update, value) => typeof update === 'function' ? update(value) : update

function reduce(previous, action) {
  if (previous.scope !== action.scope && (action.type === 'success' || action.type === 'failure')) return previous
  const state = previous.scope === action.scope ? previous : initial(action.scope)
  if (action.type === 'refresh') {
    const revision = apply(action.update, state.revision)
    return revision === state.revision ? state : { ...state, revision, dataRevision: state.dataRevision + 1 }
  }
  if (action.type === 'confirmed') {
    const data = apply(action.update, state.data)
    return data === state.data ? state : { ...state, data, loading: false, error: '', dataRevision: state.dataRevision + 1 }
  }
  // A read started before a confirmed operation must not replace its newer data.
  if (action.revision !== state.revision || action.dataRevision !== state.dataRevision) return state
  if (action.type === 'start') return { ...state, loading: action.enabled, error: '' }
  if (action.type === 'success') return { ...state, data: action.data, loading: false, error: '' }
  if (action.type === 'failure') return { ...state, loading: false, error: action.error }
  return state
}

export function InventoryProvider({ children }) {
  const { user } = useAuth()
  // A newly verified identity gets a fresh scope, even for a second login by the same user.
  const requestScope = useMemo(() => createInflightReads(), [user, user?.id, user?.role])
  const currentScope = useRef(requestScope)
  currentScope.current = requestScope
  const [stored, dispatch] = useReducer(reduce, requestScope, initial)
  const state = stored.scope === requestScope ? stored : initial(requestScope)
  const { data, loading, error, revision, dataRevision } = state
  const setRevision = useCallback(update => {
    if (currentScope.current === requestScope) dispatch({ type: 'refresh', scope: requestScope, update })
  }, [requestScope])
  const setData = useCallback(update => {
    if (currentScope.current === requestScope) dispatch({ type: 'confirmed', scope: requestScope, update })
  }, [requestScope])
  useEffect(() => requestScope.retain(), [requestScope])
  useEffect(() => {
    const controller = new AbortController()
    const enabled = user?.role === 'admin'
    const action = { scope: requestScope, revision, dataRevision }
    dispatch({ ...action, type: 'start', enabled })
    if (!enabled) return
    requestScope.read(`inventory:${revision}`, signal => api.inventory(signal), controller.signal).then(result => {
      if (!controller.signal.aborted) dispatch({ ...action, type: 'success', data: result })
    }).catch(failure => {
      if (!controller.signal.aborted) dispatch({ ...action, type: 'failure', error: failure.message })
    })
    return () => controller.abort()
    // Complete local product updates need no extra inventory read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestScope, user?.role, revision])
  const alertCount = loading || error ? null : data.products.filter(product => product.isActive && product.lowStock).length
  return <InventoryContext.Provider value={{ data, setData, loading, error, setRevision, alertCount, dataRevision, requestScope }}>{children}</InventoryContext.Provider>
}
export const useInventory = () => useContext(InventoryContext)
