import { describe, expect, it } from 'vitest'
import { visibleNavigation, searchCommands, loyaltyProgress } from '../utils/auth.js'

describe('role access', () => {
  it('limits client navigation to its complete portal', () => expect(visibleNavigation('client')).toEqual(['Resumen', 'Productos', 'Promociones', 'Reservas', 'Mi cuenta']))
  it('searches only commands visible to the role', () => expect(searchCommands('inv', 'admin')[0].page).toBe('Inventario'))
  it('never exposes admin commands to clients', () => expect(searchCommands('ventas', 'client')).toEqual([]))
  it('lets clients find the product catalog', () => expect(searchCommands('producto', 'client')[0].page).toBe('Productos'))
  it('directs the client to the catalog for their shopping list', () => expect(searchCommands('Mi lista', 'client')[0].page).toBe('Productos'))
  it('calculates loyalty progress toward the next reward', () => expect(loyaltyProgress(240, 300)).toEqual({ percent: 80, remaining: 60 }))
})
