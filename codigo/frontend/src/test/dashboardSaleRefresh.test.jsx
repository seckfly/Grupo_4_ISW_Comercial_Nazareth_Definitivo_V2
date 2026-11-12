// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import App from '../App'
import { api } from '../services/api'

vi.mock('../context/AuthContext', () => {
  const user = { id: 1, role: 'admin' }
  return { AuthProvider: ({ children }) => children, useAuth: () => ({ user }) }
})
vi.mock('../services/api', () => ({ api: { inventory: vi.fn(), dashboard: vi.fn(), createSale: vi.fn() } }))
vi.mock('../components/layout/AppShell', () => ({ default: ({ children, onSale, setPage }) => <>
  <button onClick={onSale}>Open sale</button><button onClick={() => setPage('Resumen')}>Overview</button>{children}
</> }))
vi.mock('../pages/Overview', async () => {
  const { useDashboard } = await import('../hooks/useDashboard')
  return { default: () => { const { data } = useDashboard('week'); return <output>{data?.total}</output> } }
})
// Like the real sales list, this destination does not consume useDashboard.
vi.mock('../pages/Sales', () => ({ default: () => <p>Sales fixture</p> }))
vi.mock('../components/ui/SaleDrawer', () => ({ default: ({ onCreated }) =>
  <button onClick={async () => { await api.createSale(); onCreated() }}>Confirm fixture sale</button>,
}))
globalThis.IS_REACT_ACT_ENVIRONMENT = true

it('the unchanged App sale-confirmation callback refreshes inventory and the active dashboard once', async () => {
  const container = document.createElement('div'); document.body.append(container)
  const root = createRoot(container)
  const button = text => [...container.querySelectorAll('button')].find(control => control.textContent === text)
  async function settled(assertion) {
    await vi.waitFor(async () => {
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
      assertion()
    })
  }
  try {
    api.inventory.mockResolvedValue({ products: [{ id: 1, stock: 8 }], categories: [] })
    api.dashboard.mockResolvedValue({ total: 0 })
    await act(async () => {
      await Promise.all([import('../pages/Overview'), import('../pages/Sales'), import('../components/ui/SaleDrawer')])
      root.render(<App/>)
    })
    await settled(() => expect(container.querySelector('output')?.textContent).toBe('0'))
    expect(api.inventory).toHaveBeenCalledTimes(1); expect(api.dashboard).toHaveBeenCalledTimes(1)
    await act(async () => button('Open sale').click())
    await settled(() => expect(button('Confirm fixture sale')).toBeDefined())
    expect(api.dashboard).toHaveBeenCalledTimes(1)
    let confirm
    api.createSale.mockReturnValue(new Promise(resolve => { confirm = resolve }))
    await act(async () => button('Confirm fixture sale').click())
    expect(api.dashboard).toHaveBeenCalledTimes(1)
    api.inventory.mockResolvedValue({ products: [{ id: 1, stock: 7 }], categories: [] })
    api.dashboard.mockResolvedValue({ total: 10 })
    await act(async () => confirm({ id: 22 }))
    await settled(() => expect(container.textContent).toContain('Sales fixture'))
    expect(api.inventory).toHaveBeenCalledTimes(2); expect(api.dashboard).toHaveBeenCalledTimes(2)
    await act(async () => button('Overview').click())
    await settled(() => expect(container.querySelector('output')?.textContent).toBe('10'))
    expect(api.dashboard).toHaveBeenCalledTimes(3)
  } finally { await act(async () => root.unmount()); container.remove() }
})
