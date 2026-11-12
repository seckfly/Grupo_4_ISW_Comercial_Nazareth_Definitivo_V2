import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { env } from '../src/config/runtime.js'
const url=new URL(env.databaseUrl)
const output=resolve(process.env.BACKUP_DIRECTORY||'../database/backups')
await mkdir(output,{recursive:true})
const file=resolve(output,'nazareth-'+new Date().toISOString().replace(/[:.]/g,'-')+'.backup')
const pgDump=process.env.PG_DUMP_PATH||'C:/Program Files/PostgreSQL/18/bin/pg_dump.exe'
try {
  await promisify(execFile)(pgDump,['-h',url.hostname,'-p',url.port||'5432','-U',decodeURIComponent(url.username),'-d',decodeURIComponent(url.pathname.slice(1)),'--schema=nazareth','--format=custom','--no-owner','--no-acl','-f',file],{
    windowsHide:true,env:{...process.env,PGPASSWORD:decodeURIComponent(url.password),PGSSLMODE:'verify-full',...(env.databaseSslCaFile?{PGSSLROOTCERT:resolve(env.databaseSslCaFile)}:{})}
  })
  console.log('Copia de nazareth guardada en el directorio local de respaldo configurado.')
}catch {console.error('No se pudo guardar el respaldo. Comprueba PG_DUMP_PATH, TLS y los permisos; no compartas credenciales.');process.exitCode=1}
