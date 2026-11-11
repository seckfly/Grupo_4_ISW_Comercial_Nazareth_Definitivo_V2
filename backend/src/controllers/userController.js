import { pool } from '../config/db.js'
import { supabaseAdmin } from '../config/supabase.js'
import { User } from '../models/User.js'
import { canChangeAccess, validateUserPayload } from '../services/userService.js'

function publicProfile({ auth_user_id, ...profile }) {
  return profile
}

function operationError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode })
}

function adminAuth() {
  if (!supabaseAdmin) throw operationError(503, 'La administración de credenciales requiere configuración de Supabase Auth')
  return supabaseAdmin
}

function checkAuthError(error) {
  if (!error) return
  if (['email_exists', 'user_already_exists'].includes(error.code)) {
    throw operationError(409, 'Ya existe una cuenta con este correo')
  }
  if (['weak_password', 'validation_failed', 'email_address_invalid'].includes(error.code)) {
    throw operationError(400, 'Supabase Auth rechazó el correo o la contraseña')
  }
  throw operationError(503, 'No se pudo actualizar la cuenta en Supabase Auth')
}

export async function listUsers(_req, res, next) {
  try { res.set('Cache-Control', 'no-store').json(await User.list(pool)) } catch (error) { next(error) }
}

export async function createUser(req, res, next) {
  const { name, email, password, role = 'client' } = req.body
  const [error] = validateUserPayload({ name, email, password, role })
  if (error) return res.status(400).json({ message: error })

  let connection
  let authUserId
  let commitStarted = false
  try {
    const auth = adminAuth()
    connection = await pool.connect()
    await connection.query('BEGIN')
    const { data, error: authError } = await auth.createUser({
      email: email.trim().toLowerCase(), password, email_confirm: true,
    })
    checkAuthError(authError)
    authUserId = data.user.id
    const id = await User.create(connection, { authUserId, name: name.trim(), role })
    if (role === 'client') await User.ensureCustomer(connection, id, name.trim())
    const profile = await User.findById(connection, id)
    commitStarted = true
    await connection.query('COMMIT')
    return res.status(201).json(publicProfile(profile))
  } catch (error) {
    await connection?.query('ROLLBACK').catch(() => {})
    if (authUserId && !commitStarted) {
      const { error: cleanupError } = await supabaseAdmin.deleteUser(authUserId).catch(() => ({ error: true }))
      if (cleanupError) console.error('No se pudo retirar una identidad sin perfil después de un fallo de alta')
    }
    return next(error)
  } finally {
    connection?.release()
  }
}

export async function updateUser(req, res, next) {
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) return res.status(400).json({ message: 'Usuario no válido' })

  const { name, email, password, role, isActive } = req.body
  const [error] = validateUserPayload({ name, email, password, role, isActive }, true)
  if (error) return res.status(400).json({ message: error })

  let connection
  try {
    connection = await pool.connect()
    await connection.query('BEGIN')
    await User.lock(connection, id)
    const target = await User.findById(connection, id)
    if (!target) throw operationError(404, 'Usuario no encontrado')
    const updates = { name: name?.trim() ?? target.name, role: role ?? target.role, isActive: isActive ?? target.isActive }
    if (!canChangeAccess(target, updates)) throw operationError(409, 'La cuenta administrativa protegida debe conservar su acceso')

    await User.update(connection, id, updates)
    if (updates.role === 'client') await User.ensureCustomer(connection, id, updates.name)
    const normalizedEmail = email?.trim().toLowerCase() ?? target.email
    if (normalizedEmail !== target.email || password) {
      const changes = {}
      if (normalizedEmail !== target.email) Object.assign(changes, { email: normalizedEmail, email_confirm: true })
      if (password) changes.password = password
      const { error: authError } = await adminAuth().updateUserById(target.auth_user_id, changes)
      checkAuthError(authError)
    }
    const updated = await User.findById(connection, id)
    await connection.query('COMMIT')
    return res.json(publicProfile(updated))
  } catch (error) {
    await connection?.query('ROLLBACK').catch(() => {})
    return next(error)
  } finally {
    connection?.release()
  }
}
