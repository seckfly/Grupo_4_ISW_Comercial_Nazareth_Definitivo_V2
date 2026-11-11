export { promotionalPrice as promotionPrice } from '../../../shared/numbers.mjs'

export function campaignStatus(startsAt, endsAt, today = new Date().toISOString().slice(0, 10)) {
  if (today < startsAt) return 'Programada'
  if (today > endsAt) return 'Finalizada'
  return 'Activa'
}

export function createCampaign(items, data) {
  const id = items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1
  return [...items, { ...data, id }]
}

export function updateCampaign(items, id, changes) {
  return items.map(item => Number(item.id) === Number(id) ? { ...item, ...changes } : item)
}

export function deleteCampaign(items, id) {
  return items.filter(item => Number(item.id) !== Number(id))
}

export function mergeCampaignDefaults(stored, defaults) {
  const ids = new Set(stored.map(item => Number(item.id)))
  return [...stored, ...defaults.filter(item => !ids.has(Number(item.id)))]
}

export function filterPromotions(items, query = '', category = 'Todas') {
  const term = query.trim().toLocaleLowerCase('es')
  return items.filter(item => (category === 'Todas' || item.category === category) && (!term || item.product.toLocaleLowerCase('es').includes(term)))
}
