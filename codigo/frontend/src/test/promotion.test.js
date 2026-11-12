import { describe, expect, it } from 'vitest'
import { campaignStatus, createCampaign, deleteCampaign, filterPromotions, mergeCampaignDefaults, promotionPrice, updateCampaign } from '../utils/promotion'

describe('promotion helpers', () => {
  it('calcula un descuento porcentual con dos decimales', () => {
    expect(promotionPrice(7, 'percentage', 15)).toBe(5.95)
  })

  it('calcula un precio promocional fijo', () => {
    expect(promotionPrice(10.9, 'fixed', 2)).toBe(8.9)
  })

  it('clasifica una campaña según su vigencia', () => {
    expect(campaignStatus('2026-08-20', '2026-08-31', '2026-08-26')).toBe('Activa')
    expect(campaignStatus('2026-09-01', '2026-09-07', '2026-08-26')).toBe('Programada')
  })

  it('crea, edita y elimina campañas sin mutar la colección original', () => {
    const original = [{ id: 1, product: 'Inca Kola', status: 'Activa' }]
    const created = createCampaign(original, { product: 'Arroz Costeño', status: 'Programada' })
    const updated = updateCampaign(created, created[1].id, { status: 'Activa' })
    const removed = deleteCampaign(updated, 1)
    expect(original).toHaveLength(1)
    expect(updated[1].status).toBe('Activa')
    expect(removed.map(item => item.product)).toEqual(['Arroz Costeño'])
  })

  it('conserva campañas locales y agrega nuevos valores predeterminados', () => {
    const stored = [{ id: 1, product: 'Editada por admin' }]
    const defaults = [{ id: 1, product: 'Original' }, { id: 2, product: 'Nueva' }]
    expect(mergeCampaignDefaults(stored, defaults)).toEqual([{ id: 1, product: 'Editada por admin' }, { id: 2, product: 'Nueva' }])
  })

  it('filtra promociones por texto y categoría', () => {
    const items = [{ product: 'Inca Kola', category: 'Bebidas' }, { product: 'Arroz Costeño', category: 'Abarrotes' }]
    expect(filterPromotions(items, 'inca', 'Todas')).toEqual([items[0]])
    expect(filterPromotions(items, '', 'Abarrotes')).toEqual([items[1]])
  })
})
