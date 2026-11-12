import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import { updateOwnPhone, deleteOwnAccount } from '../controllers/userController.js'

const router = Router()
router.get('/me', auth, (req, res) => res.set('Cache-Control', 'no-store').json(req.user))
router.put('/phone', auth, updateOwnPhone)
router.delete('/me', auth, deleteOwnAccount)

export default router
