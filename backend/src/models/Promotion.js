import { createHash } from 'node:crypto'
import { inputError, promotionValue } from '../../../shared/numbers.mjs'
import { campaignPriceSql } from '../services/priceService.js'
import { transaction } from '../services/stockService.js'

export const Promotion = {
  async list(db, role) {
    const { rows } = await db.query(
      'SELECT pr.id, pr.product_id AS "productId", p.name AS product, p.image_url AS "imageUrl", ' +
      'p.sale_price AS "regularPrice", pr.discount_type AS "discountType", ' +
      `${campaignPriceSql()} AS "currentPrice", ` +
      'pr.discount_value AS "discountValue", pr.start_date AS "startDate", pr.end_date AS "endDate", ' +
      'pr.status, pr.usage_count AS "usageCount", pr.revenue ' +
      'FROM nazareth.promotions AS pr JOIN nazareth.products AS p ON p.id = pr.product_id ' +
      "WHERE $1 = 'admin' OR (p.is_active AND pr.status = 'active' AND statement_timestamp() BETWEEN pr.start_date AND pr.end_date) " +
      `ORDER BY CASE WHEN $1 <> 'admin' THEN ${campaignPriceSql()} END ASC, ` +
      "CASE pr.status WHEN 'active' THEN 1 WHEN 'scheduled' THEN 2 WHEN 'paused' THEN 3 ELSE 4 END, pr.start_date DESC, pr.id DESC",
      [role],
    )
    const offers = new Set()
    return rows.filter(row => {
      if (role === 'admin') return true
      if (offers.has(row.productId) || Number(row.currentPrice) >= Number(row.regularPrice)) return false
      offers.add(row.productId)
      return true
    }).map((row) => ({
      ...row,
      regularPrice: Number(row.regularPrice),
      currentPrice: Number(row.currentPrice),
      discountValue: Number(row.discountValue),
      revenue: Number(row.revenue),
    }))
  },

  async create(db, data) {
    const { requestId, ...fields } = data
    const values = [fields.productId, fields.discountType, fields.discountValue, fields.startDate, fields.endDate,
      fields.status || 'scheduled', fields.userId]
    async function insert(connection) {
      const { rows: [promotion] } = await connection.query(
        'INSERT INTO nazareth.promotions (product_id, discount_type, discount_value, start_date, end_date, status, created_by) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id', values,
      )
      return { ...fields, id: promotion.id }
    }
    if (requestId === undefined) return insert(db)
    if (typeof requestId !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(requestId)) {
      throw inputError('La solicitud de creación no es válida')
    }
    const normalizedId = requestId.toLowerCase()
    const fingerprint = createHash('sha256').update(JSON.stringify([
      fields.productId, fields.discountType, promotionValue(fields.discountType, fields.discountValue),
      new Date(fields.startDate).toISOString(), new Date(fields.endDate).toISOString(), values[5], fields.userId,
    ])).digest('hex')
    return transaction(db, async connection => {
      await connection.query('SELECT pg_advisory_xact_lock(73643, hashtext($1))', [normalizedId])
      const { rows: [previous] } = await connection.query(
        'SELECT promotion_id, fingerprint FROM nazareth.promotion_creation_requests WHERE request_id = $1', [normalizedId],
      )
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw inputError('La solicitud de creación ya se utilizó con otros datos', 409)
        return { ...fields, id: previous.promotion_id }
      }
      const created = await insert(connection)
      await connection.query(
        'INSERT INTO nazareth.promotion_creation_requests (request_id, fingerprint, promotion_id) VALUES ($1, $2, $3)',
        [normalizedId, fingerprint, created.id],
      )
      return created
    })
  },

  async update(db, id, data) {
    const { rowCount } = await db.query(
      'UPDATE nazareth.promotions SET product_id = $1, discount_type = $2, discount_value = $3, ' +
      'start_date = $4, end_date = $5, status = $6 WHERE id = $7',
      [data.productId, data.discountType, data.discountValue, data.startDate, data.endDate, data.status, id],
    )
    return rowCount ? { ...data, id: Number(id) } : null
  },

  async updateStatus(db, id, status) {
    const { rowCount } = await db.query('UPDATE nazareth.promotions SET status = $1 WHERE id = $2', [status, id])
    return rowCount ? { id: Number(id), status } : null
  },

  async remove(db, id) {
    const { rowCount } = await db.query('DELETE FROM nazareth.promotions WHERE id = $1', [id])
    return rowCount > 0
  },
}
