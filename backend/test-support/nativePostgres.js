import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createServer } from 'node:net'
import { mkdtemp, writeFile, unlink, rm, realpath } from 'node:fs/promises'
import { tmpdir, platform, arch } from 'node:os'
import { join, dirname, basename } from 'node:path'
import { pathToFileURL } from 'node:url'
import { randomBytes } from 'node:crypto'
import pg from 'pg'

const execute = promisify(execFile)

export async function nativePostgres() {
  const os = platform() === 'win32' ? 'windows' : platform()
  const binaries = await import('@embedded-postgres/' + os + '-' + arch())
  const packageRoot = dirname(dirname(dirname(binaries.postgres)))
  const { hydrateSymlinks } = await import(pathToFileURL(join(packageRoot, 'scripts', 'hydrate-symlinks.js')))
  await hydrateSymlinks()

  const directory = await mkdtemp(join(tmpdir(), 'nazareth-sales-test-'))
  const data = join(directory, 'data')
  const password = randomBytes(24).toString('hex')
  const passwordFile = join(directory, 'initial-password')
  const listener = createServer()
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve))
  const port = listener.address().port
  await new Promise((resolve) => listener.close(resolve))
  let started = false
  let admin
  let pool

  async function close() {
    await pool?.end()
    await admin?.end()
    if (started) await execute(binaries.pg_ctl, ['-D', data, 'stop', '-m', 'fast', '-w'], { windowsHide: true, timeout: 15000 })
    const resolved = await realpath(directory)
    if (dirname(resolved) !== await realpath(tmpdir()) || !basename(resolved).startsWith('nazareth-sales-test-')) {
      throw new Error('La limpieza requiere el directorio temporal de esta prueba')
    }
    await rm(resolved, { recursive: true, force: true })
  }

  try {
    await writeFile(passwordFile, password, { mode: 0o600 })
    await execute(binaries.initdb, ['-D', data, '-U', 'postgres', '-A', 'scram-sha-256', '--pwfile=' + passwordFile, '--encoding=UTF8', '--locale=C'], { windowsHide: true, timeout: 30000 })
    await unlink(passwordFile)
    await execute(binaries.pg_ctl, ['-D', data, '-l', join(directory, 'postgres.log'), '-o', '-h 127.0.0.1 -p ' + port, '-w', 'start'], { windowsHide: true, timeout: 30000 })
    started = true
    admin = new pg.Client({ host: '127.0.0.1', port, user: 'postgres', password, database: 'postgres' })
    await admin.connect()
    return {
      admin,
      async applicationPool() {
        // La contraseña aleatoria contiene exclusivamente dígitos hexadecimales.
        await admin.query("ALTER ROLE nazareth_app PASSWORD '" + password + "'")
        pool = new pg.Pool({ host: '127.0.0.1', port, user: 'nazareth_app', password, database: 'postgres', max: 5 })
        return pool
      },
      close,
    }
  } catch (error) {
    await close()
    throw error
  }
}
