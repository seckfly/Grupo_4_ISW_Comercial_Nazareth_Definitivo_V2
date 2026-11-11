export const QUANTITY_MAX_UNITS = 9_999_999_999
export const MONEY_MAX_UNITS = 999_999_999_999

export function inputError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode })
}

export function decimalUnits(value, { signed = false, maxUnits = QUANTITY_MAX_UNITS, label = 'El valor' } = {}) {
  if (!['string', 'number'].includes(typeof value)) throw inputError(`${label} no es válido`)
  const text = String(value).trim()
  const pattern = signed ? /^-?(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/ : /^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/
  if (!pattern.test(text)) throw inputError(`${label} debe tener hasta dos decimales`)
  const negative = text.startsWith('-')
  const [whole, fraction = ''] = text.replace(/^-/, '').split('.')
  const units = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(units) || units > maxUnits) throw inputError(`${label} supera el máximo admitido`)
  return negative ? -units : units
}

export function usesWholeQuantity(unit) {
  return ['unidad', 'unidades', 'paquete', 'paquetes'].includes(String(unit ?? '').trim().toLowerCase())
}

export function quantityForUnit(value, unit) {
  const quantity = decimalUnits(value, { label: 'La cantidad' })
  if (usesWholeQuantity(unit) && quantity % 100 !== 0) {
    throw inputError('Ingresa una cantidad entera para ' + unit)
  }
  return quantity
}

export function decimalText(units) {
  const absolute = Math.abs(units)
  return `${units < 0 ? '-' : ''}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`
}

export function positiveId(value) {
  if (!['string', 'number'].includes(typeof value) || !/^[1-9]\d*$/.test(String(value)) || Number(value) > 2147483647) {
    throw inputError('El identificador no es válido')
  }
  return Number(value)
}

export function lineAmount(quantityUnits, priceUnits) {
  const cents = Number((BigInt(quantityUnits) * BigInt(priceUnits) + 50n) / 100n)
  if (!Number.isSafeInteger(cents) || cents > MONEY_MAX_UNITS) throw inputError('El subtotal supera el máximo admitido')
  return cents
}

export function promotionValue(type, value) {
  if (!['fixed', 'percentage'].includes(type)) throw inputError('El tipo de descuento no es válido')
  const units = decimalUnits(value, { label: 'El descuento' })
  if (units <= 0) throw inputError('El descuento debe ser positivo')
  if (type === 'percentage' && units > 10000) throw inputError('El descuento porcentual no puede superar 100%')
  return units
}

export function promotionalPrice(price, type, value) {
  const base = decimalUnits(price, { label: 'El precio' })
  const amount = promotionValue(type, value)
  if (type === 'fixed') return Math.max(0, base - amount) / 100
  return Number((BigInt(base) * BigInt(10000 - amount) + 5000n) / 10000n) / 100
}
