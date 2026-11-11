import test, { before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import express from 'express'
import { nativePostgres } from '../test-support/nativePostgres.js'
import { createSalesRouter } from '../src/routes/salesRouter.js'
import { createInventoryRouter } from '../src/routes/inventoryRoutes.js'
import { createProduct, adjustInventory } from '../src/services/inventoryService.js'
import { createSale, quoteSale } from '../src/services/saleService.js'
import { dashboard } from '../src/services/dashboardService.js'
import { listSales, customerSales } from '../src/services/saleService.js'

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
  for (const file of ['001_commercial_schema.sql', '002_express_access.sql', '003_inventory_access.sql', '004_sales.sql']) {
    await postgres.admin.query(await readFile(new URL('../../database/migrations/' + file, import.meta.url), 'utf8'))
  }
  pool = await postgres.applicationPool()
  function authenticate(req, res, next) {
    const role = req.get('Authorization')
    if (!['admin-fixture', 'client-fixture'].includes(role)) return res.status(401).json({ message: 'Sesión requerida' })
    req.user = { id: role === 'admin-fixture' ? 1 : 2, role: role === 'admin-fixture' ? 'admin' : 'client' }
    next()
  }
  app = express()
  app.use(express.json())
  app.use('/api/sales', createSalesRouter({ db: pool, authenticate }))
  app.use('/api/inventory', createInventoryRouter({ db: pool, authenticate }))
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
  await postgres.admin.query(`TRUNCATE nazareth.categories, auth.users RESTART IDENTITY CASCADE;
    INSERT INTO auth.users VALUES ('${adminIdentity}', 'admin@example.test'), ('${clientIdentity}', 'cliente@example.test');
    INSERT INTO nazareth.profiles (auth_user_id, name, role, is_protected) VALUES
      ('${adminIdentity}', 'Administrador QA', 'admin', true), ('${clientIdentity}', 'Cliente QA', 'client', false);
    INSERT INTO nazareth.customers (user_id, name, phone) VALUES (2, 'Cliente QA', 'Contacto QA');
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
  await postgres.admin.query(`UPDATE nazareth.sales SET created_at = ((now() AT TIME ZONE 'America/Lima')::date AT TIME ZONE 'America/Lima') - interval '1 second'`)
  report = await dashboard(pool,'week')
  assert.equal(report.today.total,0)
  assert.equal(report.today.saleCount,0)
  assert.equal(report.trend.at(-1).v,0)
  assert.equal(report.trend.at(-2).v,20.1)
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

test('PRU-020: Yape y Plin conservan referencia y método sin una confirmación bancaria automática', async () => {
  const item = await product()
  for (const method of ['yape', 'plin']) {
    const result = await request('/api/sales', { method: 'POST', body: await salePayload(item.id, { paymentMethod: method, paymentReference: method + '-REF-A1' }) })
    assert.equal(result.status, 201)
    assert.equal(result.body.paymentMethod, method)
    assert.equal(result.body.paymentReference, method + '-REF-A1')
    assert.equal(result.body.cashReceived, null)
  }
  assert.equal((await request('/api/inventory')).body.products[0].stock, 4)
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
