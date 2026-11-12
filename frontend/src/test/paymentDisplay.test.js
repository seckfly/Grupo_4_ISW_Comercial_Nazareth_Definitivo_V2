import { describe, expect, it } from 'vitest'
import { digitalPaymentGroups, matchesPaymentFilter, paymentFilterGroups, paymentGroupTotal } from '../utils/paymentDisplay.js'

describe('presentación agrupada de pagos digitales', () => {
  it('presenta todas las billeteras en una única categoría sin cambiar los métodos originales', () => {
    expect(digitalPaymentGroups.map(group => [group.value, group.label, group.methods])).toEqual([
      ['digital', 'Pagos digitales', ['yape', 'plin', 'otro_digital']],
    ])
  })

  it('suma Yape, Plin y otras billeteras en centavos exactos', () => {
    expect(paymentGroupTotal({ yape: 10.1, plin: 0.2, otro_digital: 3 }, digitalPaymentGroups[0])).toBe(13.3)
    expect(paymentGroupTotal({ yape: 0.1, plin: 0.2, otro_digital: 0.3 }, digitalPaymentGroups[0])).toBe(0.6)
  })

  it('ofrece solo Todos, Efectivo y Pagos digitales y filtra todas las billeteras juntas', () => {
    expect(paymentFilterGroups.map(group => group.value)).toEqual(['efectivo', 'digital'])
    for (const method of ['yape', 'plin', 'otro_digital']) {
      expect(matchesPaymentFilter(method, 'digital')).toBe(true)
      expect(matchesPaymentFilter(method, 'efectivo')).toBe(false)
      expect(matchesPaymentFilter(method, 'Todos')).toBe(true)
    }
    expect(matchesPaymentFilter('efectivo', 'digital')).toBe(false)
    expect(matchesPaymentFilter('efectivo', 'efectivo')).toBe(true)
    expect(matchesPaymentFilter('unknown', 'digital')).toBe(false)
  })
})
