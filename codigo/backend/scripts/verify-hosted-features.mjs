// Explicit opt-in verification. Creates only temporary Auth users and one private namespace bucket.
// Never prints passwords, keys or tokens and never changes business rows.
import { createClient } from '@supabase/supabase-js'
import express from 'express'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import { env } from '../src/config/runtime.js'
import { changeOwnPassword } from '../../frontend/src/services/password.js'
import { photoRouter } from '../src/routes/photoRoutes.js'
import { createAuthMiddleware } from '../src/services/sessionService.js'
if(!env.secretKey)throw new Error('Configura SUPABASE_SECRET_KEY solo en backend/.env para esta verificación explícita')
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}
const privileged=createClient(env.supabaseUrl,env.secretKey,options)
const client=()=>createClient(env.supabaseUrl,env.publishableKey,options)
const users=[],profiles=new Map(),bucket='nazareth-test-'+randomUUID()
let bucketCreated=false,server,stage='auth-test-account'
const result={auth:[],storage:false,anonymousWriteDenied:false,businessRowsChanged:false}
try {
  for(const role of ['admin','client']) {
    const password='Qa!'+randomUUID()+'8a',next='Next!'+randomUUID()+'9b',email='nazareth-test-'+randomUUID()+'@example.com'
    const created=await privileged.auth.admin.createUser({email,password,email_confirm:true})
    if(created.error)throw Error('No se pudo crear la cuenta temporal de Auth: HTTP '+created.error.status+' '+(created.error.code||'Auth rechazó la clave configurada'))
    users.push(created.data.user.id)
    profiles.set(created.data.user.id,{id:users.length,name:'Cuenta temporal',role,is_active:true,session_active:true})
    const session=client(),signed=await session.auth.signInWithPassword({email,password})
    if(signed.error)throw Error('No se pudo iniciar la cuenta temporal: '+signed.error.code)
    await changeOwnPassword({client:session,makeVerifier:client,currentPassword:password,password:next,confirmation:next})
    const retry=client(),again=await retry.auth.signInWithPassword({email,password:next})
    assert.equal(again.error,null)
    const old=await client().auth.signInWithPassword({email,password});assert.ok(old.error)
    result.auth.push({role,passwordChanged:true,newLogin:true,oldPasswordRejected:true})
    profiles.get(created.data.user.id).token=again.data.session.access_token
  }
  stage='storage-test-bucket'
  const made=await privileged.storage.createBucket(bucket,{public:true,fileSizeLimit:2097152,allowedMimeTypes:['image/png','image/jpeg','image/webp']})
  if(made.error)throw Error('No se pudo crear el bucket temporal: '+made.error.statusCode)
  bucketCreated=true
  const verifier=client()
  const authenticate=createAuthMiddleware({getUser:token=>verifier.auth.getUser(token),findProfile:async id=>profiles.get(id)})
  const app=express()
  app.use('/photos',photoRouter({authenticate,storage:{from:()=>privileged.storage.from(bucket)}}))
  app.use((error,_req,res,_next)=>res.status(error.statusCode||error.status||500).json({message:'Solicitud rechazada'}))
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))})
  const url='http://127.0.0.1:'+server.address().port+'/photos'
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')
  const admin=[...profiles.values()].find(p=>p.role==='admin'),customer=[...profiles.values()].find(p=>p.role==='client')
  const upload=async(token,body,type='image/png')=>fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':type},body})
  assert.equal((await upload(customer.token,png)).status,403)
  assert.equal((await upload(admin.token,Buffer.from('<svg/>'),'image/svg+xml')).status,400)
  assert.equal((await upload(admin.token,Buffer.alloc(2097153))).status,413)
  const response=await upload(admin.token,png);assert.equal(response.status,200)
  const stored=await response.json(),download=await fetch(stored.url);assert.equal(download.status,200)
  assert.deepEqual(Buffer.from(await download.arrayBuffer()),png)
  const denied=await client().storage.from(bucket).upload('anonymous.png',png,{contentType:'image/png'})
  assert.ok(denied.error)
  result.storage=true;result.anonymousWriteDenied=true
  console.log(JSON.stringify(result))
} catch(error) {
  console.error(JSON.stringify({verified:false,stage,message:error.message,businessRowsChanged:false}))
  process.exitCode=1
} finally {
  if(server)await new Promise(resolve=>server.close(resolve))
  if(bucketCreated) {
    // This UUID bucket was created above. No existing bucket or business object is touched.
    await privileged.storage.emptyBucket(bucket)
    await privileged.storage.deleteBucket(bucket)
  }
  for(const id of users)await privileged.auth.admin.deleteUser(id)
}
