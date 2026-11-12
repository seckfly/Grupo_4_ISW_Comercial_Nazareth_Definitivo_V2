import test from 'node:test'
import assert from 'node:assert/strict'
import { discountedPrice,validatePromotionInput } from '../src/services/promotionService.js'

test('calculates percentage and fixed promotional prices',()=>{
  assert.equal(discountedPrice(10.5,'percentage',15),8.93)
  assert.equal(discountedPrice(10.5,'fixed',2),8.5)
})

test('rejects invalid promotion date ranges',()=>{
  assert.deepEqual(validatePromotionInput({productId:1,discountType:'percentage',discountValue:15,startDate:'2026-09-10',endDate:'2026-09-01'}),{valid:false,message:'La fecha final debe ser posterior a la fecha inicial'})
})

test('accepts a complete promotion',()=>{
  assert.deepEqual(validatePromotionInput({productId:1,discountType:'fixed',discountValue:2,startDate:'2026-09-01',endDate:'2026-09-07'}),{valid:true})
})

test('rejects percentage discounts greater than 100',()=>{
  assert.equal(validatePromotionInput({productId:1,discountType:'percentage',discountValue:120,startDate:'2026-08-20',endDate:'2026-08-31'}).valid,false)
})
