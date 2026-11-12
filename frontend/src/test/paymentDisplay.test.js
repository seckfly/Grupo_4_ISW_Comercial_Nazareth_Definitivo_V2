import { describe, expect, it } from 'vitest'
import { digitalPaymentGroups, matchesPaymentFilter, paymentFilterGroups, paymentGroupTotal } from '../utils/paymentDisplay.js'

describe('presentación agrupada de pagos digitales', () => {
  it('presenta Yape y Plin como una sola categoría sin cambiar sus métodos originales', () => {
    expect(digitalPaymentGroups.map(group => [group.value, group.label, group.methods])).toEqual([
      ['yape_plin', 'Yape / Plin', ['yape', 'plin']],
      ['otro_digital', 'Otras billeteras digitales', ['otro_digital']],
    ])
  })

  it('suma Yape y Plin en centavos exactos', () => {
    expect(paymentGroupTotal({ yape: 10.1, plin: 0.2, otro_digital: 3 }, digitalPaymentGroups[0])).toBe(10.3)
    expect(paymentGroupTotal({ yape: 0.1, plin: 0.2 }, digitalPaymentGroups[0])).toBe(0.3)
  })

  it('filtra conjuntamente Yape y Plin y mantiene separados efectivo y otros pagos digitales', () => {
    expect(paymentFilterGroups.map(group => group.value)).toEqual(['efectivo', 'yape_plin', 'otro_digital'])
    expect(matchesPaymentFilter('yape', 'yape_plin')).toBe(true)
    expect(matchesPaymentFilter('plin', 'yape_plin')).toBe(true)
    expect(matchesPaymentFilter('otro_digital', 'yape_plin')).toBe(false)
    expect(matchesPaymentFilter('efectivo', 'yape_plin')).toBe(false)
    expect(matchesPaymentFilter('plin', 'efectivo')).toBe(false)
    expect(matchesPaymentFilter('plin', 'Todos')).toBe(true)
    expect(matchesPaymentFilter('plin', 'invalid')).toBe(false)
  })
})
