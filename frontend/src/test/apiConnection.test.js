import { afterEach, expect, it, vi } from 'vitest'
import { api } from '../services/api'

vi.mock('../services/supabase', () => ({ supabase: null }))
afterEach(() => vi.unstubAllGlobals())

it('reintenta una consulta y usa la misma solicitud al volver a guardar una campaña', async () => {
  const fetch = vi.fn()
    .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockResolvedValueOnce(new Response('[]'))
    .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockResolvedValueOnce(new Response('{"id":3}'))
  vi.stubGlobal('fetch', fetch)
  await expect(api.products()).resolves.toEqual([])
  await expect(api.createPromotion({ requestId: 'misma-solicitud', productId: 7 })).resolves.toEqual({ id: 3 })
  expect(fetch).toHaveBeenCalledTimes(4)
  expect(fetch.mock.calls[2][1].body).toBe(fetch.mock.calls[3][1].body)
})

it('una escritura sin identificador informa el fallo en español sin enviarla dos veces', async () => {
  const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
  vi.stubGlobal('fetch', fetch)
  await expect(api.createUser({ name: 'QA' })).rejects.toThrow('Revisa si se guardó antes de repetirla')
  expect(fetch).toHaveBeenCalledTimes(1)
})

it('respeta la cancelación y mantiene los mensajes de validación', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"message":"Completa el nombre"}', { status: 400 }))
  vi.stubGlobal('fetch', fetch)
  const controller = new AbortController()
  controller.abort()
  await expect(api.inventory(controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  expect(fetch).not.toHaveBeenCalled()
  await expect(api.createUser({})).rejects.toMatchObject({ status: 400, message: 'Completa el nombre' })
  expect(fetch).toHaveBeenCalledTimes(1)
})
