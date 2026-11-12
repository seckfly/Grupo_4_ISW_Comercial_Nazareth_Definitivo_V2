import { describe, expect, it } from 'vitest'
import { filterCatalog, toggleCatalogItem, createReservation } from '../utils/catalog.js'

const products = [
  { id: 1, name: 'Arroz Costeño 1 kg', category: 'Abarrotes' },
  { id: 2, name: 'Inca Kola 1.5 L', category: 'Bebidas' },
  { id: 3, name: 'Aceite Primor 900 ml', category: 'Abarrotes' },
]

describe('client catalog', () => {
  it('filters products by search and category', () => {
    expect(filterCatalog(products, 'aceite', 'Abarrotes').map((item) => item.id)).toEqual([3])
    expect(filterCatalog(products, '', 'Bebidas').map((item) => item.id)).toEqual([2])
  })

  it('adds and removes products from the shopping list', () => {
    expect(toggleCatalogItem([1], 2)).toEqual([1, 2])
    expect(toggleCatalogItem([1, 2], 1)).toEqual([2])
  })

  it('creates a reservation with a pickup code and totals', () => {
    const reservation=createReservation([{...products[0],price:4.8},{...products[1],price:7}],'Rosa Castillo')
    expect(reservation).toMatchObject({customer:'Rosa Castillo',items:2,total:11.8,status:'Pendiente de confirmación'})
    expect(reservation.code).toMatch(/^NZ-[A-Z0-9]{4}$/)
  })
})
