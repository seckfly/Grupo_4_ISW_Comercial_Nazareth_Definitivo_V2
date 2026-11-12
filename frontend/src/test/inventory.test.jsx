import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { StockPill } from '../components/ui/Card'
import OfferPrice from '../components/ui/OfferPrice'

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


describe('precio promocional en inventario', () => {
  it('tacha el precio regular y destaca el precio promocional vigente', () => {
    const markup = renderToStaticMarkup(<OfferPrice regularPrice={6.7} price={5.36}/>)
    expect(markup).toContain('<del aria-label="Precio anterior S/ 6.70">S/ 6.70</del>')
    expect(markup).toContain('<strong aria-label="Precio actual S/ 5.36">S/ 5.36</strong>')
  })

  it('muestra un solo precio cuando no existe descuento vigente', () => {
    const markup = renderToStaticMarkup(<OfferPrice regularPrice={6.7} price={6.7}/>)
    expect(markup).not.toContain('<del')
    expect(markup).toContain('S/ 6.70')
  })
})
