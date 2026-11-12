// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from '../App'

const state = vi.hoisted(() => ({ user: null, login: null, loaded: [], authMounts: 0, inventoryMounts: 0, inventoryReady: null }))
vi.mock('../context/AuthContext', () => ({
  AuthProvider({ children }) { useEffect(() => { state.authMounts++ }, []); return children },
  useAuth: () => ({ user: state.user, checking: false, login: async email => state.login(email.startsWith('admin') ? 'admin' : 'client'), logout: async () => state.login(null) }),
}))
const inventory = vi.hoisted(() => ({ data: { products: [], categories: [] }, alertCount: 0, loading: false, error: '', setRevision: vi.fn() }))
vi.mock('../context/InventoryContext', () => ({
  InventoryProvider({ children }) { useEffect(() => { state.inventoryMounts++ }, []); return children },
  useInventory: () => inventory,
}))
vi.mock('../pages/ClientHome', () => { state.loaded.push('ClientHome'); return { default: () => <p>Inicio cliente de prueba</p> } })
vi.mock('../pages/Products', () => { state.loaded.push('Products'); return { default: () => <p>Catálogo de prueba</p> } })
vi.mock('../pages/Overview', () => {
  state.loaded.push('Overview')
  return { default: () => { const [text, setText] = useState(''); return <input aria-label="Campo de pantalla" value={text} onChange={event => setText(event.target.value)}/> } }
})
vi.mock('../pages/Inventory', async () => { state.loaded.push('Inventory'); await state.inventoryReady; return { default: () => <p>Inventario de prueba</p> } })
vi.mock('../components/ui/SaleDrawer', () => {
  state.loaded.push('SaleDrawer')
  return { default: ({ close }) => { const [value, setValue] = useState('1'); return <div><input aria-label="Cantidad del carrito" value={value} onChange={event => setValue(event.target.value)}/><button onClick={close}>Cerrar venta de prueba</button></div> } }
})

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, container
afterEach(() => { act(() => root?.unmount()); container?.remove() })
async function settled(assertion) { await vi.waitFor(async () => { await act(async () => {}); assertion() }) }
function type(input, value) { act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })) }) }

it('elige módulos por perfil y mantiene shell, proveedores y carrito al navegar con un chunk pendiente', async () => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  state.login = role => { state.user = role ? { id: role === 'admin' ? 1 : 2, role, name: 'Cuenta de prueba', email: role + '@example.test' } : null; root.render(<App/>) }
  await act(async () => { await import('../pages/Login'); root.render(<App/>) })
  await settled(() => expect(container.querySelector('input[type="email"]')).not.toBeNull())
  expect(state.loaded).toEqual([])
  async function login(email) {
    type(container.querySelector('input[type="email"]'), email)
    type(container.querySelector('input[type="password"]'), 'Clave de fixture')
    await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  }
  await login('cliente@example.test')
  await settled(() => expect(container.textContent).toContain('Inicio cliente de prueba'))
  const clientShell = container.querySelector('#main')
  const navigate = async page => act(async () => [...container.querySelectorAll('aside nav button')].find(button => button.textContent.startsWith(page)).click())
  await navigate('Productos')
  await settled(() => expect(container.textContent).toContain('Catálogo de prueba'))
  expect(container.querySelector('#main')).toBe(clientShell)
  expect(state.loaded).toEqual(['ClientHome', 'Products'])
  await act(async () => container.querySelector('[aria-label="Cerrar sesión"]').click())
  await settled(() => expect(container.querySelector('input[type="email"]')).not.toBeNull())
  await login('admin@example.test')
  await settled(() => expect(container.querySelector('[aria-label="Campo de pantalla"]')).not.toBeNull())
  expect(state.loaded).not.toContain('SaleDrawer')
  type(container.querySelector('[aria-label="Campo de pantalla"]'), 'Cambios de pantalla')
  const adminShell = container.querySelector('#main')
  act(() => [...container.querySelectorAll('button')].find(button => button.textContent.includes('Nueva venta')).click())
  await settled(() => expect(container.querySelector('[aria-label="Cantidad del carrito"]')).not.toBeNull())
  type(container.querySelector('[aria-label="Cantidad del carrito"]'), '3.25')
  let resolve
  state.inventoryReady = new Promise(done => { resolve = done })
  await navigate('Inventario')
  await settled(() => expect(state.loaded).toContain('Inventory'))
  expect(container.querySelector('[aria-label="Campo de pantalla"]').value).toBe('Cambios de pantalla')
  expect(container.querySelector('[aria-label="Cantidad del carrito"]').value).toBe('3.25')
  await act(async () => resolve())
  await settled(() => expect(container.textContent).toContain('Inventario de prueba'))
  expect(container.querySelector('#main')).toBe(adminShell)
  expect(container.querySelector('[aria-label="Cantidad del carrito"]').value).toBe('3.25')
  expect(state.authMounts).toBe(1)
  expect(state.inventoryMounts).toBe(1)
})
