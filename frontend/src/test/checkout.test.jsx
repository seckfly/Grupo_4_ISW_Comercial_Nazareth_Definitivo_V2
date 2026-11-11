// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import DecimalInput from '../components/ui/DecimalInput'
import SaleDrawer from '../components/ui/SaleDrawer'
import Sales from '../pages/Sales'
import { ProductDrawer, HistoryDrawer } from '../pages/Inventory/InventoryDrawers'
import Promotions from '../pages/Promotions'
import { api } from '../services/api'

vi.mock('../services/api', () => ({ api: {
  products: vi.fn(), quoteSale: vi.fn(), createSale: vi.fn(), saleCustomers: vi.fn(),
  sales: vi.fn(), productHistory: vi.fn(), updateProduct: vi.fn(), createProduct: vi.fn(),
} }))
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'admin' } }) }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, container
function render(element) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() => root.render(element))
  return container
}
function type(input, value) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function settled(condition) {
  await vi.waitFor(async () => { await act(async () => {}); condition() }, { timeout: 3000 })
}
afterEach(() => { act(() => root?.unmount()); container?.remove(); vi.clearAllMocks() })

describe('controles numéricos del checkout y de Inventario', () => {
  it('las flechas y botones cambian exactamente una unidad y conservan decimales negativos manuales', () => {
    function Example() {
      const [value, setValue] = useState('-1.25')
      return <form><DecimalInput label="Variación de existencias" value={value} onChange={setValue} signed/></form>
    }
    const element = render(<Example/>)
    const input = element.querySelector('input')
    act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })))
    expect(input.value).toBe('-0.25')
    act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })))
    expect(input.value).toBe('-1.25')
    act(() => element.querySelector('[aria-label^="Sumar"]').click())
    expect(input.value).toBe('-0.25')
    act(() => element.querySelector('[aria-label^="Restar"]').click())
    expect(input.value).toBe('-1.25')
    type(input, '-2.75')
    expect(input.value).toBe('-2.75')
    expect(element.querySelector('form').checkValidity()).toBe(true)
    type(input, '-.25')
    expect(element.querySelector('form').checkValidity()).toBe(true)
    act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })))
    expect(input.value).toBe('0.75')
    type(input, '-2.751')
    expect(element.querySelector('form').checkValidity()).toBe(false)
  })

  it('el carrito admite dos decimales y rechaza cantidades que exceden el stock', () => {
    function Example() {
      const [value, setValue] = useState('0.25')
      return <form><DecimalInput label="Cantidad" value={value} onChange={setValue} minUnits={1} maxUnits={150}/></form>
    }
    const element = render(<Example/>)
    const input = element.querySelector('input')
    expect(element.querySelector('form').checkValidity()).toBe(true)
    act(() => element.querySelector('[aria-label^="Sumar"]').click())
    expect(input.value).toBe('1.25')
    expect(element.querySelector('[aria-label^="Sumar"]').disabled).toBe(true)
    type(input, '1.51')
    expect(element.querySelector('form').checkValidity()).toBe(false)
    type(input, '3.00')
    act(() => element.querySelector('[aria-label^="Restar"]').click())
    expect(input.value).toBe('2.00')
    act(() => element.querySelector('[aria-label^="Restar"]').click())
    expect(input.value).toBe('1.00')
    expect(element.querySelector('form').checkValidity()).toBe(true)
    type(input, '0')
    expect(element.querySelector('form').checkValidity()).toBe(false)
  })

  it('los importes de producto admiten centavos y el historial muestra la unidad real', async () => {
    const product = { id: 1, name: 'Arroz QA', categoryId: 1, unit: 'Kg', cost: 4.05, price: 6.7, minimum: 0.25, stock: 10, isActive: true }
    const element = render(<ProductDrawer product={product} categories={[{ id: 1, name: 'Abarrotes' }]} close={() => {}} saved={() => {}}/>)
    const price = element.querySelectorAll('input[type="number"]')[1]
    type(price, '7.25')
    expect(price.checkValidity()).toBe(true)
    type(price, '7.251')
    expect(price.checkValidity()).toBe(false)
    api.productHistory.mockResolvedValue({ product, movements: [{ id: 1, type: 'adjustment', createdAt: '2026-11-10T18:00:00Z', change: -0.25, stockBefore: 10.25, stockAfter: 10, reason: 'Conteo' }] })
    act(() => root.render(<HistoryDrawer product={product} close={() => {}}/>))
    await settled(() => expect(element.textContent).toContain('-0.25 Kg'))
  })
})

const savedSale = {
  id: 357, createdAt: '2026-11-10T18:00:00Z', paymentMethod: 'efectivo', paymentReference: null,
  customerId: null, customerName: null, subtotal: 20.1, discount: 0, total: 20.1, cashReceived: 50, change: 29.9,
  items: [{ productId: 1, name: 'Arroz QA', unit: 'Kg', quantity: 3, unitPrice: 6.7, subtotal: 20.1 }],
}

it('Nueva venta muestra el cálculo del servidor, envía efectivo con centavos y usa el ID persistido', async () => {
  api.products.mockResolvedValue([{ id: 1, name: 'Arroz QA', category: 'Abarrotes', unit: 'Kg', sale_price: 6.7, current_stock: 10 }])
  api.quoteSale.mockResolvedValue({ ...savedSale, units: 3, quoteId: 'a'.repeat(64), items: [{ ...savedSale.items[0], stock: 10 }] })
  api.createSale.mockResolvedValue(savedSale)
  const created = vi.fn()
  const element = render(<SaleDrawer close={() => {}} onCreated={created}/>)
  await settled(() => expect(element.querySelector('.pos-products button')).not.toBeNull())
  act(() => element.querySelector('.pos-products button').click())
  type(element.querySelector('[role="spinbutton"]'), '3.00')
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 250)) })
  await settled(() => expect(element.querySelector('.grand-total').textContent).toContain('20.10'))
  const cash = element.querySelector('input[type="number"][required]')
  type(cash, '50.00')
  expect(cash.checkValidity()).toBe(true)
  expect(element.querySelector('.premium-cash').textContent).toContain('29.90')
  await act(async () => element.querySelector('.pos-confirm').click())
  await settled(() => expect(created).toHaveBeenCalledWith(savedSale))
  expect(api.createSale.mock.calls[0][0]).toMatchObject({ items: [{ productId: 1, quantity: '3.00' }], cashReceived: '50.00', customerId: null })
  expect(element.textContent).toContain('#357')
})

it('Ventas vuelve a consultar los registros al montar la pantalla de nuevo', async () => {
  api.sales.mockResolvedValue({ sales: [savedSale], summary: { total: 20.1, cashTotal: 20.1, digitalTotal: 0, saleCount: 1 } })
  const element = render(<Sales openSale={() => {}}/>)
  await settled(() => expect(element.querySelector('tbody')?.textContent).toContain('#357'))
  act(() => root.render(null))
  act(() => root.render(<Sales openSale={() => {}}/>))
  await settled(() => expect(api.sales).toHaveBeenCalledTimes(2))
  await settled(() => expect(element.querySelector('tbody')?.textContent).toContain('#357'))
})

it('Promociones distingue un monto fijo con centavos de un porcentaje máximo de 100', () => {
  localStorage.clear()
  const element = render(<Promotions/>)
  const create = [...element.querySelectorAll('button')].find((button) => button.textContent.includes('Nueva campaña'))
  act(() => create.click())
  const typeSelect = element.querySelector('[name="discountType"]')
  const amount = element.querySelector('[name="discountValue"]')
  act(() => { typeSelect.value = 'fixed'; typeSelect.dispatchEvent(new Event('change', { bubbles: true })) })
  type(amount, '150.25')
  expect(amount.checkValidity()).toBe(true)
  expect(amount.closest('label').textContent).toContain('S/')
  act(() => { typeSelect.value = 'percentage'; typeSelect.dispatchEvent(new Event('change', { bubbles: true })) })
  expect(amount.checkValidity()).toBe(false)
  type(amount, '0.25')
  expect(amount.checkValidity()).toBe(true)
  expect(amount.closest('label').textContent).toContain('%')
})
