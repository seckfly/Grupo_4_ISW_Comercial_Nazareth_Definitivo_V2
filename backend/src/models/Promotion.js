export const Promotion = {
  async list(db, role) {
    const { rows } = await db.query(
      'SELECT pr.id, pr.product_id AS "productId", p.name AS product, p.image_url AS "imageUrl", ' +
      'p.sale_price AS "regularPrice", pr.discount_type AS "discountType", ' +
      'pr.discount_value AS "discountValue", pr.start_date AS "startDate", pr.end_date AS "endDate", ' +
      'pr.status, pr.usage_count AS "usageCount", pr.revenue ' +
      'FROM nazareth.promotions AS pr JOIN nazareth.products AS p ON p.id = pr.product_id ' +
      "WHERE $1 = 'admin' OR (p.is_active AND pr.status = 'active' AND now() BETWEEN pr.start_date AND pr.end_date) " +
      "ORDER BY CASE pr.status WHEN 'active' THEN 1 WHEN 'scheduled' THEN 2 WHEN 'paused' THEN 3 ELSE 4 END, pr.start_date DESC",
      [role],
    )
    return rows.map((row) => ({
      ...row,
      regularPrice: Number(row.regularPrice),
      discountValue: Number(row.discountValue),
      revenue: Number(row.revenue),
    }))
  },

  async create(db, data) {
    const { rows: [promotion] } = await db.query(
      'INSERT INTO nazareth.promotions (product_id, discount_type, discount_value, start_date, end_date, status, created_by) ' +
      'VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [data.productId, data.discountType, data.discountValue, data.startDate, data.endDate, data.status || 'scheduled', data.userId],
    )
    return { ...data, id: promotion.id }
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
