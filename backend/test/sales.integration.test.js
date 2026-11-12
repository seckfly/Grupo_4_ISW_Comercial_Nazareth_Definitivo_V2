import test, { before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { setTimeout as delay } from 'node:timers/promises'
import express from 'express'
import { nativePostgres } from '../test-support/nativePostgres.js'
import { createSalesRouter } from '../src/routes/salesRouter.js'
import { createInventoryRouter } from '../src/routes/inventoryRoutes.js'
import { createProduct, adjustInventory,updateProduct,listInventory } from '../src/services/inventoryService.js'
import { createSale, quoteSale } from '../src/services/saleService.js'
import { dashboard } from '../src/services/dashboardService.js'
import { listSales, customerSales } from '../src/services/saleService.js'
import { fullScopeRouter } from '../src/routes/fullScopeRoutes.js'
import { createPromotionRouter } from '../src/routes/promotionRouter.js'
import { Product } from '../src/models/Product.js'
import { customerForUser,preferences,savePreferences } from '../src/services/customerService.js'
import { User } from '../src/models/User.js'
import { removeClientAccess } from '../src/services/userService.js'
import { requestReservation } from '../src/services/reservationService.js'

let postgres, pool, server, base, app
const apiErrors = []
const adminIdentity = '00000000-0000-4000-8000-000000000001'
const clientIdentity = '00000000-0000-4000-8000-000000000002'

async function startApi() {
  server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener))
  })
  base = 'http://127.0.0.1:' + server.address().port
}

before(async () => {
  postgres = await nativePostgres()
  await postgres.admin.query(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY, email text NOT NULL);
    CREATE TABLE auth.sessions (id uuid PRIMARY KEY, user_id uuid, not_after timestamptz)`)
  for (const file of ['001_commercial_schema.sql', '002_express_access.sql', '003_inventory_access.sql', '004_sales.sql', '005_full_scope.sql', '007_product_creation_requests.sql', '008_promotion_creation_requests.sql', '009_archive_and_remove_access.sql', '010_retire_inventory_products.sql', '011_sync_unavailable_product_campaigns.sql', '012_other_digital_payments.sql', '013_loyalty_benefits.sql']) {
    await postgres.admin.query(await readFile(new URL('../../database/migrations/' + file, import.meta.url), 'utf8'))
  }
  pool = await postgres.applicationPool()
  function authenticate(req, res, next) {
    const role = req.get('Authorization')
    if (!['admin-fixture', 'client-fixture','other-fixture'].includes(role)) return res.status(401).json({ message: 'Sesión requerida' })
    req.user = { id: role === 'admin-fixture' ? 1 : role==='other-fixture'?3:2, role: role === 'admin-fixture' ? 'admin' : 'client' }
    next()
  }
  app = express()
  app.use(express.json())
  app.use('/api/sales', createSalesRouter({ db: pool, authenticate }))
  app.use('/api/inventory', createInventoryRouter({ db: pool, authenticate }))
  app.use('/api/promotions', (req, res, next) => {
    if (req.get('x-qa-drop-campaign-response') === 'yes') res.json = () => res.destroy()
    next()
  })
  app.use('/api/promotions',createPromotionRouter({db:pool,authenticate}))
  app.get('/api/products',authenticate,async(_req,res,next)=>{try{res.json(await Product.list(pool))}catch(error){next(error)}})
  app.get('/api/dashboard',authenticate,async(req,res,next)=>{if(req.user.role!=='admin')return res.sendStatus(403);try{res.json(await dashboard(pool,req.query.period||'week'))}catch(error){next(error)}})
  app.get('/api/customer-sales',authenticate,async(req,res)=>{
    if(req.user.role!=='client')return res.sendStatus(403)
    res.json(await customerSales(pool,req.user.id))
  })
  app.use('/api',fullScopeRouter({db:pool,authenticate}))
  app.use((error, _req, res, _next) => {
    apiErrors.push(error)
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'No se pudo completar la operación' })
  })
  await startApi()
})

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve))
  await postgres?.close()
})

beforeEach(async () => {
  apiErrors.length = 0
  // Este cliente pertenece exclusivamente al clúster temporal de nativePostgres().
  await postgres.admin.query(`TRUNCATE nazareth.categories, auth.users, nazareth.promotion_creation_requests RESTART IDENTITY CASCADE;
    INSERT INTO auth.users VALUES ('${adminIdentity}', 'admin@example.test'), ('${clientIdentity}', 'cliente@example.test');
    INSERT INTO nazareth.profiles (auth_user_id, name, role, is_protected) VALUES
      ('${adminIdentity}', 'Administrador QA', 'admin', true), ('${clientIdentity}', 'Cliente Demo', 'client', false);
    INSERT INTO nazareth.customers (user_id, name, phone) VALUES (2, 'Cliente Demo', 'Contacto QA');
    INSERT INTO nazareth.categories (name) VALUES ('Abarrotes')`)
})

async function request(path, { method = 'GET', body, role = 'admin-fixture' } = {}) {
  const response = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', Authorization: role },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  return { status: response.status, body: await response.json() }
}

async function product(changes = {}) {
  return createProduct(pool, { name: 'Producto QA', categoryId: 1, unit: 'Kg', cost: 4, price: '6.70', initialStock: 10, minimum: 5, ...changes }, 1)
}

async function salePayload(id, changes = {}) {
  const payload = { items: [{ productId: id, quantity: '3' }], discount: '0', paymentMethod: 'efectivo', cashReceived: '50.00', requestId: randomUUID(), ...changes }
  const quote = await request('/api/sales/quote', { method: 'POST', body: payload })
  assert.equal(quote.status, 200, JSON.stringify(quote.body))
  return { ...payload, quoteId: quote.body.quoteId }
}

test('Una reserva confirmada vacía Mi lista persistida sin borrar favoritos y conserva la solicitud al reintentar', async () => {
  const item = await product({ name: 'Producto para reserva QA' })
  await savePreferences(pool, 2, { favorites: [item.id], list: [item.id] })
  const payload = { requestId: randomUUID(), items: [{ productId: item.id, quantity: '1' }] }

  const first = await request('/api/reservations', { method: 'POST', role: 'client-fixture', body: payload })
  assert.equal(first.status, 200, JSON.stringify(first.body))
  assert.deepEqual((await request('/api/preferences', { role: 'client-fixture' })).body,
    { favorites: [item.id], list: [] })

  const retry = await request('/api/reservations', { method: 'POST', role: 'client-fixture', body: payload })
  assert.equal(retry.status, 200, JSON.stringify(retry.body))
  assert.equal(retry.body.id, first.body.id)
  assert.deepEqual((await request('/api/preferences', { role: 'client-fixture' })).body,
    { favorites: [item.id], list: [] })

  const history = await request('/api/reservations', { role: 'client-fixture' })
  assert.equal(history.body.length, 1)
  assert.equal(history.body[0].id, first.body.id)
})

test('Reintentar un alta concurrente devuelve el mismo producto y registra una sola entrada', async () => {
  const body = { name: 'Producto QA', categoryId: 1, unit: 'Unidad', cost: 4, price: '6.70',
    initialStock: 10, minimum: 5, requestId: randomUUID() }
  const create = payload => request('/api/inventory/products', { method: 'POST', body: payload })
  const [first, retry] = await Promise.all([create(body), create(body)])
  assert.equal(first.status, 201, JSON.stringify(first.body))
  assert.equal(retry.status, 201, JSON.stringify(retry.body))
  assert.equal(first.body.id, retry.body.id)
  const inventory = await request('/api/inventory')
  assert.equal(inventory.body.products.length, 1)
  assert.equal(inventory.body.products[0].stock, 10)
  const history = await request('/api/inventory/products/' + first.body.id + '/history')
  assert.equal(history.body.movements.length, 1)
  assert.equal((await create({ ...body, name: 'Otro producto' })).status, 409)
})

test('Inventario archiva y da de baja con stock, protege reservas y conserva operaciones', async () => {
  const item = await product({ name: 'Artículo con historial' })
  const empty = await product({ name: 'Alta por error', initialStock: 0 })
  const campaignInput = { productId: item.id, discountType: 'fixed', discountValue: 1,
    startDate: '2020-01-01', endDate: '2090-01-01', status: 'active' }
  const campaign = (await request('/api/promotions', { method: 'POST', body: campaignInput })).body
  const campaignStatus = async () => (await request('/api/promotions')).body.find(row => row.id === campaign.id).status
  const activateCampaign = () => request('/api/promotions/' + campaign.id + '/status', {
    method: 'PATCH', body: { status: 'active' },
  })
  const offers = () => request('/api/promotions', { role: 'client-fixture' })
  assert.equal(await campaignStatus(), 'active')
  const archive = (id, archived, role) => request('/api/inventory/products/' + id + '/archive',
    { method: 'PATCH', body: { archived }, role })
  const remove = (id, confirmation, expectedStock, role) => request('/api/inventory/products/' + id,
    { method: 'DELETE', body: { confirmation, expectedStock }, role })
  assert.equal((await remove(empty.id, 'ELIMINAR', 0, 'client-fixture')).status, 403)
  assert.equal((await remove(empty.id, 'eliminar', 0)).status, 400)
  assert.equal((await remove(item.id, 'ELIMINAR', 8)).status, 409)
  const reservation = await request('/api/reservations', { method: 'POST', role: 'client-fixture',
    body: { requestId: randomUUID(), items: [{ productId: item.id, quantity: 1 }] } })
  assert.equal(reservation.status, 200)
  assert.equal((await archive(item.id, true)).status, 409)
  assert.equal((await remove(item.id, 'ELIMINAR', 10)).status, 409)
  await request('/api/reservations/' + reservation.body.id, { method: 'POST', body: { action: 'cancel' } })
  const archived = await archive(item.id, true)
  assert.equal(archived.status, 200)
  assert.ok(archived.body.archivedAt)
  assert.deepEqual([archived.body.stock, archived.body.available, archived.body.isActive], [10, 0, false])
  assert.ok(!(await Product.list(pool)).some(row => row.id === item.id))
  assert.equal(await campaignStatus(), 'paused')
  assert.equal((await offers()).body.length, 0)
  assert.equal((await activateCampaign()).status, 409)
  assert.equal((await request('/api/promotions', { method: 'POST', body: campaignInput })).status, 409)
  const purchase = await request('/api/purchase-orders/direct', { method: 'POST', body: {
    supplierName: 'Mayorista QA', supplierRuc: 'RUC QA', supplierPhone: 'Teléfono QA',
    reference: 'ARCHIVE-QA', items: [{ productId: item.id, quantity: 1, cost: 4 }],
  } })
  assert.equal(purchase.status, 409)
  const restored = await archive(item.id, false)
  assert.equal(restored.body.archivedAt, null)
  assert.equal(restored.body.isActive, true)
  assert.equal(await campaignStatus(), 'paused')
  assert.equal((await activateCampaign()).status, 200)
  const history = await request('/api/inventory/products/' + item.id + '/history')
  assert.equal(history.body.movements.length, 1)
  const sale = await request('/api/sales', { method: 'POST', body: await salePayload(item.id, { customerId: 1 }) })
  assert.equal(sale.status, 201)
  await savePreferences(pool, 2, { favorites: [item.id], list: [item.id] })
  assert.equal((await archive(item.id, true)).status, 200)
  const archivedReport = await dashboard(pool, 'week')
  assert.equal(archivedReport.demand[0].productId, item.id)
  assert.equal((await remove(item.id, 'ELIMINAR', 10)).status, 409)
  const retirements = await Promise.all([remove(item.id, 'ELIMINAR', 7), remove(item.id, 'ELIMINAR', 7)])
  assert.deepEqual(retirements.map(result => result.status), [200, 200])
  assert.equal((await archive(item.id, false)).status, 409)
  assert.equal(await campaignStatus(), 'finished')
  assert.equal((await activateCampaign()).status, 409)
  for (const period of ['week', 'month']) {
    const report = await dashboard(pool, period)
    assert.deepEqual(report.demand, [])
    assert.equal(report.summary.total, sale.body.total)
    assert.ok(report.movementSummary.some(row => row.productId === item.id && row.type === 'adjustment' && row.quantity === -7))
  }
  assert.ok(!(await Product.list(pool)).some(row => row.id === item.id))
  const after = (await request('/api/inventory/products/' + item.id + '/history')).body
  assert.deepEqual([after.product.stock, after.product.archivedAt, Boolean(after.product.retiredAt)], [0, null, true])
  const exits = after.movements.filter(row => row.reason === 'Baja definitiva del producto')
  assert.deepEqual(exits.map(row => [row.change, row.stockBefore, row.stockAfter, row.createdBy]), [[-7, 7, 0, 1]])
  assert.equal((await request('/api/sales/' + sale.body.id)).body.items[0].name, 'Artículo con historial')
  assert.equal((await request('/api/reservations')).body[0].items[0].name, 'Artículo con historial')
  assert.deepEqual(await preferences(pool, 2), { favorites: [], list: [] })
  assert.equal((await remove(empty.id, 'ELIMINAR', 0)).status, 200)
  assert.equal((await request('/api/inventory/products/' + empty.id + '/history')).body.movements.length, 0)
  assert.ok(!(await listInventory(pool)).products.some(row => [empty.id, item.id].includes(row.id)))
})

test('Eliminar acceso protege administradores, conserva el historial y permite completar un fallo del proveedor', async () => {
  const item = await product()
  const sale = await request('/api/sales', { method: 'POST', body: await salePayload(item.id, { customerId: 1 }) })
  assert.equal(sale.status, 201)
  assert.equal((await request('/api/customers')).body[0].purchases[0].id, sale.body.id)
  const reservation = await request('/api/reservations', { method: 'POST', role: 'client-fixture',
    body: { requestId: randomUUID(), items: [{ productId: item.id, quantity: 1 }] } })
  assert.equal(reservation.status, 200)
  let attempts = 0
  async function deleteIdentity(id) {
    assert.equal(id, clientIdentity)
    attempts += 1
    if (attempts === 1) return { error: { status: 503 } }
    await postgres.admin.query('DELETE FROM auth.users WHERE id = $1', [id])
    return { error: null }
  }
  const remove = (id, confirmation = 'ELIMINAR', actor = 1) => removeClientAccess(pool, actor, id, confirmation, deleteIdentity)
  await assert.rejects(remove(2, 'eliminar'), { statusCode: 400 })
  await assert.rejects(remove(1), { statusCode: 403 })
  await assert.rejects(remove(1, 'ELIMINAR', 3), { statusCode: 403 })
  await assert.rejects(remove(2), { statusCode: 409 })
  assert.equal(attempts, 0)
  await request('/api/reservations/' + reservation.body.id, { method: 'POST', body: { action: 'cancel' } })
  assert.deepEqual(await remove(2), { id: 2, removed: false })
  assert.deepEqual((await User.list(pool)).find(user => user.id === 2).removalPending, true)
  assert.deepEqual((await request('/api/customers')).body, [])
  await assert.rejects(requestReservation(pool, 2, { requestId: randomUUID(), items: [{ productId: item.id, quantity: 1 }] }), { statusCode: 403 })
  assert.deepEqual(await remove(2), { id: 2, removed: true })
  assert.deepEqual(await remove(2), { id: 2, removed: true })
  assert.equal(attempts, 2)
  assert.deepEqual((await User.list(pool)).map(user => user.id), [1])
  assert.deepEqual((await request('/api/customers')).body, [])
  const savedSale = (await request('/api/sales/' + sale.body.id)).body
  assert.equal(savedSale.customerName, 'Cliente Demo')
  const savedReservation = (await request('/api/reservations')).body[0]
  assert.equal(savedReservation.status, 'cancelled')
  assert.equal(savedReservation.customerName, 'Cliente Demo')
})

test('PRU-005/006/008: proveedor, orden sin stock, recepción parcial, exceso, duplicados y anulación',async()=>{
  const p=await product({initialStock:4,minimum:5}),q=await product({name:'Segundo QA'})
  const order=await request('/api/purchase-orders',{method:'POST',body:{supplierName:'Proveedor QA',supplierRuc:'RUC QA',supplierPhone:'Teléfono QA',items:[{productId:p.id,quantity:2,cost:'4.25'},{productId:q.id,quantity:1,cost:3}]}})
  assert.equal(order.status,200,JSON.stringify(order.body));assert.equal(Number(order.body.estimated_total),11.5)
  let orders=(await request('/api/purchase-orders')).body
  assert.equal(orders[0].supplier_name,'Proveedor QA');assert.equal(orders[0].supplier_ruc,'RUC QA');assert.equal(orders[0].supplier_phone,'Teléfono QA')
  assert.equal((await request('/api/inventory')).body.products.find(i=>i.id===p.id).stock,4)
  const equal=await product({name:'Igual al mínimo QA',initialStock:5,minimum:5})
  assert.equal((await request('/api/inventory')).body.products.find(i=>i.id===equal.id).lowStock,true)
  assert.equal((await request('/api/purchase-orders')).body.length,1) // Equality never initiates an order.
  const line=orders[0].items[0]
  const payload={reference:'REF-QA',items:[{itemId:line.id,quantity:1}]}
  assert.equal((await request('/api/purchase-orders/'+order.body.id+'/receipts',{method:'POST',body:payload})).status,200)
  const afterPartial = (await request('/api/inventory')).body.products.find(i=>i.id===p.id)
  assert.deepEqual([afterPartial.stock, afterPartial.cost], [5, 4.05])
  assert.equal((await request('/api/purchase-orders/'+order.body.id+'/receipts',{method:'POST',body:payload})).status,409)
  assert.equal((await request('/api/purchase-orders/'+order.body.id+'/receipts',{method:'POST',body:{reference:'EXCESO',items:[{itemId:line.id,quantity:5}]}})).status,409)
  assert.equal((await request('/api/purchase-orders/'+order.body.id+'/cancel',{method:'POST'})).status,409)
  orders=(await request('/api/purchase-orders')).body;assert.equal(orders[0].status,'pending')
  assert.equal(Number(orders[0].items[0].received_quantity),1)
  const rest=orders[0].items.map(item=>({itemId:item.id,quantity:Number(item.quantity)-Number(item.received_quantity)}))
  assert.equal((await request('/api/purchase-orders/'+order.body.id+'/receipts',{method:'POST',body:{reference:'FINAL',items:rest}})).status,200)
  assert.equal((await request('/api/purchase-orders')).body[0].status,'received')
  assert.equal((await request('/api/purchase-orders',{role:'client-fixture'})).status,403)
})

test('Compra en mayorista registra recepción y stock juntos e impide ingresos duplicados', async () => {
  const item = await product({ name: 'Aceite QA', unit: 'Unidad', initialStock: 4 })
  const payload = {
    supplierName: 'Mayorista QA', supplierRuc: 'RUC QA', supplierPhone: 'Teléfono QA',
    reference: 'COMPRA-QA-001', items: [{ productId: item.id, quantity: 12, cost: '5.00' }],
  }
  const buy = (body, role) => request('/api/purchase-orders/direct', { method: 'POST', body, role })
  assert.equal((await buy(payload, 'client-fixture')).status, 403)
  const results = await Promise.all([buy(payload), buy(payload)])
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409])
  const order = results.find(result => result.status === 200).body
  assert.equal(order.status, 'received')
  assert.equal(Number(order.estimated_total), 60)

  const orders = (await request('/api/purchase-orders')).body
  assert.equal(orders.length, 1)
  assert.equal(Number(orders[0].items[0].received_quantity), 12)
  assert.equal((await request('/api/inventory')).body.products[0].stock, 16)
  const { rows: [entry] } = await postgres.admin.query(`SELECT m.quantity_change, m.stock_before, m.stock_after
    FROM nazareth.inventory_movements m JOIN nazareth.receipts r ON r.id = m.receipt_id WHERE r.reference = $1`, [payload.reference])
  assert.deepEqual([entry.quantity_change, entry.stock_before, entry.stock_after].map(Number), [12, 4, 16])
})

test('Compras actualiza el costo ponderado sin modificar el precio ni el costo de cada compra', async () => {
  const existing = await product({ name: 'Ace QA', cost: 5, price: 8, initialStock: 10 })
  const empty = await product({ name: 'Arroz QA', cost: 5, price: 8, initialStock: 0 })
  const payload = { supplierName: 'Mayorista QA', supplierRuc: 'RUC QA', supplierPhone: 'Teléfono QA' }
  const buy = (reference, items) => request('/api/purchase-orders/direct', {
    method: 'POST', body: { ...payload, reference, items },
  })
  assert.equal((await buy('COSTO-1', [
    { productId: existing.id, quantity: 5, cost: 5.99 },
    { productId: existing.id, quantity: 5, cost: 6.01 },
    { productId: empty.id, quantity: 10, cost: 4 },
  ])).status, 200)
  const inventory = async id => (await request('/api/inventory')).body.products.find(row => row.id === id)
  const amounts = ({ stock, cost, price }) => [stock, cost, price]
  assert.deepEqual(amounts(await inventory(existing.id)), [20, 5.5, 8])
  assert.deepEqual(amounts(await inventory(empty.id)), [10, 4, 8])

  assert.equal((await buy('COSTO-2', [{ productId: existing.id, quantity: 10, cost: 4 }])).status, 200)
  assert.deepEqual(amounts(await inventory(existing.id)), [30, 5, 8])
  const orders = (await request('/api/purchase-orders')).body
  assert.deepEqual(orders[0].items.map(item => Number(item.unit_cost)), [4])
  assert.deepEqual(orders[1].items.map(item => Number(item.unit_cost)), [5.99, 6.01, 4])

  await updateProduct(pool, existing.id, { name: 'Ace actualizado', categoryId: 1, unit: 'Kg', price: 8, minimum: 5 })
  assert.deepEqual(amounts(await inventory(existing.id)), [30, 5, 8])
})

test('Una compra directa con fallo en la segunda entrada revierte toda la operación', async () => {
  const first = await product({ name: 'Aceite QA', initialStock: 4 })
  const second = await product({ name: 'Arroz QA', initialStock: '99999999.99' })
  const result = await request('/api/purchase-orders/direct', { method: 'POST', body: {
    supplierName: 'Mayorista QA', supplierRuc: 'RUC QA', supplierPhone: 'Teléfono QA',
    reference: 'COMPRA-ROLLBACK-QA',
    items: [{ productId: first.id, quantity: 2, cost: 5 }, { productId: second.id, quantity: 1, cost: 5 }],
  } })
  assert.ok(result.status >= 400)
  assert.equal((await request('/api/purchase-orders')).body.length, 0)
  const { rows: [counts] } = await postgres.admin.query(`SELECT
    (SELECT COUNT(*) FROM nazareth.receipts)::int AS receipts,
    (SELECT COUNT(*) FROM nazareth.inventory_movements WHERE receipt_id IS NOT NULL)::int AS entries`)
  assert.deepEqual(counts, { receipts: 0, entries: 0 })
  assert.equal((await request('/api/inventory')).body.products.find(row => row.id === first.id).stock, 4)
})

test('PRU-010: campañas CRUD persistidas y mismo precio promocional en catálogo y venta',async()=>{
  const p=await product()
  const input={productId:p.id,discountType:'percentage',discountValue:10,startDate:'2020-01-01',endDate:'2090-01-01',status:'active'}
  const result=await request('/api/promotions',{method:'POST',body:input});assert.equal(result.status,200)
  let products=await Product.list(pool);assert.equal(products[0].sale_price,6.03)
  assert.equal((await quoteSale(pool,{items:[{productId:p.id,quantity:1}]})).total,6.03)
  assert.equal((await request('/api/promotions/'+result.body.id,{method:'PUT',body:{...input,discountType:'fixed',discountValue:1.25}})).status,200)
  assert.equal((await Product.list(pool))[0].sale_price,5.45)
  assert.equal((await request('/api/promotions/'+result.body.id+'/status',{method:'PATCH',body:{status:'paused'}})).status,200)
  assert.equal((await Product.list(pool))[0].sale_price,6.7)
  assert.equal((await request('/api/promotions/'+result.body.id+'/status',{method:'PATCH',body:{status:'active'}})).status,200)
  assert.equal((await request('/api/promotions/'+result.body.id,{method:'DELETE'})).status,200)
  assert.equal((await request('/api/promotions')).body.length,0)
  assert.equal((await request('/api/promotions',{method:'POST',role:'client-fixture',body:input})).status,403)
})

test('La migración de campañas se puede reaplicar y restringe las solicitudes a Express', async () => {
  const migration = await readFile(new URL('../../database/migrations/008_promotion_creation_requests.sql', import.meta.url), 'utf8')
  await postgres.admin.query(migration)
  const { rows: [permissions] } = await postgres.admin.query(`SELECT relrowsecurity AS rls,
    has_table_privilege('nazareth_app', oid, 'SELECT') AS backend_read,
    has_table_privilege('nazareth_app', oid, 'INSERT') AS backend_insert,
    has_table_privilege('nazareth_app', oid, 'UPDATE,DELETE') AS backend_modify,
    has_table_privilege('anon', oid, 'SELECT,INSERT') AS anon_access,
    has_table_privilege('authenticated', oid, 'SELECT,INSERT') AS authenticated_access
    FROM pg_class WHERE oid = 'nazareth.promotion_creation_requests'::regclass`)
  assert.deepEqual(permissions, { rls: true, backend_read: true, backend_insert: true,
    backend_modify: false, anon_access: false, authenticated_access: false })
})

test('Una respuesta perdida después de guardar una campaña se recupera sin duplicados', async () => {
  const p = await product({ price: 10.4 })
  const body = { productId: p.id, discountType: 'fixed', discountValue: 2, status: 'active',
    startDate: '2020-01-01', endDate: '2090-01-01', requestId: randomUUID() }
  await assert.rejects(fetch(base + '/api/promotions', { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'admin-fixture', 'x-qa-drop-campaign-response': 'yes' },
    body: JSON.stringify(body),
  }))
  const saved = (await request('/api/promotions')).body
  assert.equal(saved.length, 1)
  const replay = await request('/api/promotions', { method: 'POST', body })
  assert.equal(replay.status, 200)
  assert.equal(replay.body.id, saved[0].id)
  assert.equal((await request('/api/promotions', { method: 'POST', body: { ...body, discountValue: 3 } })).status, 409)

  const catalog = (await request('/api/products', { role: 'client-fixture' })).body
  assert.equal(catalog[0].sale_price, 8.4)
  assert.equal(Number(catalog[0].regular_price), 10.4)
  const weaker = await request('/api/promotions', { method: 'POST', body: { ...body, requestId: randomUUID(), discountValue: 1 } })
  assert.equal(weaker.status, 200)
  const offers = () => request('/api/promotions', { role: 'client-fixture' })
  assert.deepEqual((await offers()).body.map(offer => [offer.regularPrice, offer.currentPrice]), [[10.4, 8.4]])

  const reservation = { requestId: randomUUID(), expectedTotal: '8.40', items: [{ productId: p.id, quantity: 1, expectedUnitPrice: '8.40' }] }
  const separate = payload => request('/api/reservations', { method: 'POST', body: payload, role: 'client-fixture' })
  const reserved = await separate(reservation)
  assert.equal(reserved.status, 200)
  assert.equal(Number(reserved.body.estimated_total), 8.4)

  for (const id of [replay.body.id, weaker.body.id]) {
    assert.equal((await request('/api/promotions/' + id + '/status', { method: 'PATCH', body: { status: 'paused' } })).status, 200)
  }
  assert.equal((await offers()).body.length, 0)
  assert.equal((await request('/api/products', { role: 'client-fixture' })).body[0].sale_price, 10.4)
  const stale = { ...reservation, requestId: randomUUID() }
  const changed = await separate(stale)
  assert.equal(changed.status, 409)
  assert.match(changed.body.message, /precios cambiaron/)
  assert.equal((await request('/api/reservations', { role: 'client-fixture' })).body.length, 1)
  assert.equal((await separate({ ...stale, expectedTotal: '10.40' })).status, 409)
  const repriced = await separate({ ...stale, expectedTotal: '10.40',
    items: [{ ...stale.items[0], expectedUnitPrice: '10.40' }] })
  assert.equal(repriced.status, 200)
  assert.equal(Number(repriced.body.estimated_total), 10.4)
  assert.equal(Number((await separate(reservation)).body.estimated_total), 8.4)
})

test('PRU-004/012/015: cada cliente acumula puntos por sus ventas completadas',async()=>{
  const p=await product({price:'13.75'})
  assert.equal((await request('/api/customer-account',{role:'client-fixture'})).body.points,0)
  const linked=await request('/api/sales',{method:'POST',body:await salePayload(p.id,{customerId:1,discount:'0.25'})})
  const anonymous=await request('/api/sales',{method:'POST',body:await salePayload(p.id)})
  assert.equal(linked.status,201);assert.equal(anonymous.status,201)
  assert.equal(anonymous.body.customerId,null)
  const purchases=await request('/api/customer-sales',{role:'client-fixture'})
  assert.deepEqual(purchases.body.map(s=>s.id),[linked.body.id])
  assert.equal(linked.body.total,41)
  const account=await request('/api/customer-account',{role:'client-fixture'})
  assert.equal(account.body.points,41)
  const clients=(await request('/api/customers')).body
  assert.equal(clients[0].points,41)
  assert.equal(clients[0].visits,1);assert.equal(clients[0].purchases[0].id,linked.body.id)
  const report=await dashboard(pool,'week');assert.equal(report.today.total,82.25);assert.equal(report.activity.filter(a=>a.kind==='sale').length,2)
  assert.equal((await request('/api/inventory')).body.products[0].stock,4)
  const otherIdentity=randomUUID()
  await postgres.admin.query(`INSERT INTO auth.users VALUES($1,'otra@example.test');`,[otherIdentity])
  await postgres.admin.query(`INSERT INTO nazareth.profiles(auth_user_id,name,role) VALUES($1,'Cuenta ajena QA','client')`,[otherIdentity])
  await postgres.admin.query(`INSERT INTO nazareth.customers(user_id,name,points) VALUES(3,'Cuenta ajena QA',99)`)
  assert.equal((await request('/api/sales',{method:'POST',body:await salePayload(p.id,{items:[{productId:p.id,quantity:1}],customerId:2})})).status,201)
  assert.deepEqual((await request('/api/customer-sales',{role:'client-fixture'})).body.map(sale=>sale.id),[linked.body.id])
  const other=await request('/api/customer-sales',{role:'other-fixture'})
  assert.equal(other.body.length,1);assert.equal(other.body[0].customerId,2)
  assert.equal((await request('/api/customer-account?userId=3',{role:'client-fixture'})).body.points,41)
  assert.equal((await request('/api/customer-account',{role:'other-fixture'})).body.points,112)
})

test('PRU-007: favoritos y lista persistidos y aislados por cuenta',async()=>{
  const p=await product()
  await savePreferences(pool,2,{favorites:[p.id],list:[p.id]})
  assert.deepEqual(await preferences(pool,2),{favorites:[p.id],list:[p.id]})
  assert.equal((await request('/api/preferences',{role:'admin-fixture'})).status,403)
})

test('PRU-021/022: diez ventas y diez consultas por operación bajo los umbrales locales',async()=>{
  const p=await product({initialStock:100}),saleTimes=[],queries={products:[],stock:[],summary:[]}
  for(let index=0;index<10;index++) {
    const payload=await salePayload(p.id,{items:[{productId:p.id,quantity:1}]})
    const start=performance.now(),result=await request('/api/sales',{method:'POST',body:payload})
    saleTimes.push(performance.now()-start);assert.equal(result.status,201)
    for(const [name,path] of [['products','/api/products'],['stock','/api/inventory'],['summary','/api/dashboard?period=week']]) {
      const start=performance.now();const result=await request(path);queries[name].push(performance.now()-start);assert.equal(result.status,200)
    }
  }
  assert.ok(saleTimes.every(time=>time<15000))
  for(const times of Object.values(queries))assert.ok(times.every(time=>time<=3000))
  console.log('PERFORMANCE_QA '+JSON.stringify({sales:10,queriesEach:10,maxSaleMs:Math.ceil(Math.max(...saleTimes)),maxQueryMs:Object.fromEntries(Object.entries(queries).map(([name,times])=>[name,Math.ceil(Math.max(...times))]))}))
})

test('PRU-023: pg_dump y pg_restore recuperan ventas, detalle y movimientos en otra base aislada',async t=>{
  const dump=process.env.TEST_PG_DUMP||'C:/Program Files/PostgreSQL/18/bin/pg_dump.exe'
  const restore=process.env.TEST_PG_RESTORE||'C:/Program Files/PostgreSQL/18/bin/pg_restore.exe'
  if(!existsSync(dump)||!existsSync(restore)){t.skip('Configura TEST_PG_DUMP y TEST_PG_RESTORE de PostgreSQL 18');return}
  const p=await product()
  assert.equal((await request('/api/sales',{method:'POST',body:await salePayload(p.id,{customerId:1})})).status,201)
  const restored=await postgres.roundTripBackup({dump,restore})
  try {
    for(const table of ['sales','sale_items','inventory_movements','products','customers']) {
      const sql='SELECT * FROM nazareth.'+table+' ORDER BY id'
      assert.deepEqual((await restored.query(sql)).rows,(await postgres.admin.query(sql)).rows)
    }
  } finally {await restored.end()}
})

test('Productos con y sin foto, reemplazo y retirada conservan stock e historial',async()=>{
  const p=await product()
  assert.equal(p.imageUrl,null)
  const url='https://project.supabase.co/storage/v1/object/public/product-photos/1/test.png'
  const input={name:p.name,categoryId:p.categoryId,unit:p.unit,cost:p.cost,price:p.price,minimum:p.minimum,isActive:true,imageUrl:url}
  let updated=await updateProduct(pool,p.id,input)
  assert.equal(updated.imageUrl,url);assert.equal(updated.stock,10)
  const replaced=url.replace('test.png','next.png')
  assert.equal((await updateProduct(pool,p.id,{...input,imageUrl:replaced})).imageUrl,replaced)
  updated=await updateProduct(pool,p.id,{...input,imageUrl:null});assert.equal(updated.imageUrl,null)
  const next=await product({name:'Con foto QA',imageUrl:url})
  assert.equal(next.imageUrl,url)
})

test('PRU-011: solicitud hasta tres productos, 24 horas, código e idempotencia sin bloqueo ni caja',async()=>{
  const p=await product({initialStock:3})
  const before=await dashboard(pool,'today')
  const payload={requestId:randomUUID(),items:[{productId:p.id,quantity:'2.25'}]}
  const first=await request('/api/reservations',{role:'client-fixture',method:'POST',body:payload})
  assert.equal(first.status,200,JSON.stringify(first.body))
  const second=await request('/api/reservations',{role:'client-fixture',method:'POST',body:payload})
  assert.equal(first.body.id,second.body.id);assert.match(first.body.pickup_code,/^NZ-/)
  assert.equal(new Date(first.body.pickup_deadline)-new Date(first.body.created_at),24*60*60*1000)
  assert.equal(Number(first.body.estimated_total),15.08)
  assert.equal((await Product.list(pool))[0].current_stock,3)
  assert.equal((await dashboard(pool,'today')).today.total,before.today.total)
  assert.equal((await request('/api/reservations',{role:'client-fixture'})).body[0].status,'pending')
  assert.equal((await request('/api/reservations',{method:'POST',role:'client-fixture',body:{...payload,requestId:randomUUID(),items:Array(4).fill({productId:p.id,quantity:1})}})).status,400)
  let attempts=0
  const collision=await requestReservation(pool,2,{...payload,requestId:randomUUID()},()=>attempts++===0?first.body.pickup_code:'NZ-NEW-CODE-QA')
  assert.equal(collision.pickup_code,'NZ-NEW-CODE-QA')
})

test('Separación rechaza fracciones de un producto vendido por unidad', async () => {
  const item = await product({ unit: 'Unidad', initialStock: 3 })
  const makeRequest = quantity => request('/api/reservations', {
    role: 'client-fixture', method: 'POST',
    body: { requestId: randomUUID(), items: [{ productId: item.id, quantity }] },
  })
  const invalid = await makeRequest('1.08')
  assert.equal(invalid.status, 400)
  assert.match(JSON.stringify(invalid.body), /cantidad entera/)
  assert.equal((await request('/api/reservations', { role: 'client-fixture' })).body.length, 0)
  assert.equal((await makeRequest('2')).status, 200)
})

test('Apartado: últimas unidades frente a venta concurrente; cancelación, vencimiento y ajuste',async()=>{
  const p=await product({initialStock:3,minimum:1})
  const requested=await request('/api/reservations',{role:'client-fixture',method:'POST',body:{requestId:randomUUID(),items:[{productId:p.id,quantity:3}]}})
  const payload=await salePayload(p.id)
  const results=await Promise.all([
    request('/api/reservations/'+requested.body.id,{method:'POST',body:{action:'confirm'}}),
    request('/api/sales',{method:'POST',body:payload})
  ])
  assert.equal(results.filter(result=>[200,201].includes(result.status)).length,1,JSON.stringify(results))
  assert.equal(results.filter(result=>result.status===409).length,1)
  if(results[0].status===200) {
    const product=(await request('/api/inventory')).body.products[0]
    assert.equal(product.stock,3);assert.equal(product.held,3);assert.equal(product.available,0)
    assert.equal(product.lowStock,false) // Alert criterion is physical stock, not holds.
    assert.equal((await Product.list(pool))[0].current_stock,0)
    await assert.rejects(adjustInventory(pool,p.id,{change:-1,reason:'No quitar apartados',requestId:randomUUID()},1),/apartadas/)
    assert.equal((await request('/api/reservations/'+requested.body.id,{role:'client-fixture',method:'POST',body:{action:'cancel'}})).status,200)
    assert.equal((await Product.list(pool))[0].current_stock,3)
    const next=await request('/api/reservations',{role:'client-fixture',method:'POST',body:{requestId:randomUUID(),items:[{productId:p.id,quantity:3}]}})
    assert.equal((await request('/api/reservations/'+next.body.id,{method:'POST',body:{action:'confirm'}})).status,200)
    await postgres.admin.query(`UPDATE nazareth.reservations SET created_at=now()-interval '25 hours',pickup_deadline=now()-interval '1 hour' WHERE id=$1`,[next.body.id])
    assert.equal((await Product.list(pool))[0].current_stock,3)
    assert.equal((await request('/api/reservations',{role:'client-fixture'})).body.find(row=>row.id===next.body.id).status,'expired')
  }
})

test('Recojo: venta vinculada y cierre conjuntos, reintentos y conexiones simultáneas descuentan una vez',async()=>{
  const p=await product({initialStock:3})
  const requested=await request('/api/reservations',{role:'client-fixture',method:'POST',body:{requestId:randomUUID(),items:[{productId:p.id,quantity:3}]}})
  assert.equal((await request('/api/reservations/'+requested.body.id,{method:'POST',body:{action:'confirm'}})).status,200)
  assert.equal((await request('/api/customer-account',{role:'client-fixture'})).body.points,0)
  const payload=await salePayload(p.id,{reservationId:requested.body.id,customerId:1})
  await postgres.admin.query(`CREATE FUNCTION nazareth.fail_pickup_qa() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status='collected' THEN RAISE EXCEPTION 'Fallo QA aislado'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER fail_pickup_qa BEFORE UPDATE ON nazareth.reservations FOR EACH ROW EXECUTE FUNCTION nazareth.fail_pickup_qa()`)
  try {
    assert.equal((await request('/api/sales',{method:'POST',body:payload})).status,500)
    assert.equal((await request('/api/inventory')).body.products[0].stock,3)
    assert.equal((await request('/api/reservations',{role:'client-fixture'})).body[0].status,'confirmed')
    assert.equal((await pool.query('SELECT count(*)::int AS count FROM nazareth.sales')).rows[0].count,0)
  } finally {await postgres.admin.query('DROP TRIGGER fail_pickup_qa ON nazareth.reservations;DROP FUNCTION nazareth.fail_pickup_qa()')}
  const results=await Promise.all([request('/api/sales',{method:'POST',body:payload}),request('/api/sales',{method:'POST',body:payload})])
  assert.ok(results.every(result=>[200,201].includes(result.status)),JSON.stringify(results))
  assert.equal(results[0].body.id,results[1].body.id)
  const inventory=(await request('/api/inventory')).body.products[0]
  assert.equal(inventory.stock,0);assert.equal(inventory.held,0)
  assert.equal((await request('/api/reservations',{role:'client-fixture'})).body[0].status,'collected')
  assert.equal((await request('/api/customer-sales',{role:'client-fixture'})).body.length,1)
  assert.equal((await request('/api/customer-account',{role:'client-fixture'})).body.points,20)
  const history=await request('/api/inventory/products/'+p.id+'/history')
  assert.equal(history.body.movements.filter(row=>row.type==='sale').length,1)
  assert.equal((await request('/api/sales',{method:'POST',body:{...payload,requestId:randomUUID()}})).status,409)
})

test('Apartado: cancelación y vencimiento liberan unidades sin alterar stock físico; rechazo y edición',async()=>{
  const p=await product({initialStock:3})
  async function reservation(){return (await request('/api/reservations',{role:'client-fixture',method:'POST',body:{requestId:randomUUID(),items:[{productId:p.id,quantity:3}]}})).body}
  const first=await reservation()
  assert.equal((await request('/api/reservations/'+first.id,{method:'POST',body:{action:'confirm'}})).status,200)
  assert.equal((await Product.list(pool))[0].current_stock,0)
  assert.equal((await request('/api/reservations/'+first.id,{role:'client-fixture',method:'POST',body:{action:'cancel'}})).status,200)
  assert.equal((await Product.list(pool))[0].current_stock,3)
  const next=await reservation()
  await request('/api/reservations/'+next.id,{method:'POST',body:{action:'confirm'}})
  await postgres.admin.query(`UPDATE nazareth.reservations SET created_at=now()-interval '25 hours',pickup_deadline=now()-interval '1 hour' WHERE id=$1`,[next.id])
  assert.equal((await Product.list(pool))[0].current_stock,3)
  assert.equal((await request('/api/reservations/'+next.id,{method:'POST',body:{action:'confirm'}})).status,409)
  const third=await reservation()
  assert.equal((await request('/api/reservations/'+third.id,{method:'POST',body:{action:'edit',items:[{productId:p.id,quantity:1}]}})).status,200)
  assert.equal((await request('/api/reservations/'+third.id,{method:'POST',body:{action:'reject'}})).status,200)
  assert.equal((await request('/api/inventory')).body.products[0].stock,3)
})

test('Resumen y Reportes: vacío, venta real, Lima, caja neta, demanda, actividad y alerta por ajuste', async () => {
  let report = await dashboard(pool, 'week')
  assert.equal(report.today.total, 0)
  assert.equal(report.today.saleCount, 0)
  assert.deepEqual(report.demand, [])
  assert.deepEqual(report.lowStock, [])
  assert.equal(report.projection, null)
  const item = await product({ minimum: 7 })
  const result = await request('/api/sales', { method: 'POST', body: await salePayload(item.id, { customerId: 1 }) })
  assert.equal(result.status, 201, JSON.stringify(result.body))
  report = await dashboard(pool, 'week')
  assert.equal(report.today.total, 20.1)
  assert.equal(report.today.paymentTotals.efectivo, 20.1)
  assert.equal(report.today.total, (await listSales(pool, 'today')).summary.total)
  assert.equal(report.demand[0].sold, 3)
  assert.equal(report.demand[0].unit, 'Kg')
  assert.equal(report.lowStock[0].stock, 7)
  assert.ok(report.activity.some(activity => activity.kind === 'sale' && activity.id === result.body.id))
  assert.equal((await customerSales(pool, 2)).length, 1)
  assert.equal((await customerSales(pool, 1)).length, 0)
  await adjustInventory(pool,item.id,{ change: '1', reason: 'Cruce superior QA', requestId: randomUUID() },1)
  assert.equal((await dashboard(pool,'week')).lowStock.length,0)
  await adjustInventory(pool,item.id,{ change: '-1', reason: 'Cruce inferior QA', requestId: randomUUID() },1)
  report = await dashboard(pool,'week')
  assert.equal(report.lowStock.length,1)
  assert.ok(report.activity.some(activity => activity.kind === 'movement' && activity.change === -1))
  assert.equal(report.movementSummary.find(row=>row.type==='sale').quantity,-3)
  assert.equal(report.movementSummary.find(row=>row.type==='adjustment').operations,2)
  await postgres.admin.query(`UPDATE nazareth.sales SET created_at = ((now() AT TIME ZONE 'America/Lima')::date AT TIME ZONE 'America/Lima') - interval '1 second'`)
  report = await dashboard(pool,'week')
  assert.equal(report.today.total,0)
  assert.equal(report.today.saleCount,0)
  assert.equal(report.trend.at(-1).v,0)
  assert.equal(report.trend.at(-2).v,20.1)
})

test('Ventas de ayer incluye solo el día anterior completo en Lima', async () => {
  await postgres.admin.query(`INSERT INTO nazareth.sales (user_id,total_amount,payment_method,created_at)
    SELECT 1, amount, method, (date_trunc('day', now() AT TIME ZONE 'America/Lima') + offset_from_today) AT TIME ZONE 'America/Lima'
    FROM (VALUES
      (10, 'efectivo', interval '-1 day'),
      (20, 'yape', interval '-1 second'),
      (50, 'efectivo', interval '-1 day -1 second'),
      (60, 'plin', interval '0 seconds')
    ) AS fixture(amount, method, offset_from_today)`)
  const result = await request('/api/sales?period=yesterday')
  assert.equal(result.status, 200, JSON.stringify(result.body))
  assert.deepEqual(result.body.sales.map(sale => Number(sale.total)), [20, 10])
  assert.deepEqual(result.body.summary, { total: 30, cashTotal: 10, digitalTotal: 20, saleCount: 2 })
})

test('Resumen: proyección y comparación requieren siete días de historial comparable', async () => {
  await postgres.admin.query(`INSERT INTO nazareth.sales (user_id,total_amount,payment_method,created_at)
    SELECT 1,100,'efectivo',(((now() AT TIME ZONE 'America/Lima')::date - day) + time '00:00:00') AT TIME ZONE 'America/Lima'
    FROM generate_series(1,7) AS day`)
  const item = await product()
  const result = await request('/api/sales',{method:'POST',body:await salePayload(item.id)})
  assert.equal(result.status,201,JSON.stringify(result.body))
  const report = await dashboard(pool,'week')
  assert.equal(report.projection,20.1)
  assert.equal(report.comparison,-79.9)
  assert.equal(report.strongestHour,'00')
})

test('PRU-001: venta, detalle, salida y stock confirman juntos; persisten al reiniciar la API', async () => {
  const item = await product()
  const result = await request('/api/sales', { method: 'POST', body: await salePayload(item.id) })
  assert.equal(result.status, 201, JSON.stringify(result.body))
  assert.equal(result.body.total, 20.1)
  const inventory = await request('/api/inventory')
  assert.equal(inventory.body.products[0].stock, 7)
  const history = await request('/api/inventory/products/' + item.id + '/history')
  assert.deepEqual(history.body.movements.filter((movement) => movement.type === 'sale').map((movement) => [movement.stockBefore, movement.stockAfter, movement.change]), [[10, 7, -3]])
  assert.equal(result.body.items[0].quantity, 3)
  await new Promise((resolve) => server.close(resolve))
  await startApi()
  const saved = await request('/api/sales/' + result.body.id)
  assert.equal(saved.body.total, 20.1)
  const listed = await request('/api/sales?period=today')
  assert.equal(listed.body.sales[0].id, result.body.id)
  assert.equal(listed.body.summary.total, 20.1)
})

test('PRU-001: un fallo después de escribir revierte cabecera, detalle, movimiento y stock', async () => {
  const item = await product()
  const payload = await salePayload(item.id)
  const beforeHistory = (await request('/api/inventory/products/' + item.id + '/history')).body
  await postgres.admin.query(`CREATE FUNCTION nazareth.fail_sale_test() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.type = 'sale' THEN
        IF (SELECT current_stock FROM nazareth.products WHERE id = NEW.product_id) <> 7 THEN
          RAISE EXCEPTION 'Fallo antes de escribir stock' USING ERRCODE = 'ZX012';
        END IF;
        RAISE EXCEPTION 'Fallo de guardado aislado' USING ERRCODE = 'ZX011';
      END IF;
      RETURN NEW;
    END;
    $$;
    CREATE TRIGGER fail_sale_test BEFORE INSERT ON nazareth.inventory_movements FOR EACH ROW EXECUTE FUNCTION nazareth.fail_sale_test()`)
  try {
    assert.equal((await request('/api/sales', { method: 'POST', body: payload })).status, 500)
    assert.equal(apiErrors.at(-1).code, 'ZX011')
    assert.equal((await pool.query('SELECT count(*)::int AS count FROM nazareth.sales')).rows[0].count, 0)
    assert.equal((await pool.query('SELECT count(*)::int AS count FROM nazareth.sale_items')).rows[0].count, 0)
    assert.deepEqual((await request('/api/inventory/products/' + item.id + '/history')).body, beforeHistory)
  } finally {
    await postgres.admin.query('DROP TRIGGER fail_sale_test ON nazareth.inventory_movements; DROP FUNCTION nazareth.fail_sale_test()')
  }
})

test('PRU-003: precio del servidor, total 20,10 y vuelto 29,90; descuento y centavos exactos', async () => {
  const item = await product()
  const payload = await salePayload(item.id, { items: [{ productId: item.id, quantity: 3, unitPrice: 0.01 }] })
  const result = await request('/api/sales', { method: 'POST', body: payload })
  assert.equal(result.status, 201)
  assert.equal(result.body.items[0].unitPrice, 6.7)
  assert.equal(result.body.total, 20.1)
  assert.equal(result.body.cashReceived, 50)
  assert.equal(result.body.change, 29.9)
  const discounted = await request('/api/sales', { method: 'POST', body: await salePayload(item.id, { discount: '1.25', cashReceived: '50.10' }) })
  assert.equal(discounted.body.total, 18.85)
  assert.equal(discounted.body.change, 31.25)
})

test('PRU-004: vinculación opcional y nueva venta sin conservar el cliente anterior', async () => {
  const item = await product()
  const search = await request('/api/sales/customers?q=Cliente')
  assert.equal(search.body[0].id, 1)
  const linked = await request('/api/sales', { method: 'POST', body: await salePayload(item.id, { customerId: 1 }) })
  const anonymous = await request('/api/sales', { method: 'POST', body: await salePayload(item.id) })
  assert.equal(linked.status, 201)
  assert.equal(linked.body.customerId, 1)
  assert.equal(anonymous.status, 201)
  assert.equal(anonymous.body.customerId, null)
  assert.equal((await request('/api/sales/' + linked.body.id)).body.customerId, 1)
})

test('Compatibilidad: Yape y Plin conservan referencias recibidas por la API', async () => {
  const item = await product()
  for (const method of ['yape', 'plin']) {
    const result = await request('/api/sales', { method: 'POST', body: await salePayload(item.id, { paymentMethod: method, paymentReference: method + '-REF-A1',digitalReceived:'20.10',paymentConfirmed:true }) })
    assert.equal(result.status, 201)
    assert.equal(result.body.paymentMethod, method)
    assert.equal(result.body.paymentReference, method + '-REF-A1')
    assert.equal(result.body.cashReceived, null)
  }
  assert.equal((await request('/api/inventory')).body.products[0].stock, 4)
})

test('PRU-020: Yape, Plin y otras billeteras sin referencia, con importe exacto y comprobación manual',async()=>{
  const p=await product()
  for(const method of ['yape','plin','otro_digital']) {
    const payload=await salePayload(p.id,{items:[{productId:p.id,quantity:1}],paymentMethod:method,digitalReceived:'6.70',paymentConfirmed:true})
    assert.equal((await request('/api/sales',{method:'POST',body:{...payload,digitalReceived:'6.71'}})).status,400)
    assert.equal((await request('/api/sales',{method:'POST',body:{...payload,paymentConfirmed:false}})).status,400)
    const result=await request('/api/sales',{method:'POST',body:payload})
    assert.equal(result.status,201,JSON.stringify(result.body));assert.equal(result.body.paymentReference,null);assert.equal(result.body.digitalReceived,6.7)
    assert.equal(result.body.paymentMethod,method)
  }
  assert.equal((await request('/api/inventory')).body.products[0].stock,7)
  const report = await dashboard(pool, 'week')
  assert.equal(report.summary.digitalTotal, 20.1)
  assert.deepEqual(report.paymentTotals, { efectivo: 0, yape: 6.7, plin: 6.7, otro_digital: 6.7 })
})

test('validaciones, falta de stock y reintentos no dejan ventas ni salidas parciales', async () => {
  const item = await product()
  const payload = await salePayload(item.id)
  for (const changed of [{ cashReceived: '20.09' }, { cashReceived: '50.001' }, { customerId: 999 }, { paymentMethod: 'yape', paymentReference: '   ' }]) {
    assert.equal((await request('/api/sales', { method: 'POST', body: { ...payload, ...changed } })).status, 400)
  }
  for (const quantity of [0, -1, '0.001', true, 'NaN']) {
    assert.equal((await request('/api/sales/quote', { method: 'POST', body: { items: [{ productId: item.id, quantity }] } })).status, 400)
  }
  const duplicate = await request('/api/sales/quote', { method: 'POST', body: { items: [{ productId: item.id, quantity: 6 }, { productId: item.id, quantity: 6 }] } })
  assert.equal(duplicate.status, 409)
  assert.equal((await request('/api/sales', { method: 'POST', body: payload })).status, 201)
  assert.equal((await request('/api/sales', { method: 'POST', body: payload })).status, 200)
  assert.equal((await request('/api/sales', { method: 'POST', body: { ...payload, customerId: 1 } })).status, 409)
  assert.equal((await request('/api/inventory')).body.products[0].stock, 7)
  for (const role of ['', 'client-fixture']) {
    assert.equal((await request('/api/sales', { role })).status, role ? 403 : 401)
  }
})

test('un precio cambiado exige revisar el cálculo y admite cantidades decimales', async () => {
  const item = await product()
  const payload = await salePayload(item.id, { items: [{ productId: item.id, quantity: '0.25' }] })
  await postgres.admin.query('UPDATE nazareth.products SET sale_price = 7 WHERE id = $1', [item.id])
  assert.equal((await request('/api/sales', { method: 'POST', body: payload })).status, 409)
  const updated = await salePayload(item.id, { items: [{ productId: item.id, quantity: '.25' }], cashReceived: '2.00' })
  const result = await request('/api/sales', { method: 'POST', body: updated })
  assert.equal(result.body.total, 1.75)
  assert.equal((await request('/api/inventory')).body.products[0].stock, 9.75)
})

test('venta y ajuste usan conexiones independientes, esperan el bloqueo y conservan ambos cambios', async () => {
  const item = await product()
  const quote = await quoteSale(pool, { items: [{ productId: item.id, quantity: 3 }] })
  const saleConnection = await pool.connect()
  const adjustmentConnection = await pool.connect()
  const salePid = (await saleConnection.query('SELECT pg_backend_pid() AS pid')).rows[0].pid
  const adjustmentPid = (await adjustmentConnection.query('SELECT pg_backend_pid() AS pid')).rows[0].pid
  assert.notEqual(salePid, adjustmentPid)
  let signalLocked, resume
  const locked = new Promise((resolve) => { signalLocked = resolve })
  const gate = new Promise((resolve) => { resume = resolve })
  const saleDb = { connect: async () => ({
    async query(sql, params) {
      const result = await saleConnection.query(sql, params)
      if (sql.includes('FOR UPDATE OF p')) { signalLocked(); await gate }
      return result
    }, release() {},
  }) }
  const adjustmentDb = { connect: async () => ({ query: adjustmentConnection.query.bind(adjustmentConnection), release() {} }) }
  let salePromise, adjustmentPromise
  try {
    salePromise = createSale(saleDb, { userId: 1, items: [{ productId: item.id, quantity: 3 }], discount: 0, paymentMethod: 'efectivo', cashReceived: 50, requestId: randomUUID(), quoteId: quote.quoteId })
    await Promise.race([locked, salePromise.then(() => { throw new Error('La venta finalizó antes de observar el bloqueo') })])
    adjustmentPromise = adjustInventory(adjustmentDb, item.id, { change: -2, reason: 'Conteo concurrente', requestId: randomUUID() }, 1)
    let waiting = false
    for (let attempt = 0; attempt < 100; attempt++) {
      const { rows: [activity] } = await postgres.admin.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid = $1', [adjustmentPid])
      if (activity.wait_event_type === 'Lock') { waiting = true; break }
      await delay(20)
    }
    assert.equal(waiting, true)
    resume()
    await Promise.all([salePromise, adjustmentPromise])
    const history = (await request('/api/inventory/products/' + item.id + '/history')).body
    assert.equal(history.product.stock, 5)
    assert.deepEqual(history.movements.filter((movement) => movement.type !== 'entry').map((movement) => [movement.stockBefore, movement.stockAfter]), [[7, 5], [10, 7]])
  } finally {
    resume()
    await Promise.allSettled([salePromise, adjustmentPromise].filter(Boolean))
    saleConnection.release()
    adjustmentConnection.release()
  }
})

test('una venta y un ajuste concurrentes que exceden el stock no dejan saldo negativo', async () => {
  const item = await product({ initialStock: 5 })
  const quote = await quoteSale(pool, { items: [{ productId: item.id, quantity: 4 }] })
  const first = await pool.connect()
  const second = await pool.connect()
  try {
    assert.notEqual((await first.query('SELECT pg_backend_pid() AS pid')).rows[0].pid, (await second.query('SELECT pg_backend_pid() AS pid')).rows[0].pid)
    const saleDb = { connect: async () => ({ query: first.query.bind(first), release() {} }) }
    const adjustmentDb = { connect: async () => ({ query: second.query.bind(second), release() {} }) }
    const results = await Promise.allSettled([
      createSale(saleDb, { userId: 1, items: [{ productId: item.id, quantity: 4 }], paymentMethod: 'efectivo', cashReceived: 50, requestId: randomUUID(), quoteId: quote.quoteId }),
      adjustInventory(adjustmentDb, item.id, { change: -3, reason: 'Conteo concurrente', requestId: randomUUID() }, 1),
    ])
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
    assert.equal(results.find((result) => result.status === 'rejected').reason.statusCode, 409)
    const history = (await request('/api/inventory/products/' + item.id + '/history')).body
    assert.ok([1, 2].includes(history.product.stock))
    assert.equal(history.movements.filter((movement) => movement.type !== 'entry').length, 1)
  } finally { first.release(); second.release() }
})

test('las ventas anteriores a 004 se leen con sus importes y unidades disponibles', async () => {
  const item = await product()
  const { rows: [legacy] } = await postgres.admin.query(`INSERT INTO nazareth.sales
    (user_id, total_amount, payment_method) VALUES (1, 20.10, 'efectivo') RETURNING id`)
  await postgres.admin.query(`INSERT INTO nazareth.sale_items
    (sale_id, product_id, quantity, unit_price, subtotal) VALUES ($1,$2,3,6.70,20.10)`, [legacy.id, item.id])
  const response = await request('/api/sales/' + legacy.id)
  assert.equal(response.status, 200)
  assert.equal(response.body.total, 20.1)
  assert.equal(response.body.discount, 0)
  assert.equal(response.body.items[0].unit, 'Kg')
  assert.equal(response.body.cashReceived, null)
})

test('Fidelización: conserva puntos históricos, admite campañas y evita canjes duplicados', async () => {
  const accountPath = '/api/customer-account'
  const claimsPath = accountPath + '/benefits'
  const client = { role: 'client-fixture' }
  const item = await product({ price: '31.00', initialStock: 20 })

  const purchase = await salePayload(item.id, { customerId: 1, items: [{ productId: item.id, quantity: '4' }], cashReceived: '124' })
  assert.equal((await request('/api/sales', { method: 'POST', body: purchase })).status, 201)
  assert.equal((await request(accountPath, client)).body.points, 124)

  const claim = requestId => request(claimsPath, { ...client, method: 'POST', body: { requestId } })
  const claimId = randomUUID()
  const [first, retry] = await Promise.all([claim(claimId), claim(claimId)])
  assert.equal(first.status, 200, JSON.stringify(first.body))
  assert.equal(retry.status, 200, JSON.stringify(retry.body))
  assert.equal(first.body.points, 24)
  assert.equal(retry.body.benefits.length, 1)
  assert.equal((await claim(randomUUID())).status, 409)
  assert.equal((await request('/api/sales/customers/1/benefits', client)).status, 403)
  assert.equal((await request('/api/sales/customers/1/benefits')).body[0].id, claimId)

  const campaign = await request('/api/promotions', { method: 'POST', body: {
    productId: item.id, discountType: 'fixed', discountValue: 1, status: 'active',
    startDate: '2020-01-01', endDate: '2090-01-01', requestId: randomUUID(),
  } })
  assert.equal(campaign.status, 200, JSON.stringify(campaign.body))

  const items = [{ productId: item.id, quantity: '1' }]
  const quote = body => request('/api/sales/quote', { method: 'POST', body: { items, customerId: 1, benefitId: claimId, ...body } })
  assert.equal((await quote({ discount: '0.01' })).status, 400)
  assert.equal((await quote({ customerId: 2 })).status, 409)
  const eligible = await quote({})
  assert.equal(eligible.status, 200, JSON.stringify(eligible.body))
  assert.equal(eligible.body.subtotal, 30)
  assert.equal(eligible.body.total, 25)

  const sale = await salePayload(item.id, { items, customerId: 1, benefitId: claimId, cashReceived: '25' })
  const sell = body => request('/api/sales', { method: 'POST', body })
  assert.equal((await sell({ ...sale, cashReceived: '24' })).status, 400)
  const otherSale = { ...sale, requestId: randomUUID() }
  const [sold, duplicate] = await Promise.all([sell(sale), sell(otherSale)])
  const success = [sold, duplicate].find(result => result.status === 201)
  assert.ok(success, JSON.stringify([sold, duplicate]))
  assert.ok([sold, duplicate].some(result => result.status === 409))
  assert.equal(success.body.loyaltyDiscount, 5)
  const winningPayload = sold.status === 201 ? sale : otherSale
  assert.equal((await sell(winningPayload)).status, 200)

  const finalAccount = (await request(accountPath, client)).body
  assert.equal(finalAccount.points, 49)
  assert.equal(finalAccount.benefits[0].status, 'used')
  assert.equal(finalAccount.benefits[0].saleId, success.body.id)
  assert.equal((await request(claimsPath + '/' + claimId + '/cancel', { ...client, method: 'POST' })).status, 409)
})

test('Fidelización: un beneficio cancelado devuelve los puntos una sola vez', async () => {
  await postgres.admin.query('UPDATE nazareth.customers SET points = 100 WHERE id = 1')
  const id = randomUUID()
  const path = '/api/customer-account/benefits'
  const client = { role: 'client-fixture', method: 'POST' }
  assert.equal((await request(path, { ...client, body: { requestId: id } })).body.points, 0)
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await request(path + '/' + id + '/cancel', client)
    assert.equal(response.status, 200)
    assert.equal(response.body.points, 100)
    assert.equal(response.body.benefits[0].status, 'cancelled')
  }
})

test('Fidelización: el beneficio se utiliza al cobrar una reserva confirmada', async () => {
  await postgres.admin.query('UPDATE nazareth.customers SET points = 100 WHERE id = 1')
  const item = await product({ price: '30.00' })
  const benefitId = randomUUID()
  const client = { role: 'client-fixture' }
  await request('/api/customer-account/benefits', { ...client, method: 'POST', body: { requestId: benefitId } })
  const items = [{ productId: item.id, quantity: '1' }]
  const reservation = await request('/api/reservations', { ...client, method: 'POST', body: { requestId: randomUUID(), items } })
  const reservationPath = '/api/reservations/' + reservation.body.id
  assert.equal((await request(reservationPath, { method: 'POST', body: { action: 'confirm' } })).status, 200)

  const body = await salePayload(item.id, { customerId: 1, benefitId, reservationId: reservation.body.id, items, cashReceived: '25' })
  const result = await request('/api/sales', { method: 'POST', body })
  assert.equal(result.status, 201, JSON.stringify(result.body))
  assert.equal(result.body.total, 25)
  assert.equal(result.body.loyaltyDiscount, 5)
  assert.equal((await request('/api/reservations', client)).body[0].status, 'collected')
  assert.equal((await request('/api/customer-account', client)).body.benefits[0].status, 'used')
})
