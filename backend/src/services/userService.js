import { inputError, positiveId } from '../../../shared/numbers.mjs'
import { transaction } from './stockService.js'

export function validateUserPayload(payload, partial = false) {
  const errors = []
  const { name, email, password, role, isActive } = payload
  if ((!partial || name !== undefined) && (typeof name !== 'string' || !name.trim())) errors.push('El nombre es obligatorio')
  if ((!partial || email !== undefined) && (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim()))) errors.push('El correo no es válido')
  if ((!partial || password !== undefined) && (typeof password !== 'string' || password.length < 8)) {
    errors.push('La contraseña debe tener 8 caracteres como mínimo')
  }
  if (role !== undefined && !['admin', 'client'].includes(role)) errors.push('El rol no es válido')
  if (isActive !== undefined && typeof isActive !== 'boolean') errors.push('El estado del acceso no es válido')
  return errors
}

export function canChangeAccess(target, { role, isActive }) {
  return !target.isProtected || (role === 'admin' && isActive)
}

export async function removeClientAccess(pool, actorId, targetId, confirmation, deleteIdentity) {
  const id = positiveId(targetId)
  if (confirmation !== 'ELIMINAR') throw inputError('Escribe ELIMINAR para confirmar')
  if (id === actorId) throw inputError('No puedes eliminar tu propia cuenta', 403)
  const target = await transaction(pool, async db => {
    const { rows: [profile] } = await db.query(`SELECT role, is_protected, auth_user_id, access_removed_at
      FROM nazareth.profiles WHERE id = $1 FOR UPDATE`, [id])
    if (!profile) throw inputError('Usuario no encontrado', 404)
    if (profile.role !== 'client' || profile.is_protected) throw inputError('Solo se pueden eliminar accesos de clientes', 403)
    if (profile.access_removed_at) return profile
    if (!profile.auth_user_id) throw inputError('Usuario no encontrado', 404)
    const { rows: [activity] } = await db.query(`SELECT EXISTS (
      SELECT 1 FROM nazareth.customers c JOIN nazareth.reservations r ON r.customer_id = c.id
      WHERE c.user_id = $1 AND r.status IN ('pending', 'confirmed') AND r.pickup_deadline > statement_timestamp()
    ) AS reservation`, [id])
    if (activity.reservation) throw inputError('Resuelve primero las reservas activas de este cliente', 409)
    await db.query('UPDATE nazareth.profiles SET is_active = false, access_removed_at = now() WHERE id = $1', [id])
    return profile
  }, true)
  if (target.auth_user_id) {
    // Supabase also updates the foreign key on the profile, so release its lock first.
    try {
      const { error } = await deleteIdentity(target.auth_user_id)
      if (error && error.status !== 404 && error.code !== 'user_not_found') return { id, removed: false }
    } catch { return { id, removed: false } }
  }
  return { id, removed: true }
}
