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
  uploadPhoto: file => request('/product-photos',{method:'POST',headers:{'Content-Type':file.type},body:file}),
  customers: (signal) => request('/customers', { signal }),
  customerAccount: (signal) => request('/customer-account', { signal }),
  preferences: (signal) => request('/preferences', { signal }),
  savePreferences: (data) => request('/preferences', { method:'PUT',body:JSON.stringify(data) }),
  orders: () => request('/purchase-orders'),
  createOrder: data => request('/purchase-orders',{method:'POST',body:JSON.stringify(data)}),
  registerDirectPurchase: data => request('/purchase-orders/direct',{method:'POST',body:JSON.stringify(data)}),
  cancelOrder: id => request('/purchase-orders/'+id+'/cancel',{method:'POST'}),
  receiveOrder: (id,data) => request('/purchase-orders/'+id+'/receipts',{method:'POST',body:JSON.stringify(data)}),
  reservations: () => request('/reservations'),
  requestReservation: data => request('/reservations',{method:'POST',body:JSON.stringify(data)}),
  changeReservation: (id,data) => request('/reservations/'+id,{method:'POST',body:JSON.stringify(data)}),
  profile: (token, signal) => request('/auth/me', { token, signal }),
  products: () => request('/products'),
  inventory: (signal) => request('/inventory', { signal }),
  createProduct: async (product) => {
    const created = await request('/inventory/products', { method: 'POST', body: JSON.stringify(product) })
    if (!created?.id) throw new TypeError('No se recibió la confirmación del producto')
    return created
  },
  updateProduct: (id, product) => request('/inventory/products/' + id, { method: 'PUT', body: JSON.stringify(product) }),
  productHistory: (id, signal) => request('/inventory/products/' + id + '/history', { signal }),
  adjustInventory: (id, adjustment) => request('/inventory/products/' + id + '/adjustments', { method: 'POST', body: JSON.stringify(adjustment) }),
  dashboard: (period = 'week', signal) => request('/dashboard?period=' + encodeURIComponent(period), { signal }),
  customerSales: (signal) => request('/customer-sales', { signal }),
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
