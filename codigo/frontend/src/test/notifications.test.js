import { describe, expect, it } from 'vitest'
import {
  getUnreadStockNotifications,
  readStockNotificationIds,
  retainActiveStockNotificationIds,
  writeStockNotificationIds
} from '../utils/notifications.js'

function createStorage() {
  const values = new Map()
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  }
}

describe('stock notification read state', () => {
  it('persists read notifications separately for each account', () => {
    const storage = createStorage()
    expect(writeStockNotificationIds('admin-a', [12, '15'], storage)).toBe(true)
    expect(readStockNotificationIds('admin-a', storage)).toEqual(['12', '15'])
    expect(readStockNotificationIds('admin-b', storage)).toEqual([])
  })

  it('keeps only read notifications that are still active', () => {
    expect(retainActiveStockNotificationIds(['12', '15', '18'], [12, 18, 20])).toEqual(['12', '18'])
  })

  it('counts only active low-stock products that have not been read', () => {
    const products = [
      { id: 1, isActive: true, lowStock: true },
      { id: 2, isActive: true, lowStock: true },
      { id: 3, isActive: false, lowStock: true },
      { id: 4, isActive: true, lowStock: false }
    ]
    expect(getUnreadStockNotifications(products, ['1'])).toEqual([products[1]])
    expect(getUnreadStockNotifications(products, ['1', '2'])).toEqual([])
  })

  it('recovers safely from malformed stored data and unavailable storage', () => {
    const storage = { getItem: () => '{invalid json', setItem: () => { throw new Error('blocked') } }
    expect(readStockNotificationIds('admin-a', storage)).toEqual([])
    expect(writeStockNotificationIds('admin-a', [1], storage)).toBe(false)
    expect(readStockNotificationIds('', storage)).toEqual([])
  })
})
