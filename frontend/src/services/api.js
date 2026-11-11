import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000/api'

async function request(path, { token, headers, ...options } = {}) {
  const accessToken = token ?? (await supabase?.auth.getSession())?.data.session?.access_token
  const response = await fetch(API_URL + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: 'Bearer ' + accessToken } : {}),
      ...headers,
    },
  })
  if (response.status === 204) return
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw Object.assign(new Error(body?.message || 'No se pudo completar la operación'), { status: response.status })
  }
  return body
}

export const api = {
  profile: (token, signal) => request('/auth/me', { token, signal }),
  products: () => request('/products'),
  inventory: (signal) => request('/inventory', { signal }),
  createProduct: (product) => request('/inventory/products', { method: 'POST', body: JSON.stringify(product) }),
  updateProduct: (id, product) => request('/inventory/products/' + id, { method: 'PUT', body: JSON.stringify(product) }),
  productHistory: (id, signal) => request('/inventory/products/' + id + '/history', { signal }),
  adjustInventory: (id, adjustment) => request('/inventory/products/' + id + '/adjustments', { method: 'POST', body: JSON.stringify(adjustment) }),
  dashboard: () => request('/dashboard'),
  createSale: (sale) => request('/sales', { method: 'POST', body: JSON.stringify(sale) }),
  quoteSale: (cart, signal) => request('/sales/quote', { method: 'POST', body: JSON.stringify(cart), signal }),
  sales: (period, signal) => request('/sales?period=' + encodeURIComponent(period), { signal }),
  sale: (id, signal) => request('/sales/' + id, { signal }),
  saleCustomers: (query, signal) => request('/sales/customers?q=' + encodeURIComponent(query), { signal }),
  users: (signal) => request('/users', { signal }),
  createUser: (user) => request('/users', { method: 'POST', body: JSON.stringify(user) }),
  updateUser: (id, user) => request('/users/' + id, { method: 'PUT', body: JSON.stringify(user) }),
  promotions: () => request('/promotions'),
  createPromotion: (promotion) => request('/promotions', { method: 'POST', body: JSON.stringify(promotion) }),
  updatePromotion: (id, promotion) => request('/promotions/' + id, { method: 'PUT', body: JSON.stringify(promotion) }),
  updatePromotionStatus: (id, status) => request('/promotions/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status }) }),
  deletePromotion: (id) => request('/promotions/' + id, { method: 'DELETE' }),
}
