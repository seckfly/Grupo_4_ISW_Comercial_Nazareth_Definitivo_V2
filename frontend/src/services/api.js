import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000/api'

async function request(path, { token, headers, replaySafe = false, ...options } = {}) {
  const { signal } = options
  const reading = !options.method || options.method === 'GET'
  for (let attempt = 0; ; attempt += 1) {
    try {
      signal?.throwIfAborted()
      const session = token ? null : await supabase?.auth.getSession()
      if (session?.error?.name === 'AuthRetryableFetchError') throw new TypeError('No se pudo consultar la sesión')
      const accessToken = token ?? session?.data.session?.access_token
      const response = await fetch(API_URL + path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: 'Bearer ' + accessToken } : {}),
          ...headers,
        },
      })
      if (response.status === 204) return
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw Object.assign(new Error(body?.message || 'No se pudo completar la operación'), { status: response.status })
      }
      return await response.json()
    } catch (error) {
      if (signal?.aborted || error.name === 'AbortError') throw error
      const connectionFailed = error instanceof TypeError || error instanceof SyntaxError || [502, 503, 504].includes(error.status)
      if (!connectionFailed) throw error
      if (attempt === 0 && (reading || replaySafe)) {
        await new Promise(resolve => setTimeout(resolve, 300))
        continue
      }
      const message = reading ? 'No se pudo conectar con el servidor. Intenta de nuevo.'
        : replaySafe ? 'No pudimos confirmar el guardado. Intenta de nuevo con los mismos datos.'
          : 'No pudimos confirmar la operación. Revisa si se guardó antes de repetirla.'
      throw new TypeError(message, { cause: error })
    }
  }
}

export const api = {
  uploadPhoto: file => request('/product-photos',{method:'POST',headers:{'Content-Type':file.type},body:file}),
  customers: (signal) => request('/customers', { signal }),
  customerAccount: (signal) => request('/customer-account', { signal }),
  preferences: (signal) => request('/preferences', { signal }),
  savePreferences: (data) => request('/preferences', { method:'PUT',body:JSON.stringify(data) }),
  orders: () => request('/purchase-orders'),
  registerDirectPurchase: data => request('/purchase-orders/direct',{method:'POST',body:JSON.stringify(data)}),
  cancelOrder: id => request('/purchase-orders/'+id+'/cancel',{method:'POST'}),
  receiveOrder: (id,data) => request('/purchase-orders/'+id+'/receipts',{method:'POST',body:JSON.stringify(data)}),
  reservations: () => request('/reservations'),
  requestReservation: data => request('/reservations',{method:'POST',replaySafe: Boolean(data.requestId), body:JSON.stringify(data)}),
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
  adjustInventory: (id, adjustment) => request('/inventory/products/' + id + '/adjustments', { method: 'POST', replaySafe: Boolean(adjustment.requestId), body: JSON.stringify(adjustment) }),
  dashboard: (period = 'week', signal) => request('/dashboard?period=' + encodeURIComponent(period), { signal }),
  customerSales: (signal) => request('/customer-sales', { signal }),
  createSale: (sale) => request('/sales', { method: 'POST', replaySafe: Boolean(sale.requestId), body: JSON.stringify(sale) }),
  quoteSale: (cart, signal) => request('/sales/quote', { method: 'POST', body: JSON.stringify(cart), signal }),
  sales: (period, signal) => request('/sales?period=' + encodeURIComponent(period), { signal }),
  sale: (id, signal) => request('/sales/' + id, { signal }),
  saleCustomers: (query, signal) => request('/sales/customers?q=' + encodeURIComponent(query), { signal }),
  users: (signal) => request('/users', { signal }),
  createUser: (user) => request('/users', { method: 'POST', body: JSON.stringify(user) }),
  updateUser: (id, user) => request('/users/' + id, { method: 'PUT', body: JSON.stringify(user) }),
  promotions: () => request('/promotions'),
  createPromotion: (promotion) => request('/promotions', { method: 'POST', replaySafe: Boolean(promotion.requestId), body: JSON.stringify(promotion) }),
  updatePromotion: (id, promotion) => request('/promotions/' + id, { method: 'PUT', body: JSON.stringify(promotion) }),
  updatePromotionStatus: (id, status) => request('/promotions/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status }) }),
  deletePromotion: (id) => request('/promotions/' + id, { method: 'DELETE' }),
}
