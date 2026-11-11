import { Router } from 'express'
import { requireRole } from '../middleware/role.js'
import { purchaseOrders, createOrder, registerDirectPurchase, cancelOrder, receiveOrder } from '../services/purchaseService.js'
import { customerDirectory, customerForUser, preferences, savePreferences } from '../services/customerService.js'
import { reservations,requestReservation,changeReservation } from '../services/reservationService.js'
const handle=work=>async(req,res,next)=>{try{res.json(await work(req))}catch(error){next(error)}}
export function fullScopeRouter({db,authenticate}) {
  const router=Router()
  router.use(['/customers','/customer-account','/preferences','/purchase-orders','/reservations'],authenticate,(_req,res,next)=>{res.set('Cache-Control','no-store');next()})
  router.get('/customers',requireRole('admin'),handle(()=>customerDirectory(db)))
  router.get('/reservations',handle(req=>reservations(db,req.user)))
  router.post('/reservations',requireRole('client'),handle(req=>requestReservation(db,req.user.id,req.body)))
  router.post('/reservations/:id',handle(req=>changeReservation(db,req.user,req.params.id,req.body)))
  router.get('/customer-account',requireRole('client'),handle(req=>customerForUser(db,req.user.id)))
  router.get('/preferences',requireRole('client'),handle(req=>preferences(db,req.user.id)))
  router.put('/preferences',requireRole('client'),handle(req=>savePreferences(db,req.user.id,req.body)))
  router.get('/purchase-orders',requireRole('admin'),handle(()=>purchaseOrders(db)))
  router.post('/purchase-orders',requireRole('admin'),handle(req=>createOrder(db,req.body,req.user.id)))
  router.post('/purchase-orders/direct',requireRole('admin'),handle(req=>registerDirectPurchase(db,req.body,req.user.id)))
  router.post('/purchase-orders/:id/cancel',requireRole('admin'),handle(req=>cancelOrder(db,req.params.id)))
  router.post('/purchase-orders/:id/receipts',requireRole('admin'),handle(req=>receiveOrder(db,req.params.id,req.body,req.user.id)))
  return router
}
