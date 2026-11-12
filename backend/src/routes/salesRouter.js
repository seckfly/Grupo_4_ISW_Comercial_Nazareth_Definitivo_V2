import { Router } from 'express'
import { requireRole } from '../middleware/role.js'
import { createSale, quoteSale, listSales, getSale, findSaleCustomers } from '../services/saleService.js'

import { customerBenefits } from '../services/loyaltyService.js'

export function createSalesRouter({ db, authenticate }) {
  const router = Router()
  router.use(authenticate, requireRole('admin'))
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
  router.get('/', async (req, res, next) => {
    try { res.json(await listSales(db, req.query.period)) } catch (error) { next(error) }
  })
  router.get('/customers', async (req, res, next) => {
    try { res.json(await findSaleCustomers(db, req.query.q, { allowEmpty: req.query.all === 'true' })) } catch (error) { next(error) }
  })
  router.get('/customers/:id/benefits', async (req, res, next) => {
    try { res.json(await customerBenefits(db, req.params.id, true)) } catch (error) { next(error) }
  })
  router.post('/quote', async (req, res, next) => {
    try { res.json(await quoteSale(db, req.body)) } catch (error) { next(error) }
  })
  router.post('/', async (req, res, next) => {
    try {
      const sale = await createSale(db, { ...req.body, userId: req.user.id })
      res.status(sale.replayed ? 200 : 201).json(sale)
    } catch (error) { next(error) }
  })
  router.get('/:id', async (req, res, next) => {
    try { res.json(await getSale(db, req.params.id)) } catch (error) { next(error) }
  })
  return router
}
