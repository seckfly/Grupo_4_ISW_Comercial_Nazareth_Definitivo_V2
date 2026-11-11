import { createHash } from 'node:crypto'
import { decimalUnits, decimalText, positiveId, inputError as invalid } from '../../../shared/numbers.mjs'
import { lockStock, heldSql, transaction } from './stockService.js'
import { photoUrl } from './photoService.js'

export const inventoryId = positiveId

function decimal(value, label, signed = false) {
  return decimalText(decimalUnits(value, { label, signed }))
}

export function productInput(input, creating) {
  if (!input || typeof input !== 'object') throw invalid('Completa los datos del producto')
  if (typeof input.name !== 'string' || !input.name.trim()) throw invalid('El nombre es obligatorio')
  if (typeof input.unit !== 'string' || !input.unit.trim()) throw invalid('La unidad es obligatoria')
  if (input.isActive !== undefined && typeof input.isActive !== 'boolean') throw invalid('El estado no es válido')
  if ('stock' in input || 'current_stock' in input || (!creating && 'initialStock' in input)) {
    throw invalid('Modifica las existencias mediante un ajuste con motivo')
  }
  return {
    name: input.name.trim(),
    unit: input.unit.trim(),
    categoryId: inventoryId(input.categoryId),
    cost: !creating && input.cost === undefined ? undefined : decimal(input.cost, 'El costo'),
    price: decimal(input.price, 'El precio'),
    minimum: decimal(input.minimum, 'El mínimo'),
    isActive: input.isActive ?? (creating ? true : undefined),
    imageUrl: input.imageUrl===undefined?undefined:photoUrl(input.imageUrl),
    ...(creating ? { initialStock: decimal(input.initialStock, 'El stock inicial') } : {}),
  }
}

const requestIdPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

export function adjustmentInput(input) {
  if (!input || typeof input.reason !== 'string' || !input.reason.trim()) {
    throw invalid('Ingresa un motivo con al menos un carácter distinto de espacios')
  }
  if (typeof input.requestId !== 'string' || !requestIdPattern.test(input.requestId)) {
    throw invalid('La solicitud de ajuste no es válida')
  }
  const change = decimal(input.change, 'La variación', true)
  if (Number(change) === 0) throw invalid('La variación debe ser distinta de cero')
  return { reason: input.reason.trim(), change, requestId: input.requestId }
}

const productFields = `p.id, p.category_id AS "categoryId", c.name AS category, p.name, p.unit,p.image_url AS "imageUrl",
  ${heldSql()}::float8 AS held,(CASE WHEN p.archived_at IS NULL THEN p.current_stock-${heldSql()} ELSE 0 END)::float8 AS available,
  p.cost_price::float8 AS cost, p.sale_price::float8 AS price, p.current_stock::float8 AS stock,
  p.min_stock_threshold::float8 AS minimum, p.is_active AS "isActive", p.archived_at AS "archivedAt", p.retired_at AS "retiredAt",
  (p.is_active AND p.current_stock <= p.min_stock_threshold) AS "lowStock"`

const movementFields = `m.id, m.product_id AS "productId", m.type, m.quantity_change::float8 AS change,
  m.stock_before::float8 AS "stockBefore", m.stock_after::float8 AS "stockAfter", m.reason,
  m.created_at AS "createdAt", m.created_by AS "createdBy", p.name AS author,
  m.adjustment_request_id AS "requestId"`

async function productById(db, id) {
  const { rows: [product] } = await db.query(`SELECT ${productFields}
    FROM nazareth.products p JOIN nazareth.categories c ON c.id = p.category_id WHERE p.id = $1`, [id])
  if (!product) throw invalid('Producto no encontrado', 404)
  return product
}

export async function listInventory(db) {
  const { rows: products } = await db.query(`SELECT ${productFields}
    FROM nazareth.products p JOIN nazareth.categories c ON c.id = p.category_id WHERE p.retired_at IS NULL ORDER BY p.name, p.id`)
  const { rows: categories } = await db.query('SELECT id, name FROM nazareth.categories ORDER BY name')
  return { products, categories }
}

export async function productHistory(db, productId) {
  const id = inventoryId(productId)
  const connection = await db.connect()
  try {
    await connection.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const product = await productById(connection, id)
    const { rows: movements } = await connection.query(`SELECT ${movementFields}
      FROM nazareth.inventory_movements m LEFT JOIN nazareth.profiles p ON p.id = m.created_by
      WHERE m.product_id = $1 ORDER BY m.created_at DESC, m.id DESC`, [id])
    await connection.query('COMMIT')
    return { product, movements }
  } catch (error) {
    await connection.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    connection.release()
  }
}

export async function createProduct(db, input, userId) {
  const data = productInput(input, true)
  const { requestId } = input
  if (requestId !== undefined && (typeof requestId !== 'string' || !requestIdPattern.test(requestId))) {
    throw invalid('La solicitud de creación no es válida')
  }
  const values = [data.categoryId, data.name, data.unit, data.cost, data.price, data.initialStock,
    data.minimum, data.isActive, data.imageUrl ?? null]
  const fingerprint = requestId && createHash('sha256').update(JSON.stringify([userId, ...values])).digest('hex')
  const connection = await db.connect()
  try {
    await connection.query('BEGIN')
    const { rows: [created] } = await connection.query(`INSERT INTO nazareth.products
      (category_id, name, unit, cost_price, sale_price, current_stock, min_stock_threshold, is_active, image_url${requestId ? ', creation_request_id, creation_request_fingerprint' : ''})
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9${requestId ? ', $10, $11' : ''})
      ${requestId ? 'ON CONFLICT (creation_request_id) DO NOTHING' : ''} RETURNING id`,
    requestId ? [...values, requestId, fingerprint] : values)
    const record = created ?? (await connection.query(`SELECT id, creation_request_fingerprint
      FROM nazareth.products WHERE creation_request_id = $1`, [requestId])).rows[0]
    if (!created && record?.creation_request_fingerprint !== fingerprint) {
      throw invalid('La solicitud de creación ya se utilizó con otros datos', 409)
    }
    if (created && Number(data.initialStock) > 0) {
      await connection.query(`INSERT INTO nazareth.inventory_movements
        (product_id, type, quantity_change, stock_before, stock_after, reason, created_by)
        VALUES ($1, 'entry', $2, 0, $2, 'Stock inicial', $3)`, [created.id, data.initialStock, userId])
    }
    const product = await productById(connection, record.id)
    if (product.retiredAt) throw invalid('El producto de esta solicitud ya fue dado de baja', 409)
    await connection.query('COMMIT')
    return product
  } catch (error) {
    await connection.query('ROLLBACK').catch(() => {})
    if (error.code === '23503') throw invalid('Selecciona una categoría existente')
    throw error
  } finally {
    connection.release()
  }
}

export async function updateProduct(db, productId, input) {
  const id = inventoryId(productId)
  const data = productInput(input, false)
  try {
    const { rowCount } = await db.query(`UPDATE nazareth.products SET category_id = $1, name = $2,
      unit = $3, cost_price = COALESCE($4, cost_price), sale_price = $5, min_stock_threshold = $6, is_active = COALESCE($7, is_active),
      image_url=CASE WHEN $9::boolean THEN $10 ELSE image_url END WHERE id = $8 AND archived_at IS NULL AND retired_at IS NULL`,
    [data.categoryId, data.name, data.unit, data.cost, data.price, data.minimum, data.isActive, id,data.imageUrl!==undefined,data.imageUrl??null])
    if (!rowCount) throw invalid('Producto no encontrado', 404)
    return await productById(db, id)
  } catch (error) {
    if (error.code === '23503') throw invalid('Selecciona una categoría existente')
    throw error
  }
}

export async function adjustInventory(db, productId, input, userId) {
  const id = inventoryId(productId)
  const data = adjustmentInput(input)
  const connection = await db.connect()
  try {
    await connection.query('BEGIN')
    await lockStock(connection)
    const { rows: [locked] } = await connection.query('SELECT id, archived_at, retired_at FROM nazareth.products WHERE id = $1 FOR UPDATE', [id])
    if (!locked) throw invalid('Producto no encontrado', 404)
    if (locked.retired_at) throw invalid('El producto ya fue dado de baja', 409)

    const { rows: [previous] } = await connection.query(`SELECT ${movementFields}
      FROM nazareth.inventory_movements m LEFT JOIN nazareth.profiles p ON p.id = m.created_by
      WHERE m.adjustment_request_id = $1`, [data.requestId])
    if (previous) {
      if (previous.productId !== id || previous.createdBy !== userId || previous.change !== Number(data.change) || previous.reason !== data.reason) {
        throw invalid('La solicitud de ajuste ya se utilizó con otros datos', 409)
      }
      const product = await productById(connection, id)
      await connection.query('COMMIT')
      return { product, movement: previous, replayed: true }
    }

    if (locked.archived_at) throw invalid('Restaura el producto antes de ajustar su stock', 409)

    const { rows: [balance] } = await connection.query(`UPDATE nazareth.products
      SET current_stock = current_stock + $1::numeric
      WHERE id = $2 AND current_stock + $1::numeric >= ${heldSql('nazareth.products')}
      RETURNING (current_stock - $1::numeric)::text AS before, current_stock::text AS after`, [data.change, id])
    if (!balance) throw invalid('El ajuste produciría un stock negativo o afectaría unidades apartadas', 409)
    const { rows: [movement] } = await connection.query(`INSERT INTO nazareth.inventory_movements
      (product_id, type, quantity_change, stock_before, stock_after, reason, created_by, adjustment_request_id)
      VALUES ($1, 'adjustment', $2, $3, $4, $5, $6, $7)
      RETURNING id, product_id AS "productId", type, quantity_change::float8 AS change,
        stock_before::float8 AS "stockBefore", stock_after::float8 AS "stockAfter", reason,
        created_by AS "createdBy", created_at AS "createdAt", adjustment_request_id AS "requestId"`,
    [id, data.change, balance.before, balance.after, data.reason, userId, data.requestId])
    const product = await productById(connection, id)
    await connection.query('COMMIT')
    return { product, movement, replayed: false }
  } catch (error) {
    await connection.query('ROLLBACK').catch(() => {})
    if (error.code === '22003') throw invalid('El stock resultante supera la capacidad del registro', 409)
    if (error.code === '23505' && error.constraint === 'inventory_adjustment_request_id_idx') {
      throw invalid('La solicitud de ajuste ya se utilizó', 409)
    }
    throw error
  } finally {
    connection.release()
  }
}

async function checkOpenProductOperations(db, id) {
  const { rows: [activity] } = await db.query(`SELECT
    EXISTS(SELECT 1 FROM nazareth.reservation_items ri JOIN nazareth.reservations r ON r.id = ri.reservation_id
      WHERE ri.product_id = $1 AND r.status IN ('pending', 'confirmed') AND r.pickup_deadline > statement_timestamp()) AS reservation,
    EXISTS(SELECT 1 FROM nazareth.purchase_order_items oi JOIN nazareth.purchase_orders o ON o.id = oi.order_id
      WHERE oi.product_id = $1 AND o.status = 'pending' AND oi.received_quantity < oi.quantity) AS purchase`, [id])
  if (activity.reservation) throw invalid('Resuelve primero las reservas activas de este producto', 409)
  if (activity.purchase) throw invalid('Resuelve primero las órdenes pendientes de este producto', 409)
}

export async function setProductArchived(pool, productId, archived) {
  const id = inventoryId(productId)
  if (typeof archived !== 'boolean') throw invalid('Selecciona si deseas archivar o restaurar el producto')
  return transaction(pool, async db => {
    const product = await productById(db, id)
    if (product.retiredAt) throw invalid('El producto ya fue dado de baja', 409)
    if (Boolean(product.archivedAt) === archived) return product
    if (archived) {
      await checkOpenProductOperations(db, id)
    }
    await db.query(`UPDATE nazareth.products
      SET archived_at = CASE WHEN $2 THEN now() ELSE NULL END, is_active = false WHERE id = $1`, [id, archived])
    return productById(db, id)
  }, true)
}

export async function deleteProduct(pool, productId, { confirmation, expectedStock } = {}, actorId) {
  const id = inventoryId(productId)
  if (confirmation !== 'ELIMINAR') throw invalid('Escribe ELIMINAR para confirmar')
  const expected = decimal(expectedStock, 'El stock confirmado')
  return transaction(pool, async db => {
    const { rows: [product] } = await db.query('SELECT current_stock, retired_at FROM nazareth.products WHERE id = $1 FOR UPDATE', [id])
    if (!product) throw invalid('Producto no encontrado', 404)
    if (product.retired_at) return { id }
    if (Number(product.current_stock) !== Number(expected)) {
      throw invalid('El stock cambió. Cierra la confirmación y vuelve a abrirla para revisar la cantidad actual.', 409)
    }
    await checkOpenProductOperations(db, id)
    if (Number(product.current_stock) > 0) {
      await db.query(`INSERT INTO nazareth.inventory_movements
        (product_id, type, quantity_change, stock_before, stock_after, reason, created_by)
        VALUES ($1, 'adjustment', -$2::numeric, $2::numeric, 0, 'Baja definitiva del producto', $3)`,
      [id, product.current_stock, actorId])
    }
    await db.query(`UPDATE nazareth.products SET retired_at = now(), archived_at = NULL,
      current_stock = 0, is_active = false WHERE id = $1`, [id])
    return { id }
  }, true)
}
