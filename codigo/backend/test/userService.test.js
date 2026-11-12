import test from 'node:test'
import assert from 'node:assert/strict'
import { validateUserPayload, canChangeAccess, canRemoveAccount, canManageUser } from '../src/services/userService.js'

test('valida los datos completos de un usuario nuevo', () => {
  assert.deepEqual(validateUserPayload({ name: 'Cliente de prueba', email: 'cliente@example.test', password: 'fixture-for-test', role: 'client' }), [])
})

test('permite editar sin obligar a cambiar la contraseña', () => {
  assert.deepEqual(validateUserPayload({ name: 'Cliente de prueba', email: 'cliente@example.test', role: 'client' }, true), [])
})

test('rechaza roles, correos y estados inválidos', () => {
  assert.equal(validateUserPayload({ email: 'invalido', role: 'provider', isActive: 'false' }, true).length, 3)
})

test('la cuenta protegida no puede perder el rol administrativo ni desactivarse', () => {
  const target = { isProtected: true }
  assert.equal(canChangeAccess(target, { role: 'admin', isActive: false }), false)
  assert.equal(canChangeAccess(target, { role: 'client', isActive: true }), false)
  assert.equal(canChangeAccess(target, { role: 'admin', isActive: true }), true)
  assert.equal(canChangeAccess({ isProtected: false }, { role: 'client', isActive: false }), true)
})

test('el teléfono del cliente es opcional y admite números nacionales e internacionales', () => {
  assert.deepEqual(validateUserPayload({ phone: '' }, true), [])
  assert.deepEqual(validateUserPayload({ phone: '987 654 321' }, true), [])
  assert.deepEqual(validateUserPayload({ phone: '+51 987 654 321' }, true), [])
  assert.equal(validateUserPayload({ phone: '123' }, true).length, 1)
  assert.equal(validateUserPayload({ phone: 'abc123456' }, true).length, 1)
  assert.equal(validateUserPayload({ phone: null }, true).length, 1)
})

test('solo el titular no protegido puede cerrar su propia cuenta', () => {
  const self = { id: 5, role: 'admin', isProtected: false }
  assert.equal(canRemoveAccount(self, { id: 5, role: 'admin', is_protected: false }, true), true)
  assert.equal(canRemoveAccount({ id: 6, role: 'client' }, { id: 6, role: 'client', is_protected: false }, true), true)
  assert.equal(canRemoveAccount({ id: 1, role: 'admin', isProtected: true }, { id: 1, role: 'admin', is_protected: true }, true), false)
  assert.equal(canRemoveAccount(self, { id: 9, role: 'client', is_protected: false }, true), false)
})

test('un administrador protegido puede retirar otros admins; uno normal no puede', () => {
  const target = { id: 9, role: 'admin', is_protected: false }
  assert.equal(canRemoveAccount({ id: 1, role: 'admin', isProtected: true }, target), true)
  assert.equal(canRemoveAccount({ id: 2, role: 'admin', isProtected: false }, target), false)
  assert.equal(canRemoveAccount({ id: 1, role: 'admin', isProtected: true }, { ...target, is_protected: true }), false)
  assert.equal(canRemoveAccount({ id: 2, role: 'admin', isProtected: false }, { id: 3, role: 'client', is_protected: false }), true)
})

test('los administradores secundarios no pueden alterar otros admins ni cambiar roles', () => {
  const secondary = { id: 2, role: 'admin', isProtected: false }
  const principal = { id: 1, role: 'admin', isProtected: true }
  assert.equal(canManageUser(secondary, { id: 1, role: 'admin' }), false)
  assert.equal(canManageUser(secondary, { id: 3, role: 'admin' }), false)
  assert.equal(canManageUser(secondary, { id: 2, role: 'admin' }, 'admin'), true)
  assert.equal(canManageUser(secondary, { id: 4, role: 'client' }, 'admin'), false)
  assert.equal(canManageUser(secondary, { id: 4, role: 'client' }, 'client'), true)
  assert.equal(canManageUser(principal, { id: 3, role: 'admin' }, 'client'), true)
})
