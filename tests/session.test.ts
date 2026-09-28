import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSessionToken, verifySessionToken } from '@/lib/auth/session'

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!'
const user = { id: 'u1', role: 'admin' as const, nome: 'Ana', session_version: 3 }

describe('sessão (cookie assinado)', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = SECRET
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('aceita um token válido e preserva os dados', async () => {
    const token = await createSessionToken(user)
    const session = await verifySessionToken(token)
    expect(session).toMatchObject({ sub: 'u1', role: 'admin', nome: 'Ana', ver: 3 })
  })

  it('rejeita token ausente ou malformado', async () => {
    expect(await verifySessionToken(undefined)).toBeNull()
    expect(await verifySessionToken('')).toBeNull()
    expect(await verifySessionToken('sem-ponto')).toBeNull()
    expect(await verifySessionToken('a.b.c')).toBeNull()
  })

  it('rejeita payload adulterado (ex.: trocar perfil para admin)', async () => {
    const token = await createSessionToken({ ...user, role: 'professor' as const })
    const [payload, signature] = token.split('.')
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString())
    const forged = Buffer.from(JSON.stringify({ ...decoded, role: 'admin' })).toString('base64url')
    expect(await verifySessionToken(`${forged}.${signature}`)).toBeNull()
  })

  it('rejeita token assinado com outro segredo', async () => {
    const token = await createSessionToken(user)
    process.env.SESSION_SECRET = 'outro-segredo-diferente-com-mais-de-32-chars'
    expect(await verifySessionToken(token)).toBeNull()
  })

  it('rejeita token expirado (8h)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T08:00:00Z'))
    const token = await createSessionToken(user)
    vi.setSystemTime(new Date('2026-01-01T16:00:01Z'))
    expect(await verifySessionToken(token)).toBeNull()
  })

  it('exige SESSION_SECRET com pelo menos 32 caracteres', async () => {
    process.env.SESSION_SECRET = 'curto'
    await expect(createSessionToken(user)).rejects.toThrow(/SESSION_SECRET/)
  })
})
