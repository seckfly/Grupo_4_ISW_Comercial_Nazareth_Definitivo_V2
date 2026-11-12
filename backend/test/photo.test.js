import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { photoRouter } from '../src/routes/photoRoutes.js'
import { photoUrl,validatePhoto,MAX_PHOTO_BYTES } from '../src/services/photoService.js'
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')
test('Fotos: formato, tamaño, URL y ausencia de foto',()=>{
  assert.equal(validatePhoto(png,'image/png'),'png')
  assert.throws(()=>validatePhoto(png,'image/jpeg'))
  assert.throws(()=>validatePhoto(Buffer.from('<svg/>'),'image/svg+xml'))
  assert.throws(()=>validatePhoto(Buffer.alloc(MAX_PHOTO_BYTES+1),'image/png'))
  assert.equal(photoUrl(null),null)
  assert.throws(()=>photoUrl('javascript:alert(1)'))
  assert.equal(photoUrl('https://project.supabase.co/storage/v1/object/public/product-photos/1/photo.png'),'https://project.supabase.co/storage/v1/object/public/product-photos/1/photo.png')
})
test('Fotos: solo administrador carga, bucket invocado y errores sin credenciales',async t=>{
  let uploaded
  const storage={from:bucket=>{assert.equal(bucket,'product-photos');return {upload:async(path,bytes,options)=>{uploaded={path,bytes,options};return {error:null}},getPublicUrl:path=>({data:{publicUrl:'https://project.supabase.co/storage/v1/object/public/product-photos/'+path}})}}}
  const app=express()
  app.use('/photos',photoRouter({storage,authenticate:(req,res,next)=>{req.user={id:1,role:req.get('role')};next()}}))
  app.use((error,_req,res,_next)=>res.status(error.statusCode||error.status||500).json({message:error.message}))
  const server=await new Promise(resolve=>{const server=app.listen(0,'127.0.0.1',()=>resolve(server))})
  t.after(()=>new Promise(resolve=>server.close(resolve)))
  const send=(role,body,type='image/png')=>fetch('http://127.0.0.1:'+server.address().port+'/photos',{method:'POST',headers:{role,'Content-Type':type},body})
  assert.equal((await send('client',png)).status,403);assert.equal(uploaded,undefined)
  assert.equal((await send('admin',png)).status,200)
  assert.deepEqual(uploaded.bytes,png)
  assert.equal(uploaded.options.upsert,false)
  assert.equal((await send('admin',Buffer.from('<svg/>'),'image/svg+xml')).status,400)
  assert.equal((await send('admin',Buffer.alloc(MAX_PHOTO_BYTES+1))).status,413)
})
