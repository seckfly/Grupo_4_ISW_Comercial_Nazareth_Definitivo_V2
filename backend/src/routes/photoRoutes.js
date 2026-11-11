import express,{ Router } from 'express'
import { randomUUID } from 'node:crypto'
import { requireRole } from '../middleware/role.js'
import { validatePhoto,MAX_PHOTO_BYTES } from '../services/photoService.js'
export function photoRouter({authenticate,storage}) {
  const router=Router()
  router.post('/',authenticate,requireRole('admin'),express.raw({type:()=>true,limit:MAX_PHOTO_BYTES}),async(req,res,next)=>{
    try {
      if(!storage)return res.status(503).json({message:'Configura Supabase Storage y la clave privilegiada del backend'})
      const type=req.get('Content-Type'),extension=validatePhoto(req.body,type)
      const path=req.user.id+'/'+randomUUID()+'.'+extension
      const bucket=storage.from('product-photos')
      const {error}=await bucket.upload(path,req.body,{contentType:type,upsert:false})
      if(error)return res.status(503).json({message:'No se pudo cargar la foto. Comprueba el bucket product-photos.'})
      res.json({url:bucket.getPublicUrl(path).data.publicUrl})
    }catch(error){next(error)}
  })
  return router
}
