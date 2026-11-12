import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateSaleTotal, saleResponse, validateSaleInput } from '../src/services/saleService.js'

test('calculates the sale total from quantity and snapshot price', () => {
  assert.equal(calculateSaleTotal([{ quantity: 2, unitPrice: 4.5 }, { quantity: 1, unitPrice: 8.9 }]), 17.9)
})

test('returns the exact database creation time', () => {
  const createdAt = new Date('2026-08-28T01:22:08.000Z')
  assert.deepEqual(saleResponse(185, 4.8, createdAt), { id: 185, total: 4.8, createdAt })
})

test('rejects unsupported payment methods', () => {
  assert.throws(() => validateSaleInput({ userId: 1, paymentMethod: 'tarjeta', items: [{ productId: 1, quantity: 1 }] }), /método de pago/i)
})

test('rejects empty sales', () => {
  assert.throws(() => validateSaleInput({ userId: 1, paymentMethod: 'efectivo', items: [] }), /producto/i)
})
