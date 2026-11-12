import { pool } from '../config/db.js'
import { auth } from '../middleware/auth.js'
import { createSalesRouter } from './salesRouter.js'

export default createSalesRouter({ db: pool, authenticate: auth })
