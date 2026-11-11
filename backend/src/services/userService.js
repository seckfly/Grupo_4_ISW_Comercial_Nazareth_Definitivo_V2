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
