import test from 'node:test'
import assert from 'node:assert/strict'
import { validateUserPayload, canChangeAccess } from '../src/services/userService.js'

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
