import { Router } from 'express'
import { requireRole } from '../middleware/role.js'
import { listInventory, createProduct, updateProduct, productHistory, adjustInventory, setProductArchived, deleteProduct } from '../services/inventoryService.js'

export function createInventoryRouter({ db, authenticate }) {
  const router = Router()
  router.use(authenticate, requireRole('admin'))
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next() })

  router.get('/', async (_req, res, next) => {
    try { res.json(await listInventory(db)) } catch (error) { next(error) }
  })
  router.post('/products', async (req, res, next) => {
    try { res.status(201).json(await createProduct(db, req.body, req.user.id)) } catch (error) { next(error) }
  })
  router.put('/products/:id', async (req, res, next) => {
    try { res.json(await updateProduct(db, req.params.id, req.body)) } catch (error) { next(error) }
  })
  router.patch('/products/:id/archive', async (req, res, next) => {
    try { res.json(await setProductArchived(db, req.params.id, req.body?.archived)) } catch (error) { next(error) }
  })
  router.delete('/products/:id', async (req, res, next) => {
    try { res.json(await deleteProduct(db, req.params.id, req.body?.confirmation)) } catch (error) { next(error) }
  })
  router.get('/products/:id/history', async (req, res, next) => {
    try { res.json(await productHistory(db, req.params.id)) } catch (error) { next(error) }
  })
  router.post('/products/:id/adjustments', async (req, res, next) => {
    try {
      const result = await adjustInventory(db, req.params.id, req.body, req.user.id)
      res.status(result.replayed ? 200 : 201).json(result)
    } catch (error) { next(error) }
  })

  return router
}
