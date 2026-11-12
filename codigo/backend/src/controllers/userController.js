import { pool } from '../config/db.js'
import { supabaseAdmin } from '../config/supabase.js'
import { User } from '../models/User.js'
import { canChangeAccess, canManageUser, validateUserPayload, removeAccountAccess } from '../services/userService.js'
import { createClient } from '@supabase/supabase-js'
import { env } from '../config/runtime.js'

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
  const { name, email, password, role = 'client', phone } = req.body
  const [error] = validateUserPayload({ name, email, password, role, phone })
  if (error) return res.status(400).json({ message: error })
  if (role === 'admin' && !req.user.isProtected) return res.status(403).json({ message: 'Solo la cuenta principal puede crear administradores' })

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
    const id = await User.create(connection, { authUserId, name: name.trim(), role, phone: phone?.trim() || null })
    if (role === 'client') await User.ensureCustomer(connection, id, name.trim(), phone === undefined ? undefined : phone.trim() || null)
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

  const { name, email, password, role, isActive, phone } = req.body
  const [error] = validateUserPayload({ name, email, password, role, isActive, phone }, true)
  if (error) return res.status(400).json({ message: error })

  let connection
  try {
    connection = await pool.connect()
    await connection.query('BEGIN')
    await User.lock(connection, id)
    const target = await User.findById(connection, id)
    if (!target) throw operationError(404, 'Usuario no encontrado')
    if (target.removalPending) throw operationError(409, 'Este acceso está pendiente de eliminación')
    if (!canManageUser(req.user, target, role)) throw operationError(403, 'Solo la cuenta principal puede administrar otros administradores o cambiar roles')
    const updates = { name: name?.trim() ?? target.name, role: role ?? target.role, isActive: isActive ?? target.isActive }
    if (!canChangeAccess(target, updates)) throw operationError(409, 'La cuenta administrativa protegida debe conservar su acceso')

    await User.update(connection, id, updates)
    if (updates.role === 'client') {
      const initialPhone = phone === undefined && target.role === 'admin' ? target.phone : phone === undefined ? undefined : phone.trim() || null
      await User.ensureCustomer(connection, id, updates.name, initialPhone)
    } else if (phone !== undefined || target.role === 'client') {
      await User.setPhone(connection, id, 'admin', phone === undefined ? target.phone : phone.trim() || null)
    }
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

export async function deleteUser(req, res, next) {
  try {
    const auth = adminAuth()
    const result = await removeAccountAccess(pool, req.user, req.params.id, req.body?.confirmation,
      id => auth.deleteUser(id))
    res.status(result.removed ? 200 : 202).json(result)
  } catch (error) { next(error) }
}

export async function updateOwnPhone(req, res, next) {
  const phone = req.body?.phone
  const [error] = validateUserPayload({ phone }, true)
  if (typeof phone !== 'string' || error) return res.status(400).json({ message: error || 'El teléfono no es válido' })
  try {
    await User.setPhone(pool, req.user.id, req.user.role, phone.trim() || null)
    res.set('Cache-Control', 'no-store').json({ phone: phone.trim() || null })
  } catch (error) { next(error) }
}

export async function deleteOwnAccount(req, res, next) {
  const password = req.body?.password
  if (typeof password !== 'string' || !password || password.length > 1024) {
    return res.status(400).json({ message: 'Confirma tu contraseña actual' })
  }
  if (req.body?.confirmation !== 'ELIMINAR') return res.status(400).json({ message: 'Escribe ELIMINAR para confirmar' })
  if (req.user.isProtected) return res.status(403).json({ message: 'Esta cuenta administrativa está protegida' })
  try {
    // Verificación real en el servidor: una sesión abierta no basta para eliminar la identidad.
    const verifier = createClient(env.supabaseUrl, env.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const { data, error } = await verifier.auth.signInWithPassword({ email: req.user.email, password })
    const { rows: [profile] } = await pool.query('SELECT auth_user_id FROM nazareth.profiles WHERE id = $1', [req.user.id])
    if (error || !profile?.auth_user_id || data?.user?.id !== profile.auth_user_id) {
      return res.status(403).json({ message: 'Contraseña incorrecta. No se eliminó tu cuenta.' })
    }
    const result = await removeAccountAccess(pool, req.user, req.user.id, 'ELIMINAR',
      id => adminAuth().deleteUser(id), true)
    return res.status(result.removed ? 200 : 202).json(result)
  } catch (error) { next(error) }
}
