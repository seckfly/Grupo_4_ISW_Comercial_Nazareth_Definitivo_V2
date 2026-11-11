import { promotionalPrice, promotionValue } from '../../../shared/numbers.mjs'

export const discountedPrice = promotionalPrice

export function validatePromotionInput(input) {
  if (!input?.productId) return { valid: false, message: 'Selecciona un producto' }
  try { promotionValue(input.discountType, input.discountValue) } catch (error) {
    return { valid: false, message: error.message }
  }
  if (!input.startDate || !input.endDate) return { valid: false, message: 'Completa las fechas de la promoción' }
  if (new Date(input.endDate) < new Date(input.startDate)) return { valid: false, message: 'La fecha final debe ser posterior a la fecha inicial' }
  return { valid: true }
}

