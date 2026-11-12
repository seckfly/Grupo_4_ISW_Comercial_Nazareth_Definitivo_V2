import { positiveId, inputError } from '../../../shared/numbers.mjs'
import { transaction } from './stockService.js'
const reservedPoints = `COALESCE((
  SELECT SUM(b.points_cost) FROM nazareth.loyalty_benefits b
  WHERE b.customer_id = c.id AND b.cancelled_at IS NULL
), 0)`

export async function customerForUser(db, userId, { includeBenefits = false } = {}) {
  const { rows: [customer] } = await db.query(`
    SELECT c.id, c.name, c.phone,
      (c.points + trunc(COALESCE((
        SELECT SUM(s.total_amount)
        FROM nazareth.sales s
        WHERE s.customer_id = c.id AND s.status = 'completed'
      ), 0)) - ${reservedPoints})::float8 AS points
      ${includeBenefits ? `, COALESCE((
        SELECT json_agg(json_build_object(
          'id', b.id, 'discount', b.discount_amount, 'pointsCost', b.points_cost,
          'claimedAt', b.claimed_at, 'saleId', b.sale_id,
          'status', CASE WHEN b.sale_id IS NOT NULL THEN 'used' WHEN b.cancelled_at IS NOT NULL THEN 'cancelled' ELSE 'available' END
        ) ORDER BY b.claimed_at DESC, b.id)
        FROM nazareth.loyalty_benefits b WHERE b.customer_id = c.id
      ), '[]') AS benefits` : ''}
    FROM nazareth.customers c
    WHERE c.user_id = $1`, [positiveId(userId)])
  if(!customer)throw inputError('No existe un cliente asociado a esta cuenta',404)
  return customer
}
export async function customerDirectory(db) {
  const { rows } = await db.query(`
    SELECT c.id, p.name, p.email, c.phone,
      (c.points + trunc(history.spent) - ${reservedPoints})::float8 AS points,
      history.visits, history.spent::float8 AS spent, history.purchases
    FROM nazareth.customers c
    JOIN nazareth.account_directory p ON p.id = c.user_id
    CROSS JOIN LATERAL (
      SELECT COUNT(*)::int AS visits, COALESCE(SUM(s.total_amount), 0) AS spent,
        COALESCE(json_agg(json_build_object(
          'id', s.id, 'createdAt', s.created_at, 'total', s.total_amount, 'paymentMethod', s.payment_method
        ) ORDER BY s.created_at DESC), '[]') AS purchases
      FROM nazareth.sales s
      WHERE s.customer_id = c.id AND s.status = 'completed'
    ) history
    WHERE p.role = 'client' AND p.access_removed_at IS NULL
    ORDER BY p.name, c.id`)
  return rows
}
export async function preferences(db,userId) {
  const customer=await customerForUser(db,userId)
  const {rows:favorites}=await db.query('SELECT f.product_id FROM nazareth.customer_favorites f JOIN nazareth.products p ON p.id=f.product_id WHERE f.customer_id=$1 AND p.retired_at IS NULL',[customer.id])
  const {rows:list}=await db.query('SELECT i.product_id FROM nazareth.product_list_items i JOIN nazareth.product_lists l ON l.id=i.list_id JOIN nazareth.products p ON p.id=i.product_id WHERE l.customer_id=$1 AND p.retired_at IS NULL',[customer.id])
  return {favorites:favorites.map(i=>i.product_id),list:list.map(i=>i.product_id)}
}
export async function savePreferences(pool,userId,input) {
  if(!Array.isArray(input.favorites)||!Array.isArray(input.list))throw inputError('Selección no válida')
  const requestedFavorites=[...new Set(input.favorites.map(positiveId))],requestedList=[...new Set(input.list.map(positiveId))]
  return transaction(pool,async db=>{
    const customer=await customerForUser(db,userId)
    await db.query('SELECT pg_advisory_xact_lock(71243,$1)',[customer.id])
    const { rows: retired } = await db.query('SELECT id FROM nazareth.products WHERE id = ANY($1::integer[]) AND retired_at IS NOT NULL',
      [[...requestedFavorites, ...requestedList]])
    const retiredIds = new Set(retired.map(product => product.id))
    const favorites = requestedFavorites.filter(id => !retiredIds.has(id))
    const list = requestedList.filter(id => !retiredIds.has(id))
    await db.query('DELETE FROM nazareth.customer_favorites WHERE customer_id=$1',[customer.id])
    for(const id of favorites)await db.query('INSERT INTO nazareth.customer_favorites(customer_id,product_id) VALUES($1,$2)',[customer.id,id])
    const {rows:lists}=await db.query('SELECT id FROM nazareth.product_lists WHERE customer_id=$1 ORDER BY id',[customer.id])
    let id=lists[0]?.id
    if(!id) {const {rows:[created]}=await db.query(`INSERT INTO nazareth.product_lists(customer_id,name) VALUES($1,'Mi lista') RETURNING id`,[customer.id]);id=created.id}
    await db.query('DELETE FROM nazareth.product_list_items WHERE list_id IN(SELECT id FROM nazareth.product_lists WHERE customer_id=$1)',[customer.id])
    for(const productId of list)await db.query('INSERT INTO nazareth.product_list_items(list_id,product_id) VALUES($1,$2)',[id,productId])
    return {favorites,list}
  })
}
