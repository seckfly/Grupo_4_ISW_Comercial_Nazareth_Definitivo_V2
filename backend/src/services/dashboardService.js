import { listSales } from './saleService.js'
import { listInventory } from './inventoryService.js'
import { paymentNames } from '../../../shared/paymentMethods.mjs'

const dateKey = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
const cents = value => Math.round(Number(value) * 100)
function paymentTotals(sales) {
  const totals = Object.fromEntries(Object.keys(paymentNames).map(method => [method, 0]))
  for (const sale of sales) totals[sale.paymentMethod] += cents(sale.total)
  return Object.fromEntries(Object.entries(totals).map(([method, amount]) => [method, amount / 100]))
}
export async function dashboard(db, period = 'week') {
  const connection = await db.connect()
  try {
    await connection.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const result = await snapshot(connection, period)
    await connection.query('COMMIT')
    return result
  } catch (error) {
    await connection.query('ROLLBACK')
    throw error
  } finally { connection.release() }
}

async function snapshot(db, period) {
  const sales = await listSales(db, period)
  const today = await listSales(db, 'today')
  const inventory = await listInventory(db)
  const currentProductIds = new Set(inventory.products.map(product => product.id))
  const { rows: clock } = await db.query(`SELECT now() AS now`)
  const now = clock[0].now
  const { rows: history } = await db.query(`SELECT created_at AS "createdAt", total_amount::float8 AS total FROM nazareth.sales
    WHERE status = 'completed' AND created_at >= ((now() AT TIME ZONE 'America/Lima')::date - 7) AT TIME ZONE 'America/Lima'`)
  const todayKey = dateKey(now)
  const day = new Date(todayKey + 'T12:00:00Z')
  const previous = Array.from({ length: 7 }, (_, index) => {
    const value = new Date(day); value.setUTCDate(value.getUTCDate() - index - 1); return dateKey(value)
  })
  const timeKey = value => new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(value))
  const currentTime = timeKey(now)
  const fullDays = previous.map(key => history.filter(sale => dateKey(sale.createdAt) === key))
  const yesterdaySales = fullDays[0]
  const previousTotal = yesterdaySales.reduce((sum, sale) => sum + cents(sale.total), 0)
  const partials = fullDays.map(rows => rows.filter(sale => timeKey(sale.createdAt) <= currentTime).reduce((sum, sale) => sum + cents(sale.total), 0))
  const todayComparableTotal = today.sales.filter(sale => timeKey(sale.createdAt) <= currentTime).reduce((sum, sale) => sum + cents(sale.total), 0)
  const full = fullDays.flat().reduce((sum, sale) => sum + cents(sale.total), 0)
  const partial = partials.reduce((sum, amount) => sum + amount, 0)
  const projection = partials.every(amount => amount > 0) && today.summary.saleCount > 0 ? Math.round(cents(today.summary.total) * full / partial) / 100 : null
  const comparison = partials[0] > 0 && todayComparableTotal > 0 ? Math.round((todayComparableTotal / partials[0] - 1) * 1000) / 10 : null
  const days = new Map()
  const start = new Date(day)
  if (period === 'month') start.setUTCDate(1)
  else if (period === 'week') start.setUTCDate(start.getUTCDate() - 6)
  for (let cursor = new Date(start); cursor <= day; cursor.setUTCDate(cursor.getUTCDate() + 1)) days.set(dateKey(cursor), 0)
  const demand = new Map()
  const hours = new Map()
  for (const sale of sales.sales) {
    const key = dateKey(sale.createdAt)
    days.set(key, (days.get(key) || 0) + cents(sale.total))
    const hour = timeKey(sale.createdAt).slice(0, 2)
    hours.set(hour, (hours.get(hour) || 0) + cents(sale.total))
    for (const item of sale.items) {
      if (!currentProductIds.has(item.productId)) continue
      const itemKey = item.productId + ':' + item.unit
      const row = demand.get(itemKey) || { productId: item.productId, name: item.name, unit: item.unit, sold: 0, revenue: 0 }
      row.sold += Math.round(item.quantity * 100)
      row.revenue += cents(item.subtotal)
      demand.set(itemKey, row)
    }
  }
  const { rows: movements } = await db.query(`SELECT m.id, m.type, m.created_at AS "createdAt", p.name,
    p.unit, m.quantity_change::float8 AS change, m.stock_before::float8 AS "stockBefore", m.stock_after::float8 AS "stockAfter"
    FROM nazareth.inventory_movements m JOIN nazareth.products p ON p.id=m.product_id ORDER BY m.created_at DESC,m.id DESC LIMIT 20`)
  const { rows: recentSales } = await db.query(`SELECT id, created_at AS "createdAt", total_amount::float8 AS total, payment_method AS "paymentMethod"
    FROM nazareth.sales WHERE status='completed' ORDER BY created_at DESC,id DESC LIMIT 20`)
  const activity = [...recentSales.map(sale => ({ ...sale, kind: 'sale' })),
    ...movements.filter(row => row.type !== 'sale').map(row => ({ ...row, kind: 'movement' }))]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || b.id - a.id).slice(0, 20)

  const {rows:movementSummary}=await db.query(`SELECT p.id AS "productId",p.name,p.unit,m.type,SUM(m.quantity_change)::float8 AS quantity,COUNT(*)::int AS operations
    FROM nazareth.inventory_movements m JOIN nazareth.products p ON p.id=m.product_id
    WHERE m.created_at>=($1::date AT TIME ZONE 'America/Lima') AND m.created_at<=now()
    GROUP BY p.id,p.name,p.unit,m.type ORDER BY p.name,p.id,m.type`,[[...days.keys()][0]])
  return { period, today: { ...today.summary, paymentTotals: paymentTotals(today.sales) }, yesterday: { total: previousTotal / 100, saleCount: yesterdaySales.length }, summary: sales.summary, paymentTotals: paymentTotals(sales.sales), projection, comparison,movementSummary,
    strongestHour: sales.sales.length >= 7 && new Set(sales.sales.map(sale => dateKey(sale.createdAt))).size >= 2 ? [...hours].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]))[0]?.[0] : null,
    trend: [...days].map(([date, amount]) => ({ date, d: date.slice(5), v: amount / 100 })),
    demand: [...demand.values()].map(row => ({ ...row, sold: row.sold / 100, revenue: row.revenue / 100 })).sort((a,b) => b.sold-a.sold || a.name.localeCompare(b.name)),
    lowStock: inventory.products.filter(product => product.isActive && product.lowStock), activity }
}
