import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Rate limit fica no banco; aqui é controlado pelo teste
const guardRequest = vi.fn()
vi.mock('@/lib/security/rate-limit', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/security/rate-limit')>()),
  guardRequest: (...args: unknown[]) => guardRequest(...args),
}))

import { middleware } from '@/middleware'
import { createSessionToken } from '@/lib/auth/session'

const HOST = 'app.igreja.org'

async function cookieFor(role: 'admin' | 'professor' | 'monitor') {
  return `session=${await createSessionToken({ id: `id-${role}`, role, nome: role, session_version: 0 })}`
}

function req(path: string, init: { method?: string; cookie?: string; origin?: string } = {}) {
  const headers = new Headers({ host: HOST })
  if (init.cookie) headers.set('cookie', init.cookie)
  if (init.origin) headers.set('origin', init.origin)
  return new NextRequest(`https://${HOST}${path}`, { method: init.method ?? 'GET', headers })
}

const passed = (res: Response) => res.headers.get('x-middleware-next') === '1'

describe('middleware', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!'
    guardRequest.mockReset()
    guardRequest.mockResolvedValue({ status: 'ok', retryAfter: 0 })
  })

  it('API admin sem sessão → 401', async () => {
    const res = await middleware(req('/api/admin/users'))
    expect(res.status).toBe(401)
  })

  it('API admin com sessão de professor → 403', async () => {
    const res = await middleware(req('/api/admin/users', { cookie: await cookieFor('professor') }))
    expect(res.status).toBe(403)
  })

  it('API admin com sessão de admin → segue', async () => {
    const res = await middleware(req('/api/admin/users', { cookie: await cookieFor('admin') }))
    expect(passed(res)).toBe(true)
  })

  it('API de professor aceita professor e admin', async () => {
    expect(passed(await middleware(req('/api/professor/turmas', { cookie: await cookieFor('professor') })))).toBe(true)
    expect(passed(await middleware(req('/api/professor/turmas', { cookie: await cookieFor('admin') })))).toBe(true)
    expect((await middleware(req('/api/professor/turmas', { cookie: await cookieFor('monitor') }))).status).toBe(403)
  })

  it('cookie adulterado → 401', async () => {
    const res = await middleware(req('/api/admin/users', { cookie: 'session=abc.def' }))
    expect(res.status).toBe(401)
  })

  it('página admin sem sessão → redireciona para /login', async () => {
    const res = await middleware(req('/admin/dashboard'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(`https://${HOST}/login`)
  })

  it('monitor em página de professor volta para /login (sem loop)', async () => {
    const res = await middleware(req('/professor/chamada', { cookie: await cookieFor('monitor') }))
    expect(res.headers.get('location')).toBe(`https://${HOST}/login`)
  })

  it('POST vindo de outro site → 403 (CSRF)', async () => {
    const res = await middleware(req('/api/admin/users', {
      method: 'POST',
      cookie: await cookieFor('admin'),
      origin: 'https://malicioso.com',
    }))
    expect(res.status).toBe(403)
  })

  it('rate limit / IP bloqueado → 429 com Retry-After', async () => {
    guardRequest.mockResolvedValue({ status: 'blocked', retryAfter: 900 })
    const res = await middleware(req('/api/auth/login', { method: 'POST', origin: `https://${HOST}` }))
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('900')
  })

  it('login usa o bucket de login; demais rotas o bucket api', async () => {
    await middleware(req('/api/auth/login', { method: 'POST' }))
    expect(guardRequest.mock.calls[0][1]).toBe('login')
    await middleware(req('/api/admin/users', { cookie: await cookieFor('admin') }))
    expect(guardRequest.mock.calls[1][1]).toBe('api')
  })

  it('páginas não passam pelo rate limit', async () => {
    await middleware(req('/admin/dashboard', { cookie: await cookieFor('admin') }))
    expect(guardRequest).not.toHaveBeenCalled()
  })
})
