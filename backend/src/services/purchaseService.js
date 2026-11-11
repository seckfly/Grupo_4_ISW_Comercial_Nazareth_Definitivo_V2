import { decimalUnits, decimalText, lineAmount, positiveId, inputError } from '../../../shared/numbers.mjs'
import { transaction } from './stockService.js'
const text = (value, label) => { if(typeof value !== 'string' || !value.trim()) throw inputError('Completa '+label); return value.trim() }
const positive = value => { const n=decimalUnits(value); if(n<=0) throw inputError('La cantidad y el costo deben ser positivos'); return n }
export async function purchaseOrders(db) {
  const {rows}=await db.query(`SELECT o.*, COALESCE((SELECT json_agg(i ORDER BY i.id) FROM
    (SELECT oi.*,p.name,p.unit FROM nazareth.purchase_order_items oi JOIN nazareth.products p ON p.id=oi.product_id WHERE oi.order_id=o.id) i),'[]') AS items
    FROM nazareth.purchase_orders o ORDER BY o.created_at DESC,o.id DESC`)
  return rows
}
function orderInput(input) {
  const supplier = [
    text(input.supplierName, 'razón social'),
    text(input.supplierRuc, 'RUC'),
    text(input.supplierPhone, 'teléfono'),
  ]
  if (!Array.isArray(input.items) || !input.items.length) throw inputError('Agrega líneas a la orden')
  const items = input.items.map(item => ({
    productId: positiveId(item.productId), quantity: positive(item.quantity), cost: positive(item.cost),
  }))
  return { supplier, items }
}

async function insertOrder(db, { supplier, items }, userId) {
  const total = items.reduce((sum, item) => sum + lineAmount(item.quantity, item.cost), 0)
  const { rows: [order] } = await db.query(`INSERT INTO nazareth.purchase_orders
    (supplier_name,supplier_ruc,supplier_phone,estimated_total,created_by)
    VALUES($1,$2,$3,$4,$5) RETURNING *`, [...supplier, decimalText(total), userId])
  const lines = []
  for (const item of items) {
    const { rows: [line] } = await db.query(`INSERT INTO nazareth.purchase_order_items
      (order_id,product_id,quantity,unit_cost)
      SELECT $1,id,$3,$4 FROM nazareth.products WHERE id=$2 AND archived_at IS NULL AND retired_at IS NULL RETURNING id`,
    [order.id, item.productId, decimalText(item.quantity), decimalText(item.cost)])
    if (!line) throw inputError('El producto no existe o está archivado', 409)
    lines.push({ id: line.id, quantity: item.quantity })
  }
  return { order, lines }
}

export async function createOrder(pool, input, userId) {
  const data = orderInput(input)
  return transaction(pool, async db => (await insertOrder(db, data, userId)).order, true)
}

export async function registerDirectPurchase(pool, input, userId) {
  const data = orderInput(input)
  const reference = text(input.reference, 'referencia de recepción')
  return transaction(pool, async db => {
    const { order, lines } = await insertOrder(db, data, userId)
    await recordReceipt(db, order.id, reference, lines, userId)
    return { ...order, status: 'received' }
  }, true)
}

export async function cancelOrder(pool,id) {
  return transaction(pool,async db=>{
    const {rows:[order]}=await db.query('SELECT * FROM nazareth.purchase_orders WHERE id=$1 FOR UPDATE',[positiveId(id)])
    if(!order) throw inputError('Orden no encontrada',404)
    if(order.status==='cancelled') return order
    const {rows}=await db.query('SELECT id FROM nazareth.receipts WHERE order_id=$1',[order.id])
    if(order.status!=='pending'||rows.length) throw inputError('Una orden con recepciones no puede anularse',409)
    const {rows:[saved]}=await db.query(`UPDATE nazareth.purchase_orders SET status='cancelled' WHERE id=$1 RETURNING *`,[order.id]); return saved
  },true)
}
export async function receiveOrder(pool,id,input,userId) {
  const reference=text(input.reference,'referencia de recepción')
  if(!Array.isArray(input.items)||!input.items.length) throw inputError('Indica las cantidades recibidas')
  const ids=new Set()
  const lines=input.items.map(i=>{const id=positiveId(i.itemId);if(ids.has(id))throw inputError('Línea duplicada');ids.add(id);return {id,quantity:positive(i.quantity)}})
  return transaction(pool, db => recordReceipt(db, positiveId(id), reference, lines, userId), true)
}

async function recordReceipt(db, id, reference, lines, userId) {
  const {rows:[order]}=await db.query('SELECT * FROM nazareth.purchase_orders WHERE id=$1 FOR UPDATE',[id])
  if(!order||order.status!=='pending') throw inputError('La orden no está pendiente',409)
  const {rows:duplicate}=await db.query('SELECT id FROM nazareth.receipts WHERE reference=$1',[reference])
  if(duplicate.length) throw inputError('Referencia de recepción ya utilizada',409)
  const {rows:[receipt]}=await db.query('INSERT INTO nazareth.receipts(order_id,reference,received_by) VALUES($1,$2,$3) RETURNING *',[order.id,reference,userId])
  for(const line of lines) {
    const {rows:[item]}=await db.query('SELECT * FROM nazareth.purchase_order_items WHERE id=$1 AND order_id=$2 FOR UPDATE',[line.id,order.id])
    if(!item||line.quantity>decimalUnits(item.quantity)-decimalUnits(item.received_quantity))throw inputError('La cantidad supera el saldo por recibir',409)
    const quantity=decimalText(line.quantity)
    await db.query('UPDATE nazareth.purchase_order_items SET received_quantity=received_quantity+$1 WHERE id=$2',[quantity,item.id])
    const {rows:[stock]}=await db.query(`UPDATE nazareth.products SET current_stock=current_stock+$1 WHERE id=$2 AND archived_at IS NULL AND retired_at IS NULL RETURNING current_stock-$1::numeric AS before,current_stock AS after`,[quantity,item.product_id])
    if (!stock) throw inputError('Restaura el producto archivado antes de recibirlo', 409)
    await db.query('INSERT INTO nazareth.receipt_items(order_id,receipt_id,order_item_id,quantity) VALUES($1,$2,$3,$4)',[order.id,receipt.id,item.id,quantity])
    await db.query(`INSERT INTO nazareth.inventory_movements(product_id,type,quantity_change,stock_before,stock_after,receipt_id,created_by) VALUES($1,'entry',$2,$3,$4,$5,$6)`,[item.product_id,quantity,stock.before,stock.after,receipt.id,userId])
  }
  // Average all lines for the same product together before rounding the cost.
  await db.query(`WITH received AS (
    SELECT oi.product_id, SUM(ri.quantity) AS quantity, SUM(ri.quantity * oi.unit_cost) AS cost
    FROM nazareth.receipt_items ri
    JOIN nazareth.purchase_order_items oi ON oi.id = ri.order_item_id
    WHERE ri.receipt_id = $1
    GROUP BY oi.product_id
  )
  UPDATE nazareth.products p
  SET cost_price = ROUND(
    ((p.current_stock - received.quantity) * p.cost_price + received.cost) / p.current_stock, 2
  )
  FROM received
  WHERE p.id = received.product_id`, [receipt.id])
  await db.query(`UPDATE nazareth.purchase_orders SET status=CASE WHEN EXISTS(SELECT 1 FROM nazareth.purchase_order_items WHERE order_id=$1 AND received_quantity<quantity) THEN 'pending' ELSE 'received' END WHERE id=$1`,[order.id])
  return receipt
}
