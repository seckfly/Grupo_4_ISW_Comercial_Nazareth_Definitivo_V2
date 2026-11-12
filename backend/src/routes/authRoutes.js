import { Router } from 'express'
import { auth } from '../middleware/auth.js'

const router = Router()
router.get('/me', auth, (req, res) => res.set('Cache-Control', 'no-store').json(req.user))

export default router
