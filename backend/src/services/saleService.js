export function calculateSaleTotal(items) {
  return Number(items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0).toFixed(2))
}

export function validateSaleInput({ userId, paymentMethod, paymentReference, items }) {
  if (!userId) throw new Error('Se requiere un usuario')
  if (!['efectivo', 'yape', 'plin'].includes(paymentMethod)) throw new Error('Método de pago no válido')
  if (!Array.isArray(items) || !items.length) throw new Error('Agrega al menos un producto')
  if (items.some((item) => !item || !Number.isInteger(Number(item.productId)) || Number(item.productId) <= 0 ||
    !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0)) throw new Error('Cantidad de producto no válida')
  if (paymentMethod !== 'efectivo' && (typeof paymentReference !== 'string' || !paymentReference.trim())) {
    throw new Error('Ingresa la referencia del pago digital')
  }
}

export function saleResponse(id,total,createdAt){return {id,total,createdAt}}

export async function createSale(pool, payload) {
  try { validateSaleInput(payload) } catch (error) {
    error.statusCode = 400
    throw error
  }
  const connection = await pool.connect()
  try {
    await connection.query('BEGIN')
    const pricedItems = []
    const productIds = [...new Set(payload.items.map((item) => Number(item.productId)))]
    const { rows } = await connection.query(`
      SELECT id, sale_price FROM nazareth.products
      WHERE id = ANY($1::integer[]) AND is_active ORDER BY id FOR UPDATE`, [productIds])
    const products = new Map(rows.map((row) => [row.id, row]))
    for (const item of payload.items) {
      const product = products.get(Number(item.productId))
      if (!product) throw Object.assign(new Error('Producto no encontrado'), { statusCode: 404 })
      pricedItems.push({ ...item, unitPrice: Number(product.sale_price) })
    }
    const total = calculateSaleTotal(pricedItems)
    const paymentReference = payload.paymentMethod === 'efectivo' ? null : payload.paymentReference.trim()
    const { rows: [sale] } = await connection.query(`
      INSERT INTO nazareth.sales (user_id, customer_id, total_amount, payment_method, payment_reference)
      VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
    [payload.userId, payload.customerId || null, total, payload.paymentMethod, paymentReference])
    for (const item of pricedItems) {
      const subtotal = Number((item.quantity * item.unitPrice).toFixed(2))
      const { rowCount } = await connection.query(`UPDATE nazareth.products SET current_stock = current_stock - $1
        WHERE id = $2 AND current_stock >= $1`, [item.quantity, item.productId])
      if (!rowCount) throw new Error('Stock insuficiente')
      await connection.query(`INSERT INTO nazareth.sale_items (sale_id, product_id, quantity, unit_price, subtotal)
        VALUES ($1, $2, $3, $4, $5)`, [sale.id, item.productId, item.quantity, item.unitPrice, subtotal])
      await connection.query(`INSERT INTO nazareth.inventory_movements
        (product_id, type, quantity_change, sale_id, created_by) VALUES ($1, 'sale', $2, $3, $4)`,
      [item.productId, -item.quantity, sale.id, payload.userId])
    }
    await connection.query('COMMIT')
    return saleResponse(sale.id, total, sale.created_at)
  } catch (error) {
    await connection.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    connection.release()
  }
}
