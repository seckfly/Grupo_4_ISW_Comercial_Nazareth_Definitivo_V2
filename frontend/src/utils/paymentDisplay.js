import { paymentNames } from '../../../shared/paymentMethods.mjs'

export const digitalPaymentGroups = [
  { value: 'yape_plin', label: 'Yape / Plin', methods: ['yape', 'plin'] },
  { value: 'otro_digital', label: paymentNames.otro_digital, methods: ['otro_digital'] },
]

export const paymentFilterGroups = [
  { value: 'efectivo', label: paymentNames.efectivo, methods: ['efectivo'] },
  ...digitalPaymentGroups,
]

export function paymentGroupTotal(totals, group) {
  return group.methods.reduce((sum, method) => sum + Math.round(Number(totals?.[method] ?? 0) * 100), 0) / 100
}

export function matchesPaymentFilter(paymentMethod, filter) {
  if (filter === 'Todos') return true
  return paymentFilterGroups.find(group => group.value === filter)?.methods.includes(paymentMethod) ?? false
}
