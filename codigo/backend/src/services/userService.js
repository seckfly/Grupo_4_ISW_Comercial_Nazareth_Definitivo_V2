import { inputError, positiveId } from '../../../shared/numbers.mjs'
import { transaction } from './stockService.js'

export function validateUserPayload(payload, partial = false) {
  const errors = []
  const { name, email, password, role, isActive, phone } = payload
  if ((!partial || name !== undefined) && (typeof name !== 'string' || !name.trim())) errors.push('El nombre es obligatorio')
  if ((!partial || email !== undefined) && (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim()))) errors.push('El correo no es válido')
  if ((!partial || password !== undefined) && (typeof password !== 'string' || password.length < 8)) {
    errors.push('La contraseña debe tener 8 caracteres como mínimo')
  }
  if (role !== undefined && !['admin', 'client'].includes(role)) errors.push('El rol no es válido')
  if (isActive !== undefined && typeof isActive !== 'boolean') errors.push('El estado del acceso no es válido')
  if (phone !== undefined) {
    const value = typeof phone === 'string' ? phone.trim() : null
    const digits = value?.replace(/\D/g, '').length ?? 0
    if (value === null || (value && (!/^[+\d()\s.-]+$/.test(value) || value.length > 25 || digits < 6 || digits > 15))) {
      errors.push('El teléfono debe contener entre 6 y 15 dígitos y solo caracteres telefónicos habituales')
    }
  }
  return errors
}

// Los administradores secundarios pueden gestionar clientes y sus propios datos,
// pero no alterar credenciales o roles de otros administradores.
export function canManageUser(actor, target, nextRole) {
  if (!actor || actor.role !== 'admin' || !target) return false
  if (target.role === 'admin' && actor.id !== target.id && !actor.isProtected) return false
  if (nextRole !== undefined && nextRole !== target.role && !actor.isProtected) return false
  return true
}

export function canChangeAccess(target, { role, isActive }) {
  return !target.isProtected || (role === 'admin' && isActive)
}

// Solo el administrador protegido puede retirar a otros administradores.
// El titular no protegido puede cerrar su propia cuenta con verificación de contraseña.
export function canRemoveAccount(actor, target, self = false) {
  if (!actor || !target || target.is_protected) return false
  if (self) return actor.id === target.id && ['admin', 'client'].includes(target.role)
  if (actor.role !== 'admin' || actor.id === target.id) return false
  if (target.role === 'admin') return Boolean(actor.isProtected)
  return target.role === 'client'
}

export async function removeAccountAccess(pool, actor, targetId, confirmation, deleteIdentity, self = false) {
  const id = positiveId(targetId)
  if (confirmation !== 'ELIMINAR') throw inputError('Escribe ELIMINAR para confirmar')
  const target = await transaction(pool, async db => {
    const { rows: [profile] } = await db.query(`SELECT id, role, is_protected, auth_user_id, access_removed_at
      FROM nazareth.profiles WHERE id = $1 FOR UPDATE`, [id])
    if (!profile) throw inputError('Usuario no encontrado', 404)
    if (!canRemoveAccount(actor, profile, self)) throw inputError('No tienes permiso para eliminar esta cuenta', 403)
    if (!profile.auth_user_id) return profile
    if (!profile.access_removed_at) {
      if (profile.role === 'client') {
        const { rows: [activity] } = await db.query(`SELECT EXISTS (
          SELECT 1 FROM nazareth.customers c JOIN nazareth.reservations r ON r.customer_id = c.id
          WHERE c.user_id = $1 AND r.status IN ('pending', 'confirmed') AND r.pickup_deadline > statement_timestamp()
        ) AS reservation`, [id])
        if (activity.reservation) throw inputError('Resuelve primero las reservas activas de esta cuenta', 409)
      }
      // Se conservan los IDs para ventas, inventario y reservas; se retiran datos de contacto.
      await db.query(`UPDATE nazareth.profiles
        SET is_active = false, access_removed_at = now(), name = 'Cuenta eliminada', phone = NULL
        WHERE id = $1`, [id])
      await db.query(`UPDATE nazareth.customers
        SET name = 'Cuenta eliminada', phone = NULL WHERE user_id = $1`, [id])
    }
    return profile
  }, true)
  if (target.auth_user_id) {
    // Se libera el bloqueo antes de eliminar la identidad de Supabase Auth.
    try {
      const { error } = await deleteIdentity(target.auth_user_id)
      if (error && error.status !== 404 && error.code !== 'user_not_found') return { id, removed: false }
    } catch { return { id, removed: false } }
  }
  return { id, removed: true }
}
