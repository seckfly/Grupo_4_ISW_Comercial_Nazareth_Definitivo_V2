import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { StockPill } from '../components/ui/Card'

describe('CU-006 alertas de inventario', () => {
  it('usa el mínimo configurado y muestra alerta por igualdad', () => {
    expect(renderToStaticMarkup(<StockPill stock={12} minimum={15}/>)).toContain('stock critical')
    expect(renderToStaticMarkup(<StockPill stock={15} minimum={15}/>)).toContain('stock warning')
    expect(renderToStaticMarkup(<StockPill stock={16} minimum={15}/>)).toContain('stock ok')
  })

  it('excluye productos inactivos de la alerta', () => {
    expect(renderToStaticMarkup(<StockPill stock={4} minimum={5} isActive={false}/>)).toContain('stock ok')
  })
})
