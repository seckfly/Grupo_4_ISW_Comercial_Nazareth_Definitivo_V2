import { randomBytes, createHash } from 'node:crypto'
import { decimalUnits, decimalText, lineAmount, positiveId, inputError, quantityForUnit, MONEY_MAX_UNITS } from '../../../shared/numbers.mjs'
import { transaction, heldSql } from './stockService.js'
import { customerForUser } from './customerService.js'
import { priceSql } from './priceService.js'
const uuid=/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i
export function reservationLines(input) {
  if(!Array.isArray(input?.items)||!input.items.length||input.items.length>3)throw inputError('Selecciona de uno a tres productos distintos')
  const ids=new Set()
  return input.items.map(item=>{
    const id=positiveId(item.productId),quantity=decimalUnits(item.quantity)
    if(ids.has(id)||quantity<=0)throw inputError('Selecciona productos distintos y cantidades positivas')
    ids.add(id);return {productId:id,quantity:decimalText(quantity)}
  }).sort((a,b)=>a.productId-b.productId)
}
const priceChanged = () => inputError('Los precios cambiaron. Revisa el total actualizado y vuelve a enviar tu solicitud.', 409)

async function writeItems(db,id,items,expectedPrices) {
  let total=0
  for(const [index,item] of items.entries()) {
    const {rows:[product]}=await db.query(`SELECT p.id,p.name,p.unit,${priceSql()}::text AS price,p.is_active FROM nazareth.products p WHERE id=$1`,[item.productId])
    if(!product?.is_active)throw inputError('Producto no disponible',409)
    const price = decimalUnits(product.price)
    if (expectedPrices?.has(item.productId) && expectedPrices.get(item.productId) !== price) throw priceChanged()
    total+=lineAmount(quantityForUnit(item.quantity, product.unit),price)
    await db.query('INSERT INTO nazareth.reservation_items(reservation_id,product_id,line_position,quantity,unit_price) VALUES($1,$2,$3,$4,$5)',[id,item.productId,index+1,item.quantity,product.price])
  }
  await db.query('UPDATE nazareth.reservations SET estimated_total=$1 WHERE id=$2',[decimalText(total),id])
  return total
}
export async function reservations(db,user) {
  const customer=user.role==='client'?await customerForUser(db,user.id):null
  const {rows}=await db.query(`SELECT r.*, c.name AS "customerName",c.phone,c.user_id AS "customerUserId",
    CASE WHEN r.status IN ('pending','confirmed') AND r.pickup_deadline<=now() THEN 'expired' ELSE r.status END AS status,
    COALESCE((SELECT json_agg(json_build_object('productId',p.id,'name',p.name,'unit',p.unit,'quantity',ri.quantity::float8,'price',ri.unit_price::float8) ORDER BY ri.line_position)
      FROM nazareth.reservation_items ri JOIN nazareth.products p ON p.id=ri.product_id WHERE ri.reservation_id=r.id),'[]') AS items
    FROM nazareth.reservations r JOIN nazareth.customers c ON c.id=r.customer_id
    WHERE ($1::integer IS NULL OR r.customer_id=$1) ORDER BY r.created_at DESC,r.id DESC`,[customer?.id??null])
  return rows
}
export async function requestReservation(pool,userId,input,generateCode=()=> 'NZ-'+randomBytes(6).toString('hex').toUpperCase()) {
  const items=reservationLines(input)
  const expectedTotal = input.expectedTotal === undefined ? null : decimalUnits(input.expectedTotal, { maxUnits: MONEY_MAX_UNITS })
  const expectedPrices = new Map(input.items.filter(item => item.expectedUnitPrice !== undefined)
    .map(item => [positiveId(item.productId), decimalUnits(item.expectedUnitPrice)]))
  if(!uuid.test(input.requestId||''))throw inputError('Solicitud no válida')
  const hash=createHash('sha256').update(JSON.stringify({userId,items})).digest('hex')
  return transaction(pool,async db=>{
    // Serializes idempotency without changing stock or availability.
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[input.requestId])
    const { rows: [profile] } = await db.query('SELECT is_active FROM nazareth.profiles WHERE id = $1', [userId])
    if (!profile?.is_active) throw inputError('La cuenta no tiene acceso activo', 403)
    const customer=await customerForUser(db,userId)
    const {rows:[previous]}=await db.query('SELECT * FROM nazareth.reservations WHERE request_id=$1',[input.requestId])
    if(previous) {if(previous.request_fingerprint!==hash)throw inputError('La solicitud ya se utilizó con otros datos',409);return previous}
    let saved
    for(let attempt=0;attempt<8&&!saved;attempt++) {
      const {rows}=await db.query(`INSERT INTO nazareth.reservations(customer_id,pickup_code,estimated_total,request_id,request_fingerprint) VALUES($1,$2,0,$3,$4) ON CONFLICT(pickup_code) DO NOTHING RETURNING *`,[customer.id,generateCode(),input.requestId,hash])
      saved=rows[0]
    }
    if(!saved)throw inputError('No se pudo generar un código único. Reintenta la solicitud.',503)
    const total = await writeItems(db, saved.id, items, expectedPrices)
    if (expectedTotal !== null && expectedTotal !== total) throw priceChanged()
    return (await db.query('SELECT * FROM nazareth.reservations WHERE id=$1',[saved.id])).rows[0]
  }, true)
}
export async function changeReservation(pool,user,id,input) {
  id=positiveId(id)
  return transaction(pool,async db=>{
    const {rows:[row]}=await db.query('SELECT * FROM nazareth.reservations WHERE id=$1 FOR UPDATE',[id])
    if(!row)throw inputError('Solicitud no encontrada',404)
    if(user.role!=='admin') {
      const own=await customerForUser(db,user.id)
      if(own.id!==row.customer_id)throw inputError('Solicitud no encontrada',404)
      if(input.action!=='cancel')throw inputError('No tienes permiso para esta acción',403)
    }
    if(input.action==='cancel'&&row.status==='cancelled')return row
    if(input.action==='confirm'&&row.status==='confirmed'&&new Date(row.pickup_deadline)>new Date())return row
    if(!['pending','confirmed'].includes(row.status))throw inputError('La solicitud ya fue cerrada',409)
    const {rows:[clock]}=await db.query('SELECT pickup_deadline>statement_timestamp() AS valid FROM nazareth.reservations WHERE id=$1',[id])
    if(!clock.valid)throw inputError('La solicitud venció',409)
    if(input.action==='edit') {
      const items=reservationLines(input)
      await db.query('DELETE FROM nazareth.reservation_items WHERE reservation_id=$1',[id])
      await writeItems(db,id,items)
      await db.query(`UPDATE nazareth.reservations SET status='pending',confirmed_at=NULL WHERE id=$1`,[id])
    } else if(input.action==='confirm') {
      const {rows:items}=await db.query(`SELECT p.id,p.name,p.current_stock-${heldSql('p','$1')} AS available,ri.quantity,p.is_active
        FROM nazareth.reservation_items ri JOIN nazareth.products p ON p.id=ri.product_id WHERE ri.reservation_id=$1 ORDER BY p.id FOR UPDATE OF p`,[id])
      for(const item of items)if(!item.is_active||decimalUnits(item.quantity)>decimalUnits(item.available))throw inputError('Unidades insuficientes: '+item.name,409)
      await db.query(`UPDATE nazareth.reservations SET status='confirmed',confirmed_at=now() WHERE id=$1`,[id])
    } else if(['cancel','reject'].includes(input.action)) {
      await db.query('UPDATE nazareth.reservations SET status=$1 WHERE id=$2',[input.action==='cancel'?'cancelled':'rejected',id])
    } else throw inputError('Acción no válida')
    return (await db.query('SELECT * FROM nazareth.reservations WHERE id=$1',[id])).rows[0]
  },true)
}
export async function validatePickup(db,id,cart,customerId) {
  const {rows:[reservation]}=await db.query(`SELECT *,pickup_deadline>statement_timestamp() AS valid FROM nazareth.reservations WHERE id=$1 FOR UPDATE`,[id])
  if(!reservation||reservation.status!=='confirmed'||!reservation.valid)throw inputError('El apartado no está confirmado o ha vencido',409)
  if(reservation.customer_id!==customerId)throw inputError('La venta debe vincular al cliente de la reserva')
  const {rows}=await db.query('SELECT product_id,quantity::text FROM nazareth.reservation_items WHERE reservation_id=$1 ORDER BY product_id',[id])
  if(rows.length!==cart.length||rows.some((row,index)=>row.product_id!==cart[index].productId||decimalUnits(row.quantity)!==cart[index].quantity))throw inputError('El detalle debe coincidir con el apartado confirmado')
}
