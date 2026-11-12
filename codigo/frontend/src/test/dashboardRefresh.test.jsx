// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { InventoryProvider, useInventory } from '../context/InventoryContext'
import { useDashboard } from '../hooks/useDashboard'
import { createInflightReads } from '../services/inflightReads'
import { api } from '../services/api'
import Purchases from '../pages/Purchases'
import Reservations from '../pages/Reservations'
import Inventory from '../pages/Inventory'

const auth = vi.hoisted(() => ({ user: null }))
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../services/api', () => ({ api: {
  inventory: vi.fn(), dashboard: vi.fn(), orders: vi.fn(), products: vi.fn(), receiveOrder: vi.fn(),
  reservations: vi.fn(), changeReservation: vi.fn(),
  adjustInventory: vi.fn(),
} }))
vi.mock('../hooks/usePhoneLayout', () => ({ usePhoneLayout: () => false }))
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const stock = value => ({ products: [{ id: 1, name: 'Product QA', unit: 'Unidad', price: 5, cost: 3,
  minimum: 2, stock: value, available: value, held: 0, isActive: true, lowStock: value <= 2 }], categories: [] })
let root, container, inventory, views
function Probe({ name, period = 'week' }) {
  views[name] = useDashboard(period)
  return <span>{name}</span>
}
function InventoryProbe() { inventory = useInventory(); return null }
function Overview(props) { return <Probe name="overview" {...props}/> }
function Reports(props) { return <Probe name="reports" {...props}/> }
async function render(children, strict = false) {
  if (!root) { container = document.createElement('div'); document.body.append(container); root = createRoot(container) }
  const content = <InventoryProvider><InventoryProbe/>{children}</InventoryProvider>
  await act(async () => root.render(strict ? <StrictMode>{content}</StrictMode> : content))
}
async function settle(work = () => {}) { await act(async () => { work(); await Promise.resolve() }) }
beforeEach(() => {
  auth.user = { id: 1, role: 'admin' }; views = {}
  api.inventory.mockReset().mockResolvedValue(stock(8))
  api.dashboard.mockReset().mockResolvedValue({ total: 0 })
})
afterEach(async () => { await act(async () => root?.unmount()); root = null; container?.remove() })

describe('pending read coordination', () => {
  it('shares equivalent reads, isolates periods and users, and removes completed results', async () => {
    const a = createInflightReads(), b = createInflightReads(), wait = deferred()
    const load = vi.fn(() => wait.promise)
    const first = a.read('week', load), second = a.read('week', load)
    const month = a.read('month', load), otherUser = b.read('week', load)
    await Promise.resolve()
    expect(load).toHaveBeenCalledTimes(3)
    wait.resolve(42)
    expect(await Promise.all([first, second, month, otherUser])).toEqual([42, 42, 42, 42])
    expect(await a.read('week', load)).toBe(42)
    expect(load).toHaveBeenCalledTimes(4)
  })
  it('one cancellation does not cancel a shared request; the final cancellation does', async () => {
    const scope = createInflightReads(), wait = deferred(), a = new AbortController(), b = new AbortController()
    let signal
    const load = vi.fn(value => { signal = value; return wait.promise })
    const first = scope.read('week', load, a.signal).catch(error => error.name)
    const second = scope.read('week', load, b.signal).catch(error => error.name)
    await Promise.resolve(); a.abort(); await Promise.resolve()
    expect(await first).toBe('AbortError'); expect(signal.aborted).toBe(false)
    b.abort(); await Promise.resolve()
    expect(await second).toBe('AbortError'); expect(signal.aborted).toBe(true)
    expect(await scope.read('week', () => 99)).toBe(99)
    wait.resolve('old')
  })
  it('cleans failed requests and ignores late completion after cancellation', async () => {
    const scope = createInflightReads(), old = deferred(), fresh = deferred(), controller = new AbortController()
    const abandoned = scope.read('week', () => old.promise, controller.signal).catch(error => error.name)
    await Promise.resolve(); controller.abort(); await Promise.resolve()
    expect(await abandoned).toBe('AbortError')
    const current = scope.read('week', () => fresh.promise)
    old.resolve('old'); await Promise.resolve(); await Promise.resolve()
    const load = vi.fn()
    const shared = scope.read('week', load)
    fresh.resolve('new'); expect(await current).toBe('new'); expect(await shared).toBe('new')
    expect(load).not.toHaveBeenCalled()
    await expect(scope.read('week', () => Promise.reject(new Error('network')))).rejects.toThrow('network')
    expect(await scope.read('week', () => 'retry')).toBe('retry')
  })
})

describe('dashboard and inventory lifecycle', () => {
  it('loads dashboard once, independent of initial inventory completion, also under StrictMode', async () => {
    const pending = deferred(); api.inventory.mockReturnValue(pending.promise)
    await render(<Overview/>, true)
    expect(api.dashboard).toHaveBeenCalledTimes(1); expect(api.inventory).toHaveBeenCalledTimes(1)
    await settle(() => pending.resolve(stock(5)))
    expect(inventory.data.products[0].stock).toBe(5)
    expect(api.dashboard).toHaveBeenCalledTimes(1)
  })
  it('retains stock during refresh and error; response does not trigger another dashboard read', async () => {
    await render(<Overview/>)
    const pending = deferred(); api.inventory.mockReturnValue(pending.promise)
    await settle(() => inventory.setRevision(value => value + 1))
    expect(inventory.loading).toBe(true); expect(inventory.data.products[0].stock).toBe(8)
    expect(api.dashboard).toHaveBeenCalledTimes(2)
    await settle(() => pending.reject(new Error('offline')))
    expect(inventory.data.products[0].stock).toBe(8); expect(inventory.error).toBe('offline')
    expect(api.dashboard).toHaveBeenCalledTimes(2)
  })
  it.each(['sale', 'purchase receipt', 'reservation confirmation', 'reservation cancellation'])(
    'refreshes inventory and dashboard after confirmed %s using existing invalidation API', async () => {
      await render(<Overview/>)
      api.inventory.mockResolvedValue(stock(2)); api.dashboard.mockResolvedValue({ total: 20 })
      await settle(() => inventory.setRevision(value => value + 1))
      expect(api.inventory).toHaveBeenCalledTimes(2); expect(api.dashboard).toHaveBeenCalledTimes(2)
      expect(inventory.alertCount).toBe(1); expect(views.overview.data.total).toBe(20)
    })
  it('publishes a confirmed adjustment without refetching inventory or accepting an older inventory response', async () => {
    await render(<Overview/>)
    const pending = deferred(); api.inventory.mockReturnValue(pending.promise)
    await settle(() => inventory.setRevision(value => value + 1))
    await settle(() => inventory.setData(stock(1)))
    expect(inventory.alertCount).toBe(1)
    expect(api.dashboard).toHaveBeenCalledTimes(3); expect(api.inventory).toHaveBeenCalledTimes(2)
    await settle(() => pending.resolve(stock(8)))
    expect(inventory.data.products[0].stock).toBe(1); expect(inventory.loading).toBe(false)
    expect(api.dashboard).toHaveBeenCalledTimes(3)
  })
  it('Overview/Reports handoff reuses a pending read; completed data is requested fresh on reentry', async () => {
    const pending = deferred(); api.dashboard.mockReturnValue(pending.promise)
    await render(<Overview/>)
    await render(<Reports/>)
    await render(<Overview/>)
    expect(api.dashboard).toHaveBeenCalledTimes(1); expect(api.inventory).toHaveBeenCalledTimes(1)
    await settle(() => pending.resolve({ total: 5 }))
    expect(views.overview.data.total).toBe(5)
    api.dashboard.mockResolvedValue({ total: 6 })
    await render(<Reports/>)
    expect(api.dashboard).toHaveBeenCalledTimes(2); expect(views.reports.data.total).toBe(6)
    expect(api.inventory).toHaveBeenCalledTimes(1)
  })
  it('separates simultaneous periods and shares equal consumers', async () => {
    const pending = deferred(); api.dashboard.mockReturnValue(pending.promise)
    await render(<><Probe name="a"/><Probe name="b"/><Probe name="c" period="month"/></>)
    expect(api.dashboard).toHaveBeenCalledTimes(2)
    await settle(() => pending.resolve({ total: 1 }))
    expect(views.a.data).toEqual(views.b.data)
  })
  it('does not show an old period after newer results, even if the transport ignores abort', async () => {
    const old = deferred(), fresh = deferred()
    api.dashboard.mockImplementation(period => period === 'week' ? old.promise : fresh.promise)
    await render(<Overview/>)
    await render(<Overview period="month"/>)
    expect(views.overview.data).toBeNull()
    await settle(() => fresh.resolve({ total: 2 }))
    await settle(() => old.resolve({ total: 1 }))
    expect(views.overview.data.total).toBe(2)
  })
  it('a newer operation wins against an older dashboard response', async () => {
    const old = deferred(); api.dashboard.mockReturnValueOnce(old.promise)
    await render(<Overview/>)
    api.dashboard.mockResolvedValue({ total: 10 })
    await settle(() => inventory.setRevision(value => value + 1))
    await settle(() => old.resolve({ total: 0 }))
    expect(views.overview.data.total).toBe(10)
  })
  it('isolates users and a second session of the same user, clearing previous inventory', async () => {
    const old = deferred(), nextInventory = deferred()
    api.dashboard.mockReturnValueOnce(old.promise)
    await render(<Overview/>)
    auth.user = { id: 2, role: 'admin' }; api.inventory.mockReturnValue(nextInventory.promise)
    await render(<Overview/>)
    expect(inventory.data.products).toEqual([])
    expect(api.dashboard).toHaveBeenCalledTimes(2)
    await settle(() => old.resolve({ total: 100 }))
    expect(views.overview.data.total).toBe(0)
    auth.user = null; await render(null)
    auth.user = { id: 2, role: 'admin' }; await render(<Overview/>)
    expect(api.dashboard).toHaveBeenCalledTimes(3)
    await settle(() => nextInventory.resolve(stock(3)))
    expect(inventory.data.products[0].stock).toBe(3)
  })
  it('retries a failed dashboard without refreshing inventory', async () => {
    api.dashboard.mockRejectedValueOnce(new Error('offline'))
    await render(<Overview/>)
    expect(views.overview.error).toBe('offline')
    await settle(() => views.overview.retry())
    expect(views.overview.data.total).toBe(0)
    expect(api.dashboard).toHaveBeenCalledTimes(2); expect(api.inventory).toHaveBeenCalledTimes(1)
  })
  it('ignores invalidations and local updates retained by a previous session', async () => {
    await render(<Overview/>)
    const old = inventory
    auth.user = { id: 2, role: 'admin' }; await render(<Overview/>)
    await settle(() => { old.setRevision(value => value + 1); old.setData(stock(99)) })
    expect(api.inventory).toHaveBeenCalledTimes(2); expect(api.dashboard).toHaveBeenCalledTimes(2)
    expect(inventory.data.products[0].stock).toBe(8)
  })
  it('counts requests through initial loading, invalidation and three pending navigation handoffs', async () => {
    const wait = deferred(); api.inventory.mockReturnValue(wait.promise)
    await render(<Overview/>)
    expect([api.dashboard.mock.calls.length, api.inventory.mock.calls.length]).toEqual([1, 1])
    await settle(() => wait.resolve(stock(8)))
    expect([api.dashboard.mock.calls.length, api.inventory.mock.calls.length]).toEqual([1, 1])
    await settle(() => inventory.setRevision(value => value + 1))
    expect([api.dashboard.mock.calls.length, api.inventory.mock.calls.length]).toEqual([2, 2])
    await settle(() => inventory.setData(stock(1)))
    expect([api.dashboard.mock.calls.length, api.inventory.mock.calls.length]).toEqual([3, 2])
    await render(<Reports/>)
    expect([api.dashboard.mock.calls.length, api.inventory.mock.calls.length]).toEqual([4, 2])
    const pending = deferred(); api.dashboard.mockReturnValue(pending.promise)
    await render(<Overview/>); await render(<Reports/>); await render(<Overview/>)
    expect([api.dashboard.mock.calls.length, api.inventory.mock.calls.length]).toEqual([5, 2])
    await settle(() => pending.resolve({ total: 1 }))
  })
  it('a real purchase receipt callback refreshes inventory and the active dashboard', async () => {
    api.orders.mockResolvedValue([{ id: 9, status: 'pending', supplier_name: 'Supplier QA', estimated_total: 20,
      items: [{ id: 3, name: 'Product QA', unit: 'Unidad', quantity: 4, received_quantity: 1, unit_cost: 5 }] }])
    api.products.mockResolvedValue([]); api.receiveOrder.mockResolvedValue({})
    await render(<><Overview/><Purchases/></>)
    const button = label => [...container.querySelectorAll('button')].find(control => control.textContent === label)
    await settle(() => button('Registrar recepci\u00f3n').click())
    const form = container.querySelector('[role="dialog"] form')
    function type(input, value) {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    await settle(() => { type(form.elements.reference, 'QA-003'); type(form.elements['item-3'], '2') })
    api.inventory.mockResolvedValue(stock(10)); api.dashboard.mockResolvedValue({ total: 30 })
    await settle(() => button('Confirmar recepci\u00f3n').click())
    expect(api.receiveOrder).toHaveBeenCalledWith(9, { reference: 'QA-003', items: [{ itemId: 3, quantity: '2' }] })
    expect(api.inventory).toHaveBeenCalledTimes(2); expect(api.dashboard).toHaveBeenCalledTimes(2)
    expect(inventory.data.products[0].stock).toBe(10); expect(views.overview.data.total).toBe(30)
  })
  it.each([
    ['pending', 'Confirmar apartado', 'confirm'], ['confirmed', 'Cancelar', 'cancel'],
  ])('a real reservation %s callback invalidates stock and dashboard', async (status, label, action) => {
    api.reservations.mockResolvedValue([{ id: 7, status, pickup_code: 'NZ-QA',
      pickup_deadline: '2026-11-12T18:00:00Z', estimated_total: 10, customerName: 'QA',
      items: [{ productId: 1, name: 'Product QA', unit: 'Unidad', quantity: 2 }] }])
    api.changeReservation.mockResolvedValue({})
    await render(<><Overview/><Reservations/></>)
    api.inventory.mockResolvedValue(stock(2)); api.dashboard.mockResolvedValue({ total: 30 })
    await settle(() => [...container.querySelectorAll('button')].find(button => button.textContent === label).click())
    expect(api.changeReservation).toHaveBeenLastCalledWith(7, { action })
    expect(api.inventory).toHaveBeenCalledTimes(2); expect(api.dashboard).toHaveBeenCalledTimes(2)
    expect(inventory.alertCount).toBe(1); expect(views.overview.data.total).toBe(30)
  })
  it('the real inventory adjustment callback publishes stock and refreshes the dashboard once', async () => {
    await render(<><Overview/><Inventory/></>)
    const before = [api.dashboard.mock.calls.length, api.inventory.mock.calls.length]
    await settle(() => container.querySelector('[aria-label="Ajustar stock de Product QA"]').click())
    const form = container.querySelector('[role="dialog"] form')
    await settle(() => {
      const change = form.elements.change
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(change, '-6')
      change.dispatchEvent(new Event('input', { bubbles: true }))
      const reason = form.querySelector('input[placeholder^="Ej."]')
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(reason, 'QA adjustment')
      reason.dispatchEvent(new Event('input', { bubbles: true }))
    })
    api.adjustInventory.mockResolvedValue({ product: stock(2).products[0] })
    api.dashboard.mockResolvedValue({ total: 12 })
    await settle(() => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(api.adjustInventory).toHaveBeenCalledTimes(1)
    expect(api.dashboard).toHaveBeenCalledTimes(before[0] + 1)
    expect(api.inventory).toHaveBeenCalledTimes(before[1])
    expect(inventory.alertCount).toBe(1); expect(views.overview.data.total).toBe(12)
  })
})
