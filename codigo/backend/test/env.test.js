import test from 'node:test'
import assert from 'node:assert/strict'
import { loadEnvironment } from '../src/config/env.js'

const fixture = {
  DATABASE_URL: 'postgresql://nazareth_app@db.example.test:5432/postgres',
  SUPABASE_URL: 'https://auth.example.test',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture',
}

test('loads PostgreSQL and Supabase settings', () => {
  const env = loadEnvironment(fixture)
  assert.equal(env.databaseUrl, fixture.DATABASE_URL)
  assert.equal(env.supabaseUrl, fixture.SUPABASE_URL)
  assert.equal(env.clientOrigin, 'http://127.0.0.1:5173')
})

test('requires PostgreSQL configuration and rejects connection URL options that could override TLS', () => {
  assert.throws(() => loadEnvironment({}), /DATABASE_URL/)
  assert.throws(() => loadEnvironment({ ...fixture, DATABASE_URL: fixture.DATABASE_URL + '?sslmode=disable' }), /TLS/)
})

test('rejects a secret key configured as publishable', () => {
  assert.throws(() => loadEnvironment({ ...fixture, SUPABASE_PUBLISHABLE_KEY: 'sb_secret_fixture' }), /publicable/)
})
