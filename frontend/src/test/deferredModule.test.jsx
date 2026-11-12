// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, startTransition, useState } from 'react'
import { createRoot } from 'react-dom/client'
import DeferredModule, { deferredModule, reloadApplication } from '../components/ui/DeferredModule'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, container
afterEach(() => { act(() => root?.unmount()); container?.remove(); vi.restoreAllMocks() })
function render(element) {
  container = document.createElement('div'); document.body.append(container)
  root = createRoot(container); act(() => root.render(element)); return container
}
async function settled(assertion) {
  await vi.waitFor(async () => { await act(async () => {}); assertion() })
}
function Counter() {
  const [value, setValue] = useState(0)
  return <button onClick={() => setValue(value + 1)}>Valor {value}</button>
}

describe('Carga diferida y recuperación', () => {
  it('no importa hasta renderizar y no recrea el componente ni su estado en rerenders', async () => {
    const loader = vi.fn().mockResolvedValue({ default: Counter })
    const definition = deferredModule(loader)
    expect(loader).not.toHaveBeenCalled()
    const element = render(<DeferredModule definition={definition} label="Prueba"/>)
    await settled(() => expect(element.textContent).toContain('Valor 0'))
    act(() => element.querySelector('button').click())
    act(() => root.render(<DeferredModule definition={definition} label="Prueba actualizada"/>))
    expect(element.textContent).toContain('Valor 1')
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('conserva la pantalla revelada y sus cambios mientras se descarga el siguiente módulo', async () => {
    let resolve
    const first = deferredModule(async () => ({ default: Counter }))
    const second = deferredModule(() => new Promise(done => { resolve = done }))
    function Navigation() {
      const [definition, setDefinition] = useState(first)
      return <><button onClick={() => startTransition(() => setDefinition(second))}>Navegar</button><DeferredModule definition={definition} label="Pantalla"/></>
    }
    const element = render(<Navigation/>)
    await settled(() => expect(element.textContent).toContain('Valor 0'))
    act(() => element.querySelectorAll('button')[1].click())
    act(() => element.querySelector('button').click())
    expect(element.textContent).toContain('Valor 1')
    await act(async () => resolve({ default: () => <p>Siguiente pantalla</p> }))
    expect(element.textContent).toContain('Siguiente pantalla')
  })

  it('un fallo muestra recuperación, reintenta un lazy nuevo y permite navegar a otro módulo', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const loader = vi.fn().mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module')).mockResolvedValue({ default: Counter })
    const broken = deferredModule(loader)
    const element = render(<DeferredModule definition={broken} label="Ventas"/>)
    await settled(() => expect(element.querySelector('[role="alert"]')).not.toBeNull())
    act(() => [...element.querySelectorAll('button')].find(button => button.textContent === 'Reintentar carga').click())
    await settled(() => expect(element.textContent).toContain('Valor 0'))
    expect(loader).toHaveBeenCalledTimes(2)
    const unavailable = deferredModule(async () => { throw new Error('Offline') })
    await act(async () => root.render(<DeferredModule definition={unavailable} label="Reportes"/>))
    await settled(() => expect(element.querySelector('[role="alert"]')).not.toBeNull())
    await act(async () => root.render(<DeferredModule definition={deferredModule(async () => ({ default: () => <p>Otra pantalla</p> }))} label="Inventario"/>))
    await settled(() => expect(element.textContent).toContain('Otra pantalla'))
  })

  it('no recarga automáticamente ni sin confirmación de pérdida de cambios', () => {
    const reload = vi.fn(), confirm = vi.fn().mockReturnValue(false)
    reloadApplication(confirm, reload)
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('cambios sin guardar'))
    expect(reload).not.toHaveBeenCalled()
    reloadApplication(() => true, reload)
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
