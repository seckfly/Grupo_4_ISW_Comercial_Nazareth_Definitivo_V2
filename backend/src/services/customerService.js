import { positiveId, inputError } from '../../../shared/numbers.mjs'
import { transaction } from './stockService.js'
export async function customerForUser(db,userId) {
  const {rows:[customer]}=await db.query('SELECT id,name,phone,points FROM nazareth.customers WHERE user_id=$1',[positiveId(userId)])
  if(!customer)throw inputError('No existe un cliente asociado a esta cuenta',404)
  return customer
}
export async function customerDirectory(db) {
  const {rows}=await db.query(`SELECT c.id,p.name,p.email,c.phone,c.points,
    (SELECT COUNT(*)::int FROM nazareth.sales s WHERE s.customer_id=c.id AND s.status='completed') AS visits,
    COALESCE((SELECT SUM(total_amount)::float8 FROM nazareth.sales s WHERE s.customer_id=c.id AND s.status='completed'),0) AS spent,
    COALESCE((SELECT json_agg(x ORDER BY x."createdAt" DESC) FROM (SELECT id,created_at AS "createdAt",total_amount::float8 AS total,payment_method AS "paymentMethod" FROM nazareth.sales WHERE customer_id=c.id AND status='completed') x),'[]') AS purchases
    FROM nazareth.customers c JOIN nazareth.account_directory p ON p.id=c.user_id WHERE p.role='client' ORDER BY p.name,c.id`)
  return rows
}
export async function preferences(db,userId) {
  const customer=await customerForUser(db,userId)
  const {rows:favorites}=await db.query('SELECT product_id FROM nazareth.customer_favorites WHERE customer_id=$1',[customer.id])
  const {rows:list}=await db.query('SELECT i.product_id FROM nazareth.product_list_items i JOIN nazareth.product_lists l ON l.id=i.list_id WHERE l.customer_id=$1',[customer.id])
  return {favorites:favorites.map(i=>i.product_id),list:list.map(i=>i.product_id)}
}
export async function savePreferences(pool,userId,input) {
  if(!Array.isArray(input.favorites)||!Array.isArray(input.list))throw inputError('Selección no válida')
  const favorites=[...new Set(input.favorites.map(positiveId))],list=[...new Set(input.list.map(positiveId))]
  return transaction(pool,async db=>{
    const customer=await customerForUser(db,userId)
    await db.query('SELECT pg_advisory_xact_lock(71243,$1)',[customer.id])
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
