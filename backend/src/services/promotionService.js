import { promotionalPrice, promotionValue } from '../../../shared/numbers.mjs'

export const discountedPrice = promotionalPrice

export function validatePromotionInput(input) {
  if (!input?.productId) return { valid: false, message: 'Selecciona un producto' }
  if(!Number.isSafeInteger(Number(input.productId))||Number(input.productId)<=0)return {valid:false,message:'Producto no válido'}
  if(input.status&&!['active','scheduled','paused','finished'].includes(input.status))return {valid:false,message:'Estado no válido'}
  try { promotionValue(input.discountType, input.discountValue) } catch (error) {
    return { valid: false, message: error.message }
  }
  if (!input.startDate || !input.endDate) return { valid: false, message: 'Completa las fechas de la promoción' }
  if(!Number.isFinite(Date.parse(input.startDate))||!Number.isFinite(Date.parse(input.endDate)))return {valid:false,message:'Fechas no válidas'}
  if (new Date(input.endDate) < new Date(input.startDate)) return { valid: false, message: 'La fecha final debe ser posterior a la fecha inicial' }
  return { valid: true }
}

