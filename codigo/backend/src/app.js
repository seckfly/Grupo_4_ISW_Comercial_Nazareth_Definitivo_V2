import { dashboard } from './services/dashboardService.js'
import { customerSales } from './services/saleService.js'
import cors from 'cors'
import { supabaseStorage } from './config/supabase.js'
import { photoRouter } from './routes/photoRoutes.js'
import { fullScopeRouter } from './routes/fullScopeRoutes.js'
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
import { createInventoryRouter } from './routes/inventoryRoutes.js'

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
app.use('/api/inventory', createInventoryRouter({ db: pool, authenticate: auth }))
app.use('/api', fullScopeRouter({db:pool,authenticate:auth}))
app.use('/api/product-photos',photoRouter({authenticate:auth,storage:supabaseStorage}))

app.get('/api/dashboard', auth, requireRole('admin'), async (req,res,next) => {
  try { res.set('Cache-Control','no-store'); res.json(await dashboard(pool,req.query.period || 'week')) } catch(error) { next(error) }
})
app.get('/api/customer-sales', auth, requireRole('client'), async (req,res,next) => {
  try { res.set('Cache-Control','no-store'); res.json(await customerSales(pool,req.user.id)) } catch(error) { next(error) }
})

app.use((_req, res) => res.status(404).json({ message: 'Ruta no encontrada' }))
app.use((error, _req, res, _next) => {
  const status = error.statusCode || error.status || (error.message === 'Stock insuficiente' ? 409 : 500)
  if (status === 500 && env.nodeEnv !== 'test') console.error('Error en API:', error.code || error.name)
  res.status(status).json({ message: status === 500 ? 'No se pudo completar la operación' : error.message })
})
