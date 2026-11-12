import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { env } from './runtime.js'

const backendDirectory = fileURLToPath(new URL('../../', import.meta.url))
const ssl = { rejectUnauthorized: true }
if (env.databaseSslCaFile) {
  try {
    ssl.ca = readFileSync(resolve(backendDirectory, env.databaseSslCaFile), 'utf8')
  } catch {
    throw new Error('No se pudo leer el certificado de DATABASE_SSL_CA_FILE')
  }
}

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  ssl,
  max: 10,
  connectionTimeoutMillis: 5000,
})

pool.on('error', (error) => console.error('Error de conexión inactiva de PostgreSQL:', error.code || error.name))

export async function verifyDatabaseConnection() {
  const { rows: [connection] } = await pool.query('SELECT current_user AS role')
  if (connection.role !== 'nazareth_app') throw new Error('DATABASE_URL debe usar el rol nazareth_app')
  await pool.query('SELECT id FROM nazareth.profiles LIMIT 0')
  await pool.query('SELECT email FROM nazareth.account_directory LIMIT 0')
  await pool.query('SELECT nazareth.session_is_active(NULL, NULL)')
}
