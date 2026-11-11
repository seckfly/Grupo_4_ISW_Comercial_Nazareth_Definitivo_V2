import { createHash } from 'node:crypto'
import { lockStock, heldSql } from './stockService.js'
import { validatePickup } from './reservationService.js'
import { priceSql } from './priceService.js'
import { decimalUnits, decimalText, lineAmount, positiveId, MONEY_MAX_UNITS, QUANTITY_MAX_UNITS, inputError } from '../../../shared/numbers.mjs'

import { paymentNames } from '../../../shared/paymentMethods.mjs'

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i
const fingerprint = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')

function cartInput(payload) {
  if (!payload || !Array.isArray(payload.items) || !payload.items.length) throw inputError('Agrega al menos un producto')
  const grouped = new Map()
  for (const item of payload.items) {
    const productId = positiveId(item?.productId)
    const quantity = decimalUnits(item?.quantity, { label: 'La cantidad' })
    if (quantity <= 0) throw inputError('La cantidad debe ser positiva')
    const total = (grouped.get(productId) || 0) + quantity
    if (total > QUANTITY_MAX_UNITS) throw inputError('La cantidad supera el máximo admitido')
    grouped.set(productId, total)
  }
  return {
    items: [...grouped].sort(([a], [b]) => a - b).map(([productId, quantity]) => ({ productId, quantity })),
    discount: decimalUnits(payload.discount ?? 0, { maxUnits: MONEY_MAX_UNITS, label: 'El descuento' }),
  }
}

export function calculateSaleTotal(items) {
  return items.reduce((sum, item) => sum + lineAmount(
    decimalUnits(item.quantity, { label: 'La cantidad' }),
    decimalUnits(item.unitPrice, { label: 'El precio' }),
  ), 0) / 100
}

export function validateSaleInput(payload) {
  if (!payload || typeof payload.paymentMethod !== 'string' || !Object.hasOwn(paymentNames, payload.paymentMethod)) throw inputError('Método de pago no válido')
  const cart = cartInput(payload)
  const userId = positiveId(payload.userId)
  const customerId = payload.customerId == null ? null : positiveId(payload.customerId)
  if (typeof payload.requestId !== 'string' || !uuid.test(payload.requestId)) throw inputError('La solicitud de venta no es válida')
  if (typeof payload.quoteId !== 'string' || !/^[a-f0-9]{64}$/.test(payload.quoteId)) throw inputError('Vuelve a calcular la venta antes de confirmar')
  const paymentReference = payload.paymentMethod === 'efectivo' ? null : (typeof payload.paymentReference === 'string' ? payload.paymentReference.trim() : '') || null
  const digitalReceived=payload.paymentMethod==='efectivo'?null:decimalUnits(payload.digitalReceived,{maxUnits:MONEY_MAX_UNITS,label:'El importe recibido'})
  if(payload.paymentMethod!=='efectivo'&&payload.paymentConfirmed!==true)throw inputError('Confirma manualmente el abono recibido')
  const cash = payload.paymentMethod === 'efectivo'
    ? decimalUnits(payload.cashReceived, { maxUnits: MONEY_MAX_UNITS, label: 'El monto recibido' })
    : null
  return { ...cart, userId, customerId, digitalReceived, reservationId: payload.reservationId == null ? null : positiveId(payload.reservationId), requestId: payload.requestId, quoteId: payload.quoteId, paymentMethod: payload.paymentMethod, paymentReference, cash }
}

export function saleResponse(id, total, createdAt) { return { id, total, createdAt } }

async function loadCart(db, cart, lock = false) {
  const { rows } = await db.query(`SELECT p.id, p.name, p.unit, ${priceSql()}::text AS price, (p.current_stock-${heldSql('p','$2')})::text AS stock,
    p.is_active, c.name AS category FROM nazareth.products p JOIN nazareth.categories c ON c.id = p.category_id
    WHERE p.id = ANY($1::integer[]) ORDER BY p.id ${lock ? 'FOR UPDATE OF p' : ''}`, [cart.items.map((item) => item.productId),cart.reservationId??null])
  return new Map(rows.map((row) => [row.id, row]))
}

function priceCart(cart, products) {
  let subtotal = 0
  let quantity = 0
  const items = cart.items.map((item) => {
    const product = products.get(item.productId)
    if (!product?.is_active) throw inputError('Uno de los productos ya no está disponible', 409)
    const available = decimalUnits(product.stock)
    if (item.quantity > available) throw inputError('Stock insuficiente para ' + product.name, 409)
    const unitPrice = decimalUnits(product.price)
    const amount = lineAmount(item.quantity, unitPrice)
    subtotal += amount
    quantity += item.quantity
    return {
      productId: product.id, name: product.name, unit: product.unit, category: product.category,
      quantity: item.quantity / 100, unitPrice: unitPrice / 100, subtotal: amount / 100, stock: available / 100,
    }
  })
  if (subtotal > MONEY_MAX_UNITS) throw inputError('La venta supera el máximo admitido')
  if (cart.discount > subtotal) throw inputError('El descuento no puede superar el subtotal')
  const quote = { items, units: quantity / 100, subtotal: subtotal / 100, discount: cart.discount / 100, total: (subtotal - cart.discount) / 100 }
  const quoteId = fingerprint({ items: items.map(({ productId, quantity, unitPrice, subtotal }) => ({ productId, quantity, unitPrice, subtotal })), discount: cart.discount })
  return { ...quote, quoteId }
}

export async function quoteSale(db, payload) {
  const cart = cartInput(payload)
  cart.reservationId=payload.reservationId==null?null:positiveId(payload.reservationId)
  return priceCart(cart, await loadCart(db, cart))
}

const saleFields = `s.id, s.reservation_id AS "reservationId",s.digital_received::float8 AS "digitalReceived",s.created_at AS "createdAt", s.user_id AS "userId", s.customer_id AS "customerId",
  c.name AS "customerName", s.payment_method AS "paymentMethod", s.payment_reference AS "paymentReference",
  COALESCE(s.subtotal_amount, (SELECT SUM(subtotal) FROM nazareth.sale_items WHERE sale_id = s.id), s.total_amount)::float8 AS subtotal,
  s.discount_amount::float8 AS discount, s.total_amount::float8 AS total,
  s.cash_received::float8 AS "cashReceived", s.change_amount::float8 AS change,
  COALESCE((SELECT json_agg(json_build_object(
    'productId', i.product_id, 'name', COALESCE(i.product_name, p.name), 'unit', COALESCE(i.product_unit, p.unit),
    'quantity', i.quantity::float8, 'unitPrice', i.unit_price::float8, 'subtotal', i.subtotal::float8
  ) ORDER BY i.id) FROM nazareth.sale_items i JOIN nazareth.products p ON p.id = i.product_id WHERE i.sale_id = s.id), '[]'::json) AS items`

export async function getSale(db, id) {
  const { rows: [sale] } = await db.query(`SELECT ${saleFields} FROM nazareth.sales s
    LEFT JOIN nazareth.customers c ON c.id = s.customer_id WHERE s.id = $1`, [positiveId(id)])
  if (!sale) throw inputError('Venta no encontrada', 404)
  return sale
}

export async function listSales(db, period = 'today') {
  if (!['today', 'yesterday', 'week', 'month'].includes(period)) throw inputError('El periodo no es válido')
  const { rows: sales } = await db.query(`SELECT ${saleFields} FROM nazareth.sales s
    LEFT JOIN nazareth.customers c ON c.id = s.customer_id
    WHERE s.status = 'completed' AND s.created_at >= (
      CASE $1::text
        WHEN 'yesterday' THEN date_trunc('day', now() AT TIME ZONE 'America/Lima') - interval '1 day'
        WHEN 'week' THEN date_trunc('day', now() AT TIME ZONE 'America/Lima') - interval '6 days'
        WHEN 'month' THEN date_trunc('month', now() AT TIME ZONE 'America/Lima')
        ELSE date_trunc('day', now() AT TIME ZONE 'America/Lima') END
    ) AT TIME ZONE 'America/Lima'
    AND ($1 <> 'yesterday' OR s.created_at < date_trunc('day', now() AT TIME ZONE 'America/Lima') AT TIME ZONE 'America/Lima')
    ORDER BY s.created_at DESC, s.id DESC`, [period])
  let cash = 0
  let digital = 0
  for (const sale of sales) {
    const cents = decimalUnits(sale.total, { maxUnits: MONEY_MAX_UNITS })
    if (sale.paymentMethod === 'efectivo') cash += cents
    else digital += cents
  }
  return { sales, summary: { total: (cash + digital) / 100, cashTotal: cash / 100, digitalTotal: digital / 100, saleCount: sales.length } }
}

export async function customerSales(db, userId) {
  const { rows } = await db.query(`SELECT ${saleFields} FROM nazareth.sales s
    JOIN nazareth.customers c ON c.id=s.customer_id WHERE c.user_id=$1 AND s.status='completed'
    ORDER BY s.created_at DESC,s.id DESC`, [positiveId(userId)])
  return rows
}

export async function findSaleCustomers(db, query, { allowEmpty = false } = {}) {
  const term = typeof query === 'string' ? query.trim() : ''
  if (!term && !allowEmpty) return []
  const { rows } = await db.query(`SELECT c.id, p.name, c.phone, p.email FROM nazareth.customers c
    JOIN nazareth.account_directory p ON p.id = c.user_id WHERE p.role = 'client' AND p.access_removed_at IS NULL
    AND (strpos(lower(p.name), lower($1)) > 0 OR strpos(lower(COALESCE(c.phone, '')), lower($1)) > 0
      OR strpos(lower(p.email), lower($1)) > 0) ORDER BY p.name, c.id`, [term])
  return rows
}

export async function createSale(pool, payload) {
  const data = validateSaleInput(payload)
  const requestFingerprint = fingerprint(data)
  const connection = await pool.connect()
  try {
    await connection.query('BEGIN')
    await lockStock(connection)
    const products = await loadCart(connection, data, true)
    const { rows: [previous] } = await connection.query(
      'SELECT id, request_fingerprint FROM nazareth.sales WHERE request_id = $1', [data.requestId])
    if (previous) {
      if (previous.request_fingerprint !== requestFingerprint) throw inputError('La solicitud de venta ya se utilizó con otros datos', 409)
      const sale = await getSale(connection, previous.id)
      await connection.query('COMMIT')
      return { ...sale, replayed: true }
    }

    if(data.reservationId!==null) {
      const {rows:[collected]}=await connection.query('SELECT id FROM nazareth.sales WHERE reservation_id=$1',[data.reservationId])
      if(collected)throw inputError('El apartado ya tiene una venta registrada',409)
      await validatePickup(connection,data.reservationId,data.items,data.customerId)
    }
    const quote = priceCart(data, products)
    if (quote.quoteId !== data.quoteId) throw inputError('El precio cambió. Revisa el cálculo actualizado antes de confirmar.', 409)
    if(data.digitalReceived!==null&&data.digitalReceived!==decimalUnits(quote.total,{maxUnits:MONEY_MAX_UNITS}))throw inputError('El importe digital recibido debe coincidir con el total a dos decimales')
    if (data.cash !== null && data.cash < decimalUnits(quote.total, { maxUnits: MONEY_MAX_UNITS })) {
      throw inputError('El monto recibido es insuficiente')
    }
    if (data.customerId !== null) {
      const { rows } = await connection.query(`SELECT c.id FROM nazareth.customers c
        JOIN nazareth.account_directory p ON p.id = c.user_id WHERE c.id = $1 AND p.role = 'client' AND p.access_removed_at IS NULL`, [data.customerId])
      if (!rows.length) throw inputError('Selecciona un cliente registrado')
    }
    const cash = data.cash === null ? null : decimalText(data.cash)
    const change = data.cash === null ? null : decimalText(data.cash - decimalUnits(quote.total, { maxUnits: MONEY_MAX_UNITS }))
    const { rows: [created] } = await connection.query(`INSERT INTO nazareth.sales
      (user_id, customer_id, subtotal_amount, discount_amount, total_amount, payment_method, payment_reference,
       cash_received, change_amount, request_id, request_fingerprint,digital_received)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [data.userId, data.customerId, decimalText(decimalUnits(quote.subtotal, { maxUnits: MONEY_MAX_UNITS })),
      decimalText(data.discount), decimalText(decimalUnits(quote.total, { maxUnits: MONEY_MAX_UNITS })),
      data.paymentMethod, data.paymentReference, cash, change, data.requestId, requestFingerprint,data.digitalReceived===null?null:decimalText(data.digitalReceived)])

    for (const item of quote.items) {
      const amount = decimalText(decimalUnits(item.quantity))
      const { rows: [balance] } = await connection.query(`UPDATE nazareth.products SET current_stock = current_stock - $1::numeric
        WHERE id = $2 AND current_stock >= $1::numeric
        RETURNING (current_stock + $1::numeric)::text AS before, current_stock::text AS after`, [amount, item.productId])
      if (!balance) throw inputError('Stock insuficiente para ' + item.name, 409)
      await connection.query(`INSERT INTO nazareth.sale_items (sale_id, product_id, quantity, unit_price, subtotal, product_name, product_unit)
        VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [created.id, item.productId, amount, decimalText(decimalUnits(item.unitPrice)), decimalText(decimalUnits(item.subtotal, { maxUnits: MONEY_MAX_UNITS })), item.name, item.unit])
      await connection.query(`INSERT INTO nazareth.inventory_movements
        (product_id, type, quantity_change, stock_before, stock_after, sale_id, created_by)
        VALUES ($1,'sale',-$2::numeric,$3,$4,$5,$6)`, [item.productId, amount, balance.before, balance.after, created.id, data.userId])
    }
    if(data.reservationId!==null) {
      await connection.query('UPDATE nazareth.sales SET reservation_id=$1 WHERE id=$2',[data.reservationId,created.id])
      await connection.query(`UPDATE nazareth.reservations SET status='collected' WHERE id=$1`,[data.reservationId])
    }
    const sale = await getSale(connection, created.id)
    await connection.query('COMMIT')
    return { ...sale, replayed: false }
  } catch (error) {
    await connection.query('ROLLBACK').catch(() => {})
    if (error.code === '23505' && error.constraint === 'sales_request_id_idx') throw inputError('La solicitud de venta ya se utilizó', 409)
    throw error
  } finally { connection.release() }
}

