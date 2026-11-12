// One lock order for sale, receipt, adjustment and reservation lifecycle.
// No table/row lock is acquired before this transaction-scoped advisory lock.
export const lockStock = db => db.query('SELECT pg_advisory_xact_lock(73642)')
export const heldSql = (alias = 'p', exclude = 'NULL') => `COALESCE((SELECT SUM(ri.quantity)
  FROM nazareth.reservation_items ri JOIN nazareth.reservations r ON r.id=ri.reservation_id
  WHERE ri.product_id=${alias}.id AND r.status='confirmed' AND r.pickup_deadline>statement_timestamp()
  AND r.id IS DISTINCT FROM ${exclude}),0)`
export async function transaction(pool, work, stock = false) {
  const db = await pool.connect()
  try {
    await db.query('BEGIN')
    if (stock) await lockStock(db)
    const result = await work(db)
    await db.query('COMMIT')
    return result
  } catch(error) { await db.query('ROLLBACK').catch(()=>{}); throw error }
  finally { db.release() }
}
