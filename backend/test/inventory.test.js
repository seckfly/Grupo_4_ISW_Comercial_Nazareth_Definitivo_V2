import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import express from 'express'
import { PGlite } from '@electric-sql/pglite'
import { createInventoryRouter } from '../src/routes/inventoryRoutes.js'

// La base y las identidades de estas pruebas existen solo en memoria.
async function inventoryFixture(t, { legacyProduct = false } = {}) {
  const database = new PGlite()
  t.after(() => database.close())
  await database.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text NOT NULL);
    CREATE TABLE auth.sessions (id uuid PRIMARY KEY, user_id uuid, not_after timestamptz);
    INSERT INTO auth.users VALUES ('00000000-0000-4000-8000-000000000001', 'admin@example.test');
    CREATE TABLE public.preexisting_data (id integer PRIMARY KEY);
    INSERT INTO public.preexisting_data VALUES (42);
  `)
  let legacySnapshot
  for (const file of ['001_commercial_schema.sql', '002_express_access.sql', '003_inventory_access.sql', '004_sales.sql', '005_full_scope.sql', '009_archive_and_remove_access.sql', '010_retire_inventory_products.sql']) {
    await database.exec(await readFile(new URL('../../database/migrations/' + file, import.meta.url), 'utf8'))
    if (file === '002_express_access.sql' && legacyProduct) {
      await database.exec(`
        INSERT INTO nazareth.categories (id, name) VALUES (100, 'Categoría anterior');
        INSERT INTO nazareth.products (id, category_id, name, unit, cost_price, sale_price, current_stock)
        VALUES (100, 100, 'Producto anterior', 'Unidad', 4, 6.70, 9);
        INSERT INTO nazareth.inventory_movements (product_id, type, quantity_change, reason, stock_before, stock_after)
        VALUES (100, 'adjustment', -1, 'Motivo anterior', 10, 9);
      `)
      legacySnapshot = {
        product: (await database.query('SELECT id, category_id, name, unit, cost_price, sale_price, current_stock, min_stock_threshold, image_url, is_active, created_at FROM nazareth.products WHERE id = 100')).rows[0],
        movement: (await database.query('SELECT * FROM nazareth.inventory_movements WHERE product_id = 100')).rows[0],
      }
    }
  }
  await database.exec(`INSERT INTO nazareth.profiles (auth_user_id, name, role, is_protected)
    VALUES ('00000000-0000-4000-8000-000000000001', 'Administrador QA', 'admin', true)`)

  // PGlite usa una conexión. Esta cola emula el préstamo exclusivo de pool.connect().
  let connectionReady = Promise.resolve()
  const query = async (sql, params) => {
    if(sql==='SELECT pg_advisory_xact_lock(73642)')return {rows:[],rowCount:0} // PGlite fixture already serializes its sole connection.
    const result = await database.query(sql, params)
    return { rows: result.rows, rowCount: result.affectedRows }
  }
  const pool = {
    query,
    async connect() {
      const previous = connectionReady
      let release
      connectionReady = new Promise((resolve) => { release = resolve })
      await previous
      return { query, release }
    },
  }

  const app = express()
  const errors = []
  app.use(express.json())
  app.use('/api/inventory', createInventoryRouter({
    db: pool,
    authenticate(req, res, next) {
      const role = req.get('Authorization')
      if (!['admin-fixture', 'client-fixture'].includes(role)) return res.status(401).json({ message: 'Sesión requerida' })
      req.user = { id: 1, role: role === 'admin-fixture' ? 'admin' : 'client' }
      next()
    },
  }))
  app.use((error, _req, res, _next) => {
    errors.push(error)
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'No se pudo completar la operación' })
  })
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener))
  })
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const base = 'http://127.0.0.1:' + server.address().port + '/api/inventory'

  async function request(path = '', { method = 'GET', body, role = 'admin-fixture' } = {}) {
    const response = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: role },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    return { status: response.status, body: await response.json() }
  }

  async function create(changes = {}) {
    const result = await request('/products', {
      method: 'POST',
      body: { name: 'Producto QA', categoryId: 1, unit: 'Unidad', cost: '4.00', price: '6.70', initialStock: '10', minimum: '5', ...changes },
    })
    assert.equal(result.status, 201, JSON.stringify(result.body))
    return result.body
  }
  const history = async (id) => {
    const result = await request('/products/' + id + '/history')
    assert.equal(result.status, 200)
    return result.body
  }
  const adjust = (id, changes = {}) => request('/products/' + id + '/adjustments', {
    method: 'POST', body: { change: '-1', reason: 'Producto dañado', requestId: randomUUID(), ...changes },
  })

  await database.exec('SET ROLE nazareth_app')
  return { database, request, create, history, adjust, legacySnapshot, errors }
}

test('PRU-002: alerta por debajo e igual al mínimo, con exclusión de inactivos', async (t) => {
  const fixture = await inventoryFixture(t)
  const below = await fixture.create({ name: 'Bajo', initialStock: 4 })
  const equal = await fixture.create({ name: 'Igual', initialStock: 5 })
  await fixture.create({ name: 'Superior', initialStock: 6 })
  const inactive = await fixture.create({ name: 'Inactivo', initialStock: 4, isActive: false })
  const result = await fixture.request()
  assert.equal(result.status, 200)
  assert.equal(result.body.products.length, 4)
  assert.deepEqual(result.body.products.filter((product) => product.lowStock).map((product) => product.id).sort(), [below.id, equal.id])
  assert.equal(result.body.products.find((product) => product.id === inactive.id).stock, 4)
})

test('inventario devuelve el precio promocional vigente sin sustituir el precio regular', async (t) => {
  const fixture = await inventoryFixture(t)
  const product = await fixture.create({ price: '6.70' })
  await fixture.database.query(`INSERT INTO nazareth.promotions
    (product_id, discount_type, discount_value, start_date, end_date, status)
    VALUES ($1, 'percentage', 20, now() - interval '1 day', now() + interval '1 day', 'active')`, [product.id])

  const active = await fixture.request()
  const activeProduct = active.body.products.find(item => item.id === product.id)
  assert.equal(activeProduct.price, 6.7)
  assert.equal(activeProduct.currentPrice, 5.36)

  await fixture.database.query("UPDATE nazareth.promotions SET status = 'paused' WHERE product_id = $1", [product.id])
  const paused = await fixture.request()
  const pausedProduct = paused.body.products.find(item => item.id === product.id)
  assert.equal(pausedProduct.price, 6.7)
  assert.equal(pausedProduct.currentPrice, 6.7)
})

test('PRU-016: alta, precio actualizado y dos ajustes con historial conservado', async (t) => {
  const fixture = await inventoryFixture(t)
  const product = await fixture.create()
  assert.equal(product.price, 6.7)
  assert.equal(product.stock, 10)
  const { stock, lowStock, category, ...payload } = product
  const edited = await fixture.request('/products/' + product.id, { method: 'PUT', body: { ...payload, price: '7.00' } })
  assert.equal(edited.status, 200)
  assert.equal(edited.body.price, 7)
  assert.equal((await fixture.adjust(product.id)).status, 201)
  const first = await fixture.history(product.id)
  assert.equal(first.product.stock, 9)
  assert.equal(first.movements[0].reason, 'Producto dañado')
  assert.equal((await fixture.adjust(product.id, { reason: 'Diferencia de conteo' })).status, 201)
  const final = await fixture.history(product.id)
  assert.equal(final.product.stock, 8)
  assert.equal(final.product.price, 7)
  assert.deepEqual(final.movements.filter((movement) => movement.type === 'adjustment').map((movement) =>
    [movement.stockBefore, movement.stockAfter, movement.reason]), [[9, 8, 'Diferencia de conteo'], [10, 9, 'Producto dañado']])
  assert.deepEqual(final.movements.find((movement) => movement.id === first.movements[0].id), first.movements[0])
})

for (const [id, reason] of [['PRU-017', ''], ['PRU-018', '   ']]) {
  test(id + ': rechaza el motivo sin modificar stock ni historial previo', async (t) => {
    const fixture = await inventoryFixture(t)
    const product = await fixture.create({ initialStock: 11 })
    assert.equal((await fixture.adjust(product.id, { reason: 'Conteo previo' })).status, 201)
    const before = await fixture.history(product.id)
    assert.equal(before.product.stock, 10)
    const rejected = await fixture.adjust(product.id, { reason })
    assert.equal(rejected.status, 400)
    assert.match(rejected.body.message, /motivo/)
    assert.deepEqual(await fixture.history(product.id), before)
  })
}

test('PRU-019: fallo después de actualizar stock revierte todo y conserva un ajuste anterior', async (t) => {
  const fixture = await inventoryFixture(t)
  const product = await fixture.create({ initialStock: 11 })
  assert.equal((await fixture.adjust(product.id, { reason: 'Conteo anterior' })).status, 201)
  const before = await fixture.history(product.id)
  assert.equal(before.product.stock, 10)

  // El fallo existe exclusivamente en esta base aislada, después del UPDATE de stock.
  await fixture.database.exec(`RESET ROLE;
    CREATE FUNCTION nazareth.fail_test_adjustment() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.type = 'adjustment' THEN
          IF (SELECT current_stock FROM nazareth.products WHERE id = NEW.product_id) <> 9 THEN
            RAISE EXCEPTION 'El fallo ocurrió antes de actualizar el saldo' USING ERRCODE = 'ZX002';
          END IF;
          RAISE EXCEPTION 'Fallo aislado al guardar movimiento' USING ERRCODE = 'ZX001';
        END IF;
        RETURN NEW;
      END;
    $$;
    CREATE TRIGGER fail_test_adjustment BEFORE INSERT ON nazareth.inventory_movements
      FOR EACH ROW EXECUTE FUNCTION nazareth.fail_test_adjustment();
    SET ROLE nazareth_app;
  `)
  assert.equal((await fixture.adjust(product.id)).status, 500)
  assert.equal(fixture.errors.at(-1).code, 'ZX001')
  assert.deepEqual(await fixture.history(product.id), before)
})

test('CU-006: rechaza cantidades inválidas y saldo negativo y protege mantenimiento e historial', async (t) => {
  const fixture = await inventoryFixture(t)
  const product = await fixture.create()
  const before = await fixture.history(product.id)
  for (const change of [0, 'NaN', true, '1.001', '-11']) {
    const result = await fixture.adjust(product.id, { change })
    assert.equal(result.status, change === '-11' ? 409 : 400)
  }
  for (const [path, method, body] of [
    ['', 'GET'], ['/products', 'POST', {}], ['/products/' + product.id, 'PUT', {}],
    ['/products/' + product.id + '/history', 'GET'], ['/products/' + product.id + '/adjustments', 'POST', {}],
  ]) {
    assert.equal((await fixture.request(path, { method, body, role: 'client-fixture' })).status, 403)
    assert.equal((await fixture.request(path, { method, body, role: '' })).status, 401)
  }
  const bypass = await fixture.request('/products/' + product.id, { method: 'PUT', body: { ...product, initialStock: 100 } })
  assert.equal(bypass.status, 400)
  assert.deepEqual(await fixture.history(product.id), before)
})

test('CU-006: dos reintentos simultáneos del mismo ajuste generan un solo movimiento', async (t) => {
  const fixture = await inventoryFixture(t)
  const product = await fixture.create()
  const requestId = randomUUID()
  const attempts = await Promise.all([fixture.adjust(product.id, { requestId }), fixture.adjust(product.id, { requestId })])
  assert.deepEqual(attempts.map((result) => result.status).sort(), [200, 201])
  const history = await fixture.history(product.id)
  assert.equal(history.product.stock, 9)
  assert.equal(history.movements.filter((movement) => movement.type === 'adjustment').length, 1)
  assert.equal((await fixture.adjust(product.id, { requestId, reason: 'Otro motivo' })).status, 409)
})

test('CU-006: ajustes concurrentes no producen un saldo negativo y admiten decimales exactos', async (t) => {
  const fixture = await inventoryFixture(t)
  const product = await fixture.create()
  const attempts = await Promise.all([fixture.adjust(product.id, { change: -7 }), fixture.adjust(product.id, { change: -7 })])
  assert.deepEqual(attempts.map((result) => result.status).sort(), [201, 409])
  assert.equal((await fixture.history(product.id)).product.stock, 3)
  assert.equal((await fixture.adjust(product.id, { change: '0.10' })).status, 201)
  assert.equal((await fixture.adjust(product.id, { change: '0.20' })).status, 201)
  assert.equal((await fixture.history(product.id)).product.stock, 3.3)
})

test('migración 003 conserva los datos previos y permite movimientos de venta sin motivo manual', async (t) => {
  const fixture = await inventoryFixture(t, { legacyProduct: true })
  const product = await fixture.create()
  await fixture.database.exec('RESET ROLE')
  const existing = await fixture.database.query('SELECT id FROM public.preexisting_data')
  assert.deepEqual(existing.rows, [{ id: 42 }])
  const legacyProduct = (await fixture.database.query('SELECT id, category_id, name, unit, cost_price, sale_price, current_stock, min_stock_threshold, image_url, is_active, created_at FROM nazareth.products WHERE id = 100')).rows[0]
  const { adjustment_request_id, ...legacyMovement } = (await fixture.database.query('SELECT * FROM nazareth.inventory_movements WHERE product_id = 100')).rows[0]
  assert.equal(adjustment_request_id, null)
  assert.deepEqual(legacyProduct, fixture.legacySnapshot.product)
  assert.deepEqual(legacyMovement, fixture.legacySnapshot.movement)
  for (const role of ['anon', 'authenticated']) {
    const access = await fixture.database.query('SELECT has_schema_privilege($1, $2, $3) AS permitted', [role, 'nazareth', 'USAGE'])
    assert.equal(access.rows[0].permitted, false)
  }
  await fixture.database.exec('SET ROLE nazareth_app')
  await assert.rejects(fixture.database.query(`INSERT INTO nazareth.inventory_movements
    (product_id, type, quantity_change, reason) VALUES ($1, 'adjustment', -1, '   ')`, [product.id]), { code: '23514' })
  await fixture.database.query(`INSERT INTO nazareth.inventory_movements
    (product_id, type, quantity_change) VALUES ($1, 'sale', -1)`, [product.id])
})
