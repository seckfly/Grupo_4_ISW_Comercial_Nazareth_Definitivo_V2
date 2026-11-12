import { Router } from 'express'
import { listUsers, createUser, updateUser, deleteUser } from '../controllers/userController.js'
import { auth } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'

const router = Router()
router.use(auth, requireRole('admin'))
router.get('/', listUsers)
router.post('/', createUser)
router.put('/:id', updateUser)
router.delete('/:id', deleteUser)

export default router
