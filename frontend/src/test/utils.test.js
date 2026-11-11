import { describe, expect, it } from 'vitest'
import { currency, formatStoreDateTime, margin, stockLevel } from '../utils/format.js'

describe('business display utilities', () => {
  it('formats Peruvian Soles', () => expect(currency(12.5)).toBe('S/ 12.50'))
  it('calculates gross margin percentage', () => expect(margin(3, 5)).toBe(40))
  it('marks stock below five as critical', () => expect(stockLevel(4)).toBe('critical'))
  it('formats the live store date and time for Lima', () => {
    expect(formatStoreDateTime(new Date('2026-08-27T20:08:00Z'))).toEqual({
      date: 'Jueves, 27 de agosto',
      time: '3:08 p. m.',
      weekday: 'Jueves',
      shortDate: '27 AGO'
    })
  })
})
