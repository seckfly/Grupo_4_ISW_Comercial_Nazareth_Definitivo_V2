// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import DecimalInput from '../components/ui/DecimalInput'
import SaleDrawer from '../components/ui/SaleDrawer'
import Sales from '../pages/Sales'
import AppShell from '../components/layout/AppShell'
import { ProductDrawer, HistoryDrawer, AdjustmentDrawer } from '../pages/Inventory/InventoryDrawers'
import Promotions from '../pages/Promotions'
import Customers from '../pages/Customers'
import Overview from '../pages/Overview'
import Products from '../pages/Products'
import Inventory from '../pages/Inventory'
import Purchases from '../pages/Purchases'
import Settings from '../pages/Settings'
import Reservations from '../pages/Reservations'
import { api } from '../services/api'

vi.mock('../services/api', () => ({ api: {
  products: vi.fn(), quoteSale: vi.fn(), createSale: vi.fn(), saleCustomers: vi.fn(),
  sales: vi.fn(), productHistory: vi.fn(), updateProduct: vi.fn(), createProduct: vi.fn(),
  adjustInventory: vi.fn(),
  promotions: vi.fn(), createPromotion: vi.fn(), customers: vi.fn(),
  dashboard: vi.fn(), users: vi.fn(), createUser: vi.fn(),
  orders: vi.fn(), receiveOrder: vi.fn(), registerDirectPurchase: vi.fn(),
  preferences:vi.fn(),savePreferences:vi.fn(),requestReservation:vi.fn(),reservations:vi.fn(),changeReservation:vi.fn(),uploadPhoto:vi.fn(),
} }))
const authState=vi.hoisted(()=>({user:{role:'admin',name:'Prueba'}}))
vi.mock('../context/AuthContext', () => ({ useAuth: () => authState }))
const inventoryState = vi.hoisted(() => ({ alertCount: 0, data: { products: [] }, loading: false, error: '', setRevision: vi.fn() }))
vi.mock('../context/InventoryContext', () => ({ useInventory: () => inventoryState }))
vi.mock('../components/charts/SalesTrend', () => ({ default: () => <div>Gráfico de ventas</div> }))
vi.mock('../components/charts/ProductBars', () => ({ default: () => <div>Gráfico de productos</div> }))

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
afterEach(() => { act(() => root?.unmount()); container?.remove(); vi.clearAllMocks();authState.user.role='admin' })

describe('controles numéricos del checkout y de Inventario', () => {
  it('bloquea un ajuste con saldo negativo y permite corregirlo sin guardar', () => {
    const element = render(<AdjustmentDrawer product={{ id: 1, name: 'Prueba', stock: 7 }} close={() => {}} saved={() => {}}/>)
    const variation = element.querySelector('[name="change"]')
    type(variation, '-8')
    expect(element.querySelector('[aria-invalid="true"]').value).toBe('-1')
    expect(element.querySelector('[role="alert"]').textContent).toContain('no puede ser negativo')
    expect(element.querySelector('button.primary').disabled).toBe(true)
    act(() => element.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(api.adjustInventory).not.toHaveBeenCalled()
    act(() => element.querySelector('[aria-label^="Sumar"]').click())
    expect(Number(variation.value)).toBe(-7)
    expect(element.querySelector('[aria-invalid="true"]')).toBeNull()
    expect(element.querySelector('button.primary').disabled).toBe(false)
    type(variation, '-6.25')
    expect(element.querySelector('form').querySelector('[name="change"]').checkValidity()).toBe(true)
    expect(api.adjustInventory).not.toHaveBeenCalled()
  })
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

  it('Mi lista incrementa de uno en uno e impide fracciones para productos por unidad', async () => {
    authState.user.role = 'client'
    api.products.mockResolvedValue([{ id: 1, name: 'Café', category: 'Abarrotes', unit: 'Unidad', current_stock: 7, sale_price: 10.40 }])
    api.preferences.mockResolvedValue({ favorites: [], list: [1] })
    const element = render(<Products/>)
    await settled(() => expect(element.querySelector('[role="spinbutton"]')).not.toBeNull())
    const input = element.querySelector('[role="spinbutton"]')
    const submit = [...element.querySelectorAll('button')].find(button => button.textContent.includes('Solicitar separación'))
    expect(input.value).toBe('1')
    act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })))
    expect(input.value).toBe('2')
    act(() => element.querySelector('[aria-label^="Sumar 1"]').click())
    expect(input.value).toBe('3')
    type(input, '1.08')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(submit.disabled).toBe(true)
    type(input, '')
    expect(input.value).toBe('')
    expect(submit.disabled).toBe(true)
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

it('cierra las notificaciones al navegar, con el botón y con Escape', () => {
  const navigate = vi.fn()
  const element = render(<AppShell page="Ventas" setPage={navigate} onSale={() => {}}><p>Contenido</p></AppShell>)
  const toggle = () => act(() => element.querySelector('[aria-label="Notificaciones"]').click())
  toggle()
  expect(element.querySelector('.notice-panel')).not.toBeNull()
  act(() => element.querySelector('.notice-panel header button').click())
  expect(element.querySelector('.notice-panel')).toBeNull()
  toggle()
  act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
  expect(element.querySelector('.notice-panel')).toBeNull()
  toggle()
  act(() => [...element.querySelectorAll('aside nav button')].find((button) => button.textContent === 'Reportes').click())
  expect(navigate).toHaveBeenCalledWith('Reportes')
  expect(element.querySelector('.notice-panel')).toBeNull()
  toggle()
  act(() => root.render(<AppShell page="Promociones" setPage={navigate} onSale={() => {}}/>))
  expect(element.querySelector('.notice-panel')).toBeNull()
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

it('Promociones distingue un monto fijo con centavos de un porcentaje máximo de 100', async () => {
  api.promotions.mockResolvedValue([])
  api.products.mockResolvedValue([])
  localStorage.clear()
  const element = render(<Promotions/>)
  await settled(() => expect(element.textContent).toContain('Aún no hay campañas'))
  const create = [...element.querySelectorAll('button')].find((button) => button.textContent.includes('Nueva campaña'))
  await act(async () => create.click())
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

it('Campañas encuentra productos al escribir y permite elegir del catálogo completo', async () => {
  api.promotions.mockResolvedValue([])
  api.products.mockResolvedValue([{ id: 1, name: 'Aceite QA', regular_price: 8 }, { id: 2, name: 'Arroz QA', regular_price: 10 }])
  api.createPromotion.mockResolvedValue({})
  const element = render(<Promotions/>)
  await settled(() => expect(element.textContent).toContain('Aún no hay campañas'))
  await act(async () => element.querySelector('.promo-create').click())
  const form = element.querySelector('.campaign-modal-v5 form')
  const search = form.querySelector('input[type="search"]')
  const names = () => [...form.querySelectorAll('.product-picker-results button')].map(button => button.textContent)
  type(search, 'aceite')
  expect(names()).toEqual(['Aceite QA'])
  expect(search.checkValidity()).toBe(false)
  act(() => form.querySelector('.product-picker-browse').click())
  expect(names()).toEqual(['Aceite QA', 'Arroz QA'])
  act(() => form.querySelectorAll('.product-picker-results button')[1].click())
  expect(search.value).toBe('Arroz QA')
  expect(search.checkValidity()).toBe(true)
  type(form.elements.discountValue, '10')
  type(form.elements.startDate, '2026-11-11')
  type(form.elements.endDate, '2026-11-12')
  await act(async () => form.querySelector('.primary').click())
  expect(api.createPromotion).toHaveBeenCalledWith(expect.objectContaining({ productId: 2, discountValue: '10' }))
})

it('Promociones no recupera campañas de muestra desde localStorage', async () => {
  localStorage.setItem('nazareth_campaigns', JSON.stringify([{ id: 1, product: 'Muestra antigua' }]))
  api.promotions.mockResolvedValue([])
  const element = render(<Promotions/>)
  await settled(() => expect(element.textContent).toContain('Aún no hay campañas'))
  expect(element.textContent).not.toContain('Muestra antigua')
})

it('Clientes abre vacío y sin selección, sin perfiles ni métricas de muestra', async () => {
  api.customers.mockResolvedValue([])
  const element = render(<Customers/>)
  await settled(() => expect(element.textContent).toContain('Aún no hay clientes registrados'))
  expect(element.querySelector('.customer-profile')).toBeNull()
  expect(element.textContent).not.toContain('Rosa Castillo')
  expect(element.textContent).not.toContain('Agregar cliente')
})

it('Clientes agrupa el contacto, el resumen y las ventas del cliente seleccionado', async () => {
  api.customers.mockResolvedValue([{ id: 1, name: 'Cliente Demo', email: 'cliente@example.test', phone: null,
    visits: 1, spent: 41, points: 0, purchases: [{ id: 2, createdAt: '2026-11-12T03:00:00Z', total: 41 }] }])
  const element = render(<Customers/>)
  await settled(() => expect(element.querySelector('.customer-directory button')).not.toBeNull())
  act(() => element.querySelector('.customer-directory button').click())
  const profile = element.querySelector('.customer-profile')
  expect([...profile.querySelectorAll('h4')].map(title => title.textContent)).toEqual(['Contacto', 'Resumen de compras', 'Historial de compras'])
  expect(profile.querySelector('.customer-contact').textContent).toContain('Sin teléfono registrado')
  expect(profile.querySelectorAll('.customer-stats li')).toHaveLength(3)
  expect(profile.querySelector('tbody time').textContent).toBe('11/11/2026')
})

it('Resumen distingue error y vacío y vuelve a consultar las operaciones al entrar', async () => {
  api.dashboard.mockRejectedValueOnce(new Error('Consulta no disponible'))
  const element = render(<Overview/>)
  await settled(() => expect(element.querySelector('[role="alert"]').textContent).toContain('Consulta no disponible'))
  const empty = { today: { total: 0, saleCount: 0, cashTotal: 0, paymentTotals: { yape: 0, plin: 0 } }, summary: { total: 0, saleCount: 0, cashTotal: 0, digitalTotal: 0 }, projection: null, comparison: null, strongestHour: null, trend: [], demand: [], activity: [] }
  api.dashboard.mockResolvedValue(empty)
  act(() => element.querySelector('button.secondary').click())
  await settled(() => expect(element.textContent).toContain('No hay productos en alerta de stock.'))
  expect(element.textContent).toContain('Aún no hay datos suficientes')
  expect(element.textContent).toContain('0 operaciones')
  expect(element.textContent).toContain('Productos con stock bajo')
  api.dashboard.mockResolvedValue({ ...empty, today: { ...empty.today, total: 20.1, saleCount: 1, cashTotal: 20.1 } })
  act(() => root.render(null))
  act(() => root.render(<Overview/>))
  await settled(() => expect(element.textContent).toContain('20.10'))
  expect(api.dashboard).toHaveBeenCalledTimes(3)
})

it('CU-005: catálogo sin foto permite solicitar con cantidad decimal y consultar código y vigencia',async()=>{
  authState.user.role='client'
  api.products.mockResolvedValue([{id:1,name:'Producto real QA',unit:'Kg',category:'Abarrotes',sale_price:6.7,current_stock:3,image_url:null}])
  api.preferences.mockResolvedValue({favorites:[],list:[]})
  api.savePreferences.mockImplementation(async value=>value)
  api.requestReservation.mockResolvedValue({pickup_code:'NZ-TEST-QA',estimated_total:1.68,pickup_deadline:'2026-11-12T18:00:00Z'})
  const navigate=vi.fn(),element=render(<Products onNavigate={navigate}/>)
  await settled(()=>expect(element.querySelector('.product-copy strong').textContent).toContain('6.70'))
  expect(element.querySelector('.photo-neutral')).not.toBeNull()
  expect(element.querySelector('.product-copy').firstElementChild.textContent).toBe('Producto real QA')
  expect(element.querySelector('.catalog-product-stock').textContent).toContain('3 Kg en tienda')
  expect(element.querySelector('.catalog-hero-description').textContent).toContain('recoger en tienda')
  expect(element.querySelector('.catalog-hero').textContent).not.toContain('Catálogo registrado')
  expect(element.querySelector('.catalog-products header').textContent).not.toContain('Stock consultado')
  expect(element.querySelector('.shopping-list-empty strong').textContent).toBe('Tu lista está vacía')
  await act(async()=>element.querySelector('.product-copy button').click())
  type(element.querySelector('[aria-label="Cantidad para separar Producto real QA"]'),'0.25')
  await act(async()=>[...element.querySelectorAll('button')].find(button=>button.textContent.includes('Solicitar separación')).click())
  await settled(()=>expect(element.textContent).toContain('NZ-TEST-QA'))
  const confirmation = element.querySelector('[aria-label="Solicitud de reserva registrada"]')
  expect(confirmation.querySelector('strong').textContent).toBe('NZ-TEST-QA')
  expect(confirmation.querySelector('time').dateTime).toBe('2026-11-12T18:00:00Z')
  expect(confirmation.querySelector('dl').textContent).toContain('1.68')
  expect(api.requestReservation.mock.calls[0][0].items).toEqual([{productId:1,quantity:'0.25',expectedUnitPrice:'6.70'}])
  expect(element.textContent).toContain('Pendiente de confirmación')
  expect(element.textContent).not.toContain('WhatsApp')
  expect(api.createSale).not.toHaveBeenCalled()
  act(()=>[...element.querySelectorAll('button')].find(button=>button.textContent==='Ver mis solicitudes').click())
  expect(navigate).toHaveBeenCalledWith('Reservas')
})

it('El cliente ve el precio anterior y el actual en ofertas, catálogo y lista; revisa un cambio antes de reservar', async () => {
  authState.user.role = 'client'
  api.promotions.mockResolvedValue([{ id: 1, product: 'Cafetal QA', regularPrice: 10.4, currentPrice: 8.4,
    status: 'active', startDate: '2026-11-11T05:00:00Z', endDate: '2026-11-20T05:00:00Z' }])
  const offer = render(<Promotions/>)
  await settled(() => expect(offer.querySelector('.offer-price del')?.textContent).toContain('10.40'))
  expect(offer.textContent).toContain('Ofertas vigentes')
  expect(offer.textContent).toContain('Ahorras')
  expect(offer.querySelector('.offer-price strong').textContent).toContain('8.40')

  const product = { id: 1, name: 'Cafetal QA', unit: 'Unidad', category: 'Abarrotes',
    sale_price: 8.4, regular_price: '10.40', current_stock: 10 }
  api.products.mockResolvedValueOnce([product]).mockResolvedValue([{ ...product, sale_price: 10.4 }])
  api.preferences.mockResolvedValue({ favorites: [], list: [1] })
  api.requestReservation.mockRejectedValueOnce(Object.assign(new Error('Los precios cambiaron.'), { status: 409 }))
  act(() => root.render(<Products/>))
  await settled(() => expect(offer.querySelectorAll('.offer-price del')).toHaveLength(2))
  expect(offer.querySelector('.shopping-list-lines .offer-price strong').textContent).toContain('8.40')
  await act(async () => [...offer.querySelectorAll('button')].find(button => button.textContent.includes('Solicitar separación')).click())
  expect(api.requestReservation).toHaveBeenCalledWith(expect.objectContaining({ expectedTotal: '8.40' }))
  expect(offer.querySelectorAll('.offer-price del')).toHaveLength(0)
  expect(offer.querySelector('.shopping-list-lines .offer-price strong').textContent).toContain('10.40')
  expect(offer.textContent).toContain('Los precios cambiaron.')
})

it('CU-001 digital: QR de demostración, importe exacto y confirmación manual sin referencia',async()=>{
  api.products.mockResolvedValue([{id:1,name:'Arroz QA',category:'Abarrotes',unit:'Kg',sale_price:6.7,current_stock:10}])
  api.quoteSale.mockResolvedValue({...savedSale,units:1,total:6.7,quoteId:'a'.repeat(64),items:[{...savedSale.items[0],productId:1,quantity:1,subtotal:6.7}]})
  api.createSale.mockResolvedValue({...savedSale,id:800,total:6.7,paymentMethod:'yape',paymentReference:null})
  const element=render(<SaleDrawer close={()=>{}}/>)
  await settled(()=>expect(element.querySelector('.pos-products button')).not.toBeNull())
  act(()=>element.querySelector('.pos-products button').click())
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,250))})
  await settled(()=>expect(element.querySelector('.grand-total').textContent).toContain('6.70'))
  act(()=>[...element.querySelectorAll('.pos-pay button')].find(button=>button.textContent.includes('Yape')).click())
  expect(element.querySelector('.payment-qr').getAttribute('src')).toBe('/qr-demo-yape.svg')
  expect(element.querySelector('.payment-brand').getAttribute('src')).toBe('/payment/yape.png')
  expect(element.querySelector('.digital-payment').textContent).not.toContain('Referencia de operación')
  act(()=>[...element.querySelectorAll('.pos-pay button')].find(button=>button.textContent.includes('Plin')).click())
  expect(element.querySelector('.payment-qr').getAttribute('src')).toBe('/qr-demo-plin.svg')
  expect(element.querySelector('.payment-brand').getAttribute('src')).toBe('/payment/plin.png')
  act(()=>[...element.querySelectorAll('.pos-pay button')].find(button=>button.textContent.includes('Yape')).click())
  type(element.querySelector('.digital-payment input[type="number"]'),'6.70')
  expect(element.querySelector('.pos-confirm').disabled).toBe(true)
  act(()=>element.querySelector('.digital-payment input[type="checkbox"]').click())
  expect(element.querySelector('.pos-confirm').disabled).toBe(false)
  await act(async()=>element.querySelector('.pos-confirm').click())
  await settled(()=>expect(element.querySelector('.sale-success')).not.toBeNull())
  expect(api.createSale.mock.calls[0][0]).toMatchObject({paymentMethod:'yape',digitalReceived:'6.70',paymentConfirmed:true})
  expect(api.createSale.mock.calls[0][0]).not.toHaveProperty('paymentReference')
})

it('CU-006: foto opcional valida formato, carga y permite quitar antes de guardar',async()=>{
  api.uploadPhoto.mockResolvedValue({url:'https://project.supabase.co/storage/v1/object/public/product-photos/1/photo.png'})
  const element=render(<ProductDrawer categories={[{id:1,name:'Abarrotes'}]} close={()=>{}} saved={()=>{}}/>)
  const input=element.querySelector('input[type="file"]')
  act(()=>{Object.defineProperty(input,'files',{configurable:true,value:[new File(['svg'],'bad.svg',{type:'image/svg+xml'})]});input.dispatchEvent(new Event('change',{bubbles:true}))})
  expect(api.uploadPhoto).not.toHaveBeenCalled()
  await act(async()=>{Object.defineProperty(input,'files',{configurable:true,value:[new File(['png'],'photo.png',{type:'image/png'})]});input.dispatchEvent(new Event('change',{bubbles:true}))})
  expect(element.querySelector('.product-photo-preview')).not.toBeNull()
  act(()=>[...element.querySelectorAll('button')].find(button=>button.textContent==='Quitar foto').click())
  expect(element.querySelector('.product-photo-preview')).toBeNull()
})

it('PRU-004 en caja: selecciona Cliente Demo y limpia la selección al iniciar otra venta',async()=>{
  api.products.mockResolvedValue([{id:1,name:'Arroz QA',category:'Abarrotes',unit:'Kg',sale_price:6.7,current_stock:10}])
  api.saleCustomers.mockResolvedValue([{id:1,name:'Cliente Demo',email:'demo@example.test'}])
  api.quoteSale.mockResolvedValue({...savedSale,total:6.7,units:1,quoteId:'a'.repeat(64),items:[{...savedSale.items[0],productId:1,quantity:1,subtotal:6.7}]})
  api.createSale.mockResolvedValueOnce({...savedSale,customerId:1,customerName:'Cliente Demo'}).mockResolvedValueOnce({...savedSale,id:358,customerId:null,customerName:null})
  const element=render(<SaleDrawer close={()=>{}}/>)
  await settled(()=>expect(element.querySelector('.pos-products button')).not.toBeNull())
  act(()=>element.querySelector('.customer-select').click())
  type(element.querySelector('[aria-label="Buscar cliente registrado"]'),'Cliente Demo')
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,250))})
  await settled(()=>expect(element.querySelector('.sale-customer-search .secondary')).not.toBeNull())
  act(()=>element.querySelector('.sale-customer-search .secondary').click())
  async function finish(){
    act(()=>element.querySelector('.pos-products button').click())
    await act(async()=>{await new Promise(resolve=>setTimeout(resolve,250))})
    await settled(()=>expect(element.querySelector('.grand-total').textContent).toContain('6.70'))
    type(element.querySelector('input[type="number"][required]'),'50.00')
    await act(async()=>element.querySelector('.pos-confirm').click())
    await settled(()=>expect(element.querySelector('.sale-success')).not.toBeNull())
  }
  await finish()
  expect(api.createSale.mock.calls[0][0].customerId).toBe(1)
  act(()=>root.render(null));act(()=>root.render(<SaleDrawer close={()=>{}}/>))
  await settled(()=>expect(element.querySelector('.pos-products button')).not.toBeNull())
  expect(element.querySelector('.customer-select').textContent).toContain('Venta sin cliente')
  await finish()
  expect(api.createSale.mock.calls[1][0].customerId).toBe(null)
})

it('Configuración cambia entre credenciales y seguridad, y muestra al cliente recién creado', async () => {
  api.users.mockResolvedValue([])
  api.createUser.mockResolvedValue({ id: 2, name: 'Cliente nuevo', email: 'nuevo@example.com', role: 'client', isActive: true })
  const element = render(<Settings/>)
  const sectionButton = label => [...element.querySelectorAll('.settings-nav button')].find(button => button.textContent === label)
  act(() => sectionButton('Seguridad').click())
  expect(sectionButton('Seguridad').getAttribute('aria-pressed')).toBe('true')
  expect(element.textContent).toContain('Cambiar mi contraseña')
  expect(element.querySelector('.credential-form')).toBeNull()
  act(() => sectionButton('Credenciales').click())
  await settled(() => expect(element.querySelector('.credential-form button.primary').disabled).toBe(false))
  const form = element.querySelector('.credential-form form')
  type(form.querySelector('input:not([type])'), 'Cliente nuevo')
  type(form.querySelector('input[type="email"]'), 'nuevo@example.com')
  type(form.querySelector('input[type="password"]'), 'Temporary!12')
  await act(async () => form.querySelector('button.primary').click())
  expect(api.createUser).toHaveBeenCalledWith(expect.objectContaining({ role: 'client', name: 'Cliente nuevo', isActive: true }))
  const row = element.querySelector('.credential-list article')
  expect(row.textContent).toContain('Cliente nuevo')
  expect(row.querySelector('.role-badge').textContent).toBe('Cliente')
  expect(row.querySelector('.status-dot').textContent).toBe('Activo')
})

it.each(['admin', 'client'])('Reservas separa solicitudes activas e historial para %s', async (role) => {
  authState.user.role = role
  const reservation = { pickup_deadline: '2026-11-12T18:00:00Z', estimated_total: 6.7,
    items: [{ productId: 1, name: 'Aceite QA', unit: 'Unidad', quantity: 2 }], customerName: 'Cliente Demo' }
  const rows = ['pending', 'confirmed', 'expired', 'cancelled', 'rejected', 'collected']
    .map((status, id) => ({ ...reservation, id, status, pickup_code: 'NZ-' + status }))
  api.reservations.mockResolvedValue(rows)

  const element = render(<Reservations/>)
  const button = name => [...element.querySelectorAll('button')].find(item => item.textContent === name)
  await settled(() => expect(element.textContent).toContain('NZ-pending'))
  expect(button('Activas').getAttribute('aria-pressed')).toBe('true')
  const pending = element.querySelector('[data-status="pending"]').closest('.reservation-record')
  expect(pending.querySelector('h3').textContent).toBe('NZ-pending')
  expect(pending.querySelector('time').dateTime).toBe(reservation.pickup_deadline)
  expect([...pending.querySelector('tbody tr').cells].map(cell => cell.textContent)).toEqual(['Aceite QA', '2 Unidades'])
  expect(pending.querySelector('.reservation-record-total').textContent).toContain('Total estimado')
  expect(pending.querySelector('.reservation-record-meta').textContent.includes('Cliente Demo')).toBe(role === 'admin')
  expect(element.textContent).toContain('NZ-confirmed')
  for (const status of ['expired', 'cancelled', 'rejected', 'collected']) {
    expect(element.textContent).not.toContain('NZ-' + status)
  }
  expect(button('Cancelar')).toBeDefined()
  expect(Boolean(button('Recoger y pagar'))).toBe(role === 'admin')

  act(() => button('Historial').click())
  expect(element.textContent).not.toContain('NZ-pending')
  expect(element.textContent).not.toContain('NZ-confirmed')
  for (const status of ['expired', 'cancelled', 'rejected', 'collected']) {
    expect(element.textContent).toContain('NZ-' + status)
  }
  expect(button('Cancelar')).toBeUndefined()
  expect(button('Recoger y pagar')).toBeUndefined()
  expect(element.querySelector('.reservation-record-meta').textContent).toContain('Vigencia original')
  expect(api.reservations).toHaveBeenCalledTimes(1)
})

it('Reservas conserva el producto al abrir el ajuste y guarda el que se elige al buscar', async () => {
  const products = [{ id: 1, name: 'Aceite QA', unit: 'Unidad' }, { id: 2, name: 'Arroz QA', unit: 'Kg' }]
  api.reservations.mockResolvedValue([{ id: 7, status: 'pending', pickup_code: 'NZ-QA',
    pickup_deadline: '2026-11-12T18:00:00Z', estimated_total: 8, customerName: 'Cliente Demo',
    items: [{ productId: 1, name: 'Aceite QA', unit: 'Unidad', quantity: 1 }] }])
  api.products.mockResolvedValue(products)
  api.changeReservation.mockResolvedValue({})
  const element = render(<Reservations/>)
  await settled(() => expect(element.textContent).toContain('NZ-QA'))
  await act(async () => [...element.querySelectorAll('button')].find(button => button.textContent === 'Ajustar solicitud').click())
  const form = element.querySelector('[role="dialog"] form')
  const search = form.querySelector('input[type="search"]')
  expect(search.value).toBe('Aceite QA')
  type(search, 'arroz')
  expect(search.checkValidity()).toBe(false)
  act(() => form.querySelector('.product-picker-results button').click())
  type(form.querySelector('[role="spinbutton"]'), '1.25')
  await act(async () => form.querySelector('.primary').click())
  expect(api.changeReservation).toHaveBeenCalledWith(7, { action: 'edit', items: [{ productId: 2, quantity: '1.25' }] })
})

it('Inventario muestra disponible, físico, apartado y mínimo en lista y tarjetas', () => {
  const previousData = inventoryState.data
  inventoryState.data = { categories: [], products: [{
    id: 1, name: 'Aceite cocinero', unit: 'Unidad', category: 'Abarrotes', isActive: true,
    stock: 4, held: 0, available: 4, minimum: 5, cost: 5, price: 7, lowStock: true,
  }] }
  try {
    const element = render(<Inventory/>)
    const checkStock = () => {
      const stock = element.querySelector('.inventory-stock')
      expect([...stock.querySelectorAll('dt')].map(label => label.textContent)).toEqual(['Disponible', 'Físico', 'Apartado', 'Stock mínimo para alerta'])
      expect([...stock.querySelectorAll('dd')].map(value => value.firstChild.textContent)).toEqual(['4 Unidades', '4 Unidades', '0 Unidades', '5 Unidades'])
      expect(stock.querySelector('.inventory-stock-alert').textContent).toBe('Requiere atención')
    }
    checkStock()
    act(() => element.querySelector('[aria-label="Vista de tarjetas"]').click())
    checkStock()
  } finally {
    inventoryState.data = previousData
  }
})

it('Ventas muestra fecha y hora de Lima para ventas de distintos días en la última semana', async () => {
  const summary = { total: 40.2, cashTotal: 40.2, digitalTotal: 0, saleCount: 2 }
  api.sales.mockImplementation(async period => ({
    summary,
    sales: period === 'week' ? [
      { ...savedSale, createdAt: '2026-11-11T03:40:00Z' },
      { ...savedSale, id: 356, createdAt: '2026-11-10T03:40:00Z' },
    ] : [],
  }))
  const element = render(<Sales/>)
  const period = element.querySelector('[aria-label="Periodo de ventas"]')
  act(() => {
    period.value = 'week'
    period.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await settled(() => expect(element.querySelectorAll('tbody time')).toHaveLength(2))
  expect(element.querySelector('th:nth-child(2)').textContent).toBe('Fecha y hora')
  const dates = [...element.querySelectorAll('tbody time')].map(time => [...time.children].map(part => part.textContent))
  expect(dates).toEqual([
    ['10 de noviembre de 2026', '22:40:00'],
    ['9 de noviembre de 2026', '22:40:00'],
  ])
})

it('Ventas ofrece Hoy y Ayer con fecha y consulta el periodo elegido', async () => {
  api.sales.mockResolvedValue({ summary: { total: 0, cashTotal: 0, digitalTotal: 0, saleCount: 0 }, sales: [] })
  const element = render(<Sales/>)
  const period = element.querySelector('[aria-label="Periodo de ventas"]')
  expect([...period.options].map(option => option.value)).toEqual(['today', 'yesterday', 'week', 'month'])
  expect(period.options[0].textContent.trim()).toMatch(/^Hoy, \d{1,2} de /)
  expect(period.options[1].textContent.trim()).toMatch(/^Ayer, \d{1,2} de /)
  await act(async () => {
    period.value = 'yesterday'
    period.dispatchEvent(new Event('change', { bubbles: true }))
  })
  expect(api.sales).toHaveBeenLastCalledWith('yesterday', expect.any(AbortSignal))
  expect(element.querySelector('.sales-summary span').textContent).toBe('AYER')
})

it('Compras muestra un producto por fila, subtotales y el total de una compra recibida', async () => {
  api.orders.mockResolvedValue([{ id: 1, status: 'received', supplier_name: 'Makro QA',
    supplier_ruc: 'RUC QA', supplier_phone: '999999999', estimated_total: 45,
    items: [
      { id: 3, name: 'Ace QA', unit: 'Unidad', quantity: 8, received_quantity: 8, unit_cost: 5 },
      { id: 4, name: 'Arroz QA', unit: 'Kg', quantity: 1.25, received_quantity: 1.25, unit_cost: 4 },
    ] }])
  api.products.mockResolvedValue([])
  const element = render(<Purchases/>)
  await settled(() => expect(element.querySelectorAll('.purchase-record tbody tr')).toHaveLength(2))
  expect(element.querySelector('.purchase-record-contact').textContent).toContain('Teléfono')
  expect(element.querySelector('.purchase-record tbody tr td:last-child').textContent).toContain('40.00')
  expect(element.querySelector('.purchase-record-total').textContent).toContain('Total de la compra')
})

it('Compras registra la mercadería en una sola operación', async () => {
  const item = { id: 1, name: 'Aceite QA', unit: 'Unidad', category: 'Abarrotes' }
  api.products.mockResolvedValue([item])
  api.orders.mockResolvedValue([])
  api.registerDirectPurchase.mockResolvedValue({ id: 8, status: 'received' })
  const element = render(<Purchases/>)
  const button = label => [...element.querySelectorAll('button')].find(control => control.textContent === label)
  await settled(() => expect(element.textContent).toContain('Aún no hay compras registradas.'))
  act(() => button('Registrar compra').click())
  const form = element.querySelector('[role="dialog"] form')
  expect(form.querySelector('input[name="received"]')).toBeNull()
  expect(form.elements.reference.required).toBe(true)
  const data = { name: 'Mayorista QA', ruc: 'RUC QA', phone: '999999999', reference: 'BOLETA-QA-001' }
  for (const [key, value] of Object.entries(data)) type(form.elements[key], value)
  const product = form.querySelector('input[type="search"]')
  const browse = form.querySelector('.product-picker-browse')
  act(() => browse.click())
  expect(browse.getAttribute('aria-expanded')).toBe('true')
  expect(form.querySelector('[aria-label="Todos los productos"] button').textContent).toBe('Aceite QA')
  act(() => button('Aceite QA').click())
  expect(product.value).toBe('Aceite QA')
  expect(browse.getAttribute('aria-expanded')).toBe('false')
  type(product, 'sin coincidencias')
  expect(form.textContent).toContain('No encontramos ese producto.')
  expect(product.checkValidity()).toBe(false)
  type(product, 'aceite')
  expect(form.querySelector('.product-picker-results button').textContent).toBe('Aceite QA')
  expect(product.checkValidity()).toBe(false)
  act(() => button('Aceite QA').click())
  expect(product.checkValidity()).toBe(true)
  expect(form.querySelector('.product-picker-results')).toBeNull()
  type(form.querySelector('input[type="number"]'), '5.00')
  expect(form.querySelector('.purchase-remove-product')).toBeNull()
  act(() => button('Agregar otro producto').click())
  const removeButtons = form.querySelectorAll('.purchase-line-heading .purchase-remove-product')
  expect(removeButtons).toHaveLength(2)
  expect(removeButtons[1].getAttribute('aria-label')).toBe('Quitar producto 2 de la compra')
  expect(removeButtons[1].closest('[role="group"]').querySelector('h3').textContent).toBe('Producto 2')
  act(() => removeButtons[1].click())
  expect(form.querySelectorAll('[role="spinbutton"]')).toHaveLength(1)
  expect(form.querySelector('.purchase-remove-product')).toBeNull()
  expect(product.value).toBe('Aceite QA')
  expect(form.querySelector('input[type="number"]').value).toBe('5.00')
  await act(async () => button('Guardar compra e ingresar al inventario').click())
  expect(api.registerDirectPurchase).toHaveBeenCalledWith({
    supplierName: data.name, supplierRuc: data.ruc, supplierPhone: data.phone, reference: data.reference,
    items: [{ productId: 1, quantity: '1', cost: '5.00' }],
  })
  expect(api.registerDirectPurchase).toHaveBeenCalledTimes(1)
  expect(element.textContent).toContain('Compra registrada e ingresada al inventario.')
})

it('Compras permite registrar una recepción parcial para una orden pendiente anterior', async () => {
  api.orders.mockResolvedValue([{ id: 9, status: 'pending', supplier_name: 'Mayorista QA', estimated_total: 20,
    items: [{ id: 3, name: 'Aceite QA', unit: 'Unidad', quantity: 4, received_quantity: 1, unit_cost: 5 }] }])
  api.products.mockResolvedValue([])
  api.receiveOrder.mockResolvedValue({})
  const element = render(<Purchases/>)
  const button = label => [...element.querySelectorAll('button')].find(control => control.textContent === label)
  await settled(() => expect(button('Registrar recepción')).toBeDefined())
  act(() => button('Registrar recepción').click())
  const form = element.querySelector('[role="dialog"] form')
  type(form.elements.reference, 'BOLETA-QA-003')
  type(form.elements['item-3'], '2')
  await act(async () => button('Confirmar recepción').click())
  expect(api.receiveOrder).toHaveBeenCalledWith(9, { reference: 'BOLETA-QA-003', items: [{ itemId: 3, quantity: '2' }] })
  expect(api.registerDirectPurchase).not.toHaveBeenCalled()
})

it('Editar producto presenta el stock actual como texto y mantiene el umbral editable', () => {
  const product = { id: 1, name: 'Aceite QA', categoryId: 1, stock: 4, minimum: 5, unit: 'Unidad', cost: 5, price: 7 }
  const element = render(<ProductDrawer product={product} categories={[{ id: 1, name: 'Abarrotes' }]} close={() => {}}/>)
  const stock = element.querySelector('.inventory-current-stock')
  expect(stock.textContent).toContain('4 Unidades')
  expect(stock.querySelector('input')).toBeNull()
  expect(element.querySelector('[aria-label="Stock mínimo para alerta"]')).not.toBeNull()
})

it.each([false, true])('Compras conserva la solicitud y la línea al reintentar (reintento manual: %s)', async manualRetry => {
  const previousData = inventoryState.data
  inventoryState.data = { categories: [{ id: 1, name: 'Abarrotes' }], products: [] }
  api.orders.mockResolvedValue([])
  api.products.mockResolvedValue([])
  api.createProduct.mockRejectedValueOnce(new TypeError('Failed to fetch'))
  if (manualRetry) api.createProduct.mockRejectedValueOnce(new TypeError('Failed to fetch'))
  api.createProduct.mockResolvedValue({ id: 9, name: 'Aceite nuevo', unit: 'Unidad', category: 'Abarrotes', cost: 5 })
  try {
    const element = render(<Purchases/>)
    const button = label => [...element.querySelectorAll('button')].find(control => control.textContent === label)
    await settled(() => expect(element.textContent).toContain('Aún no hay compras registradas.'))
    act(() => button('Registrar compra').click())
    const form = () => element.querySelector('[role="dialog"] form')
    type(form().elements.name, 'Mayorista QA')
    type(form().elements.ruc, 'RUC QA')
    type(form().elements.phone, '999999999')
    type(form().elements.reference, 'BOLETA-QA-002')
    type(form().querySelector('[role="spinbutton"]'), '12')
    act(() => button('Crear producto nuevo').click())
    type(form().querySelector('input[placeholder^="Ej. Harina"]'), 'Aceite nuevo')
    const [cost, price] = form().querySelectorAll('input[type="number"]')
    type(cost, '5')
    type(price, '7')
    const createButton = () => button('Crear producto y volver a la compra')
    vi.useFakeTimers()
    await act(async () => {
      createButton().click()
      await vi.advanceTimersByTimeAsync(350)
    })

    if (manualRetry) {
      expect(form().querySelector('[role="alert"]')?.textContent).toContain('No pudimos confirmar el guardado')
      expect(form().textContent).not.toContain('Failed to fetch')
      expect(form().querySelector('input[placeholder^="Ej. Harina"]').value).toBe('Aceite nuevo')
      await act(async () => createButton().click())
    }
    expect(api.createProduct).toHaveBeenCalledTimes(manualRetry ? 3 : 2)
    expect(api.createProduct).toHaveBeenCalledWith(expect.objectContaining({ name: 'Aceite nuevo', initialStock: 0, requestId: expect.any(String) }))
    for (const [payload] of api.createProduct.mock.calls) expect(payload).toEqual(api.createProduct.mock.calls[0][0])
    expect(form().elements.name.value).toBe('Mayorista QA')
    expect(form().elements.ruc.value).toBe('RUC QA')
    expect(form().elements.phone.value).toBe('999999999')
    expect(form().elements.reference.value).toBe('BOLETA-QA-002')
    expect(form().querySelector('[role="spinbutton"]').value).toBe('12')
    expect(form().querySelector('input[type="search"]').value).toBe('Aceite nuevo')
    expect(form().querySelector('input[type="number"]').value).toBe('5')
    expect(api.registerDirectPurchase).not.toHaveBeenCalled()
  } finally {
    vi.useRealTimers()
    inventoryState.data = previousData
  }
})
