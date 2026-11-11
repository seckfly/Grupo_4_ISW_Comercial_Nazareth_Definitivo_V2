import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { api } from '../services/api'

const InventoryContext = createContext(null)
export function InventoryProvider({ children }) {
  const { user } = useAuth()
  const [data, setData] = useState({ products: [], categories: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    setData({ products: [], categories: [] })
    if (user?.role !== 'admin') { setLoading(false); return }
    const controller = new AbortController()
    setLoading(true)
    setError('')
    api.inventory(controller.signal).then(setData).catch((failure) => {
      if (!controller.signal.aborted) setError(failure.message)
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [user?.id, user?.role, revision])
  const alertCount = loading || error ? null : data.products.filter((product) => product.isActive && product.lowStock).length
  return <InventoryContext.Provider value={{ data, setData, loading, error, setRevision, alertCount }}>{children}</InventoryContext.Provider>
}
export const useInventory = () => useContext(InventoryContext)
