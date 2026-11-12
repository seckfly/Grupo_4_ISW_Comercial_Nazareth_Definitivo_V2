import test from 'node:test'
import assert from 'node:assert/strict'
import { createAuthMiddleware } from '../src/services/sessionService.js'
import { requireRole } from '../src/middleware/role.js'

const authUserId = '00000000-0000-4000-8000-000000000001'
const sessionId = '00000000-0000-4000-8000-000000000002'
const payload = Buffer.from(JSON.stringify({ session_id: sessionId, role: 'admin' })).toString('base64url')
const authorization = 'Bearer header.' + payload + '.fixture-signature'
const profile = { id: 42, name: 'Cliente de prueba', role: 'client', is_active: true, session_active: true }
const identity = { data: { user: { id: authUserId, email: 'cliente@example.test' } } }

async function callMiddleware({ header = authorization, getUser = async () => identity, currentProfile = profile } = {}) {
  const req = { get: () => header }
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body },
  }
  const auth = createAuthMiddleware({
    getUser,
    async findProfile(userId, userSessionId) {
      assert.equal(userId, authUserId)
      assert.equal(userSessionId, sessionId)
      return currentProfile
    },
  })
  let authenticated = false
  await auth(req, res, (error) => {
    if (error) throw error
    authenticated = true
  })
  return { req, res, authenticated }
}

test('rejects missing or invalid authentication and reports a provider outage', async () => {
  assert.equal((await callMiddleware({ header: '' })).res.statusCode, 401)
  assert.equal((await callMiddleware({ getUser: async () => ({ error: { status: 401 } }) })).res.statusCode, 401)
  assert.equal((await callMiddleware({ getUser: async () => ({ error: { status: 503 } }) })).res.statusCode, 503)
})

test('denies profiles without active access and tokens from signed-out sessions', async () => {
  assert.equal((await callMiddleware({ currentProfile: null })).res.statusCode, 403)
  assert.equal((await callMiddleware({ currentProfile: { ...profile, is_active: false } })).res.statusCode, 403)
  assert.equal((await callMiddleware({ currentProfile: { ...profile, session_active: false } })).res.statusCode, 401)
})

test('takes the role from the database and permits only administrators on admin routes', async () => {
  const client = await callMiddleware()
  assert.equal(client.authenticated, true)
  assert.equal(client.req.user.role, 'client')
  requireRole('admin')(client.req, client.res, () => assert.fail('Unexpected access'))
  assert.equal(client.res.statusCode, 403)

  const admin = await callMiddleware({ currentProfile: { ...profile, role: 'admin' } })
  let allowed = false
  requireRole('admin')(admin.req, admin.res, () => { allowed = true })
  assert.equal(allowed, true)
})
