import { pool } from '../config/db.js'
import { auth } from '../middleware/auth.js'
import { createPromotionRouter } from './promotionRouter.js'
export default createPromotionRouter({db:pool,authenticate:auth})
