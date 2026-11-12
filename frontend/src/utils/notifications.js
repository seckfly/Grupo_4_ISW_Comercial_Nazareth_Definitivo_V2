const STORAGE_PREFIX = 'nazareth:stock-notifications:read:v1:'

function getStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function normalizeIds(ids) {
  if (!Array.isArray(ids)) return []
  return [...new Set(ids.filter(id => id !== null && id !== undefined).map(String))]
}

function storageKey(scope) {
  return STORAGE_PREFIX + encodeURIComponent(String(scope))
}

export function readStockNotificationIds(scope, storage = getStorage()) {
  if (!scope || !storage) return []
  try {
    return normalizeIds(JSON.parse(storage.getItem(storageKey(scope)) || '[]'))
  } catch {
    return []
  }
}

export function writeStockNotificationIds(scope, ids, storage = getStorage()) {
  if (!scope || !storage) return false
  try {
    storage.setItem(storageKey(scope), JSON.stringify(normalizeIds(ids)))
    return true
  } catch {
    return false
  }
}

export function retainActiveStockNotificationIds(readIds, activeIds) {
  const active = new Set(normalizeIds(activeIds))
  return normalizeIds(readIds).filter(id => active.has(id))
}

export function getUnreadStockNotifications(products, readIds) {
  const read = new Set(normalizeIds(readIds))
  return (Array.isArray(products) ? products : []).filter(product =>
    product?.isActive && product?.lowStock && !read.has(String(product.id))
  )
}
