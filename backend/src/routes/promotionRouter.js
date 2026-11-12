import { Router } from 'express'
import { requireRole } from '../middleware/role.js'
import { Promotion } from '../models/Promotion.js'
import { validatePromotionInput } from '../services/promotionService.js'
import { positiveId,inputError } from '../../../shared/numbers.mjs'
export function createPromotionRouter({db,authenticate}) {
  const router=Router(),handle=work=>async(req,res,next)=>{try{res.json(await work(req))}catch(error){next(error)}}
  const data=req=>{const validation=validatePromotionInput(req.body);if(!validation.valid)throw inputError(validation.message);return {...req.body,productId:positiveId(req.body.productId),userId:req.user.id}}
  router.use(authenticate)
  router.get('/',handle(req=>Promotion.list(db,req.user.role)))
  router.use(requireRole('admin'))
  router.post('/',handle(req=>Promotion.create(db,data(req))))
  router.put('/:id',handle(async req=>{const saved=await Promotion.update(db,positiveId(req.params.id),data(req));if(!saved)throw inputError('Campaña no encontrada',404);return saved}))
  router.patch('/:id/status',handle(async req=>{if(!['active','scheduled','paused','finished'].includes(req.body.status))throw inputError('Estado no válido');const saved=await Promotion.updateStatus(db,positiveId(req.params.id),req.body.status);if(!saved)throw inputError('Campaña no encontrada',404);return saved}))
  router.delete('/:id',handle(async req=>{if(!await Promotion.remove(db,positiveId(req.params.id)))throw inputError('Campaña no encontrada',404);return {removed:true}}))
  return router
}
