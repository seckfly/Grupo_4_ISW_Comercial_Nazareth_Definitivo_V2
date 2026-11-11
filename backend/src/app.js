import cors from 'cors'
import express from 'express'
import { env } from './config/runtime.js'
import { pool } from './config/db.js'
import { auth } from './middleware/auth.js'
import { requireRole } from './middleware/role.js'
import authRoutes from './routes/authRoutes.js'
import productRoutes from './routes/productRoutes.js'
import promotionRoutes from './routes/promotionRoutes.js'
import saleRoutes from './routes/saleRoutes.js'
import userRoutes from './routes/userRoutes.js'

export const app = express()

app.disable('x-powered-by')
app.use(cors({ origin: env.clientOrigin, credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timezone: 'America/Lima' }))
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/products', productRoutes)
app.use('/api/sales', saleRoutes)
app.use('/api/promotions', promotionRoutes)

app.get('/api/dashboard', auth, requireRole('admin'), async (_req, res, next) => {
  try {
    const [{ rows: [sales] }, { rows: lowStock }, { rows: recent }] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(total_amount), 0) AS "todayTotal", COUNT(*)::int AS "saleCount"
        FROM nazareth.sales WHERE status = 'completed'
        AND (created_at AT TIME ZONE 'America/Lima')::date = (now() AT TIME ZONE 'America/Lima')::date`),
      pool.query(`SELECT id, name, current_stock, min_stock_threshold FROM nazareth.products
        WHERE is_active AND current_stock <= min_stock_threshold ORDER BY current_stock LIMIT 5`),
      pool.query(`SELECT id, receipt_number, total_amount, payment_method, created_at
        FROM nazareth.sales ORDER BY created_at DESC LIMIT 8`)
    ])
    res.json({
      sales: { ...sales, todayTotal: Number(sales.todayTotal) },
      lowStock: lowStock.map((product) => ({
        ...product,
        current_stock: Number(product.current_stock),
        min_stock_threshold: Number(product.min_stock_threshold),
      })),
      recent: recent.map((sale) => ({ ...sale, total_amount: Number(sale.total_amount) })),
    })
  } catch (error) {
    next(error)
  }
})

app.use((_req, res) => res.status(404).json({ message: 'Ruta no encontrada' }))
app.use((error, _req, res, _next) => {
  const status = error.statusCode || (error.message === 'Stock insuficiente' ? 409 : 500)
  if (status === 500 && env.nodeEnv !== 'test') console.error('Error en API:', error.code || error.name)
  res.status(status).json({ message: status === 500 ? 'No se pudo completar la operación' : error.message })
})
