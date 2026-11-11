import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
import { createPromotion,deletePromotion,listPromotions,updatePromotion,updatePromotionStatus } from '../controllers/promotionController.js'
const router=Router()
router.use(auth)
router.get('/',listPromotions)
router.post('/',requireRole('admin'),createPromotion)
router.put('/:id',requireRole('admin'),updatePromotion)
router.patch('/:id/status',requireRole('admin'),updatePromotionStatus)
router.delete('/:id',requireRole('admin'),deletePromotion)
export default router
