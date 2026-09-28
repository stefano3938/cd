import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

// Cookie da requisição atual
let cookieValue: string | undefined
vi.mock('next/headers', () => ({
  cookies: () => ({ get: () => (cookieValue ? { value: cookieValue } : undefined) }),
}))

// Linha do usuário no banco (null = usuário excluído)
let dbUser: { id: string; role: string; nome: string; session_version: number } | null
let turmaAssignment: { id: string } | null
vi.mock('@/lib/supabase/client', () => {
  const query = (table: string) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: async () => ({ data: table === 'users' ? dbUser : turmaAssignment, error: null }),
    }
    return chain
  }
  return { supabase: { from: query } }
})

import { canAccessTurma, requireRole } from '@/lib/auth/guard'
import { createSessionToken, Session } from '@/lib/auth/session'

async function login(role: 'admin' | 'professor', version = 0) {
  cookieValue = await createSessionToken({ id: 'u1', role, nome: 'Ana', session_version: version })
}

describe('requireRole (validação no servidor)', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!'
    cookieValue = undefined
    dbUser = { id: 'u1', role: 'admin', nome: 'Ana', session_version: 0 }
    turmaAssignment = null
  })

  it('sem cookie → 401', async () => {
    const res = await requireRole('admin')
    expect(res).toBeInstanceOf(NextResponse)
    expect((res as NextResponse).status).toBe(401)
  })

  it('sessão válida → retorna a sessão', async () => {
    await login('admin')
    const res = await requireRole('admin')
    expect(res).not.toBeInstanceOf(NextResponse)
    expect((res as Session).sub).toBe('u1')
  })

  it('usuário excluído → 401 mesmo com cookie válido', async () => {
    await login('admin')
    dbUser = null
    expect(((await requireRole('admin')) as NextResponse).status).toBe(401)
  })

  it('senha trocada (session_version mudou) → 401', async () => {
    await login('admin', 0)
    dbUser = { id: 'u1', role: 'admin', nome: 'Ana', session_version: 1 }
    expect(((await requireRole('admin')) as NextResponse).status).toBe(401)
  })

  it('perfil rebaixado no banco vale na hora (token diz admin, banco diz professor) → 403', async () => {
    await login('admin')
    dbUser = { id: 'u1', role: 'professor', nome: 'Ana', session_version: 0 }
    expect(((await requireRole('admin')) as NextResponse).status).toBe(403)
  })

  it('perfil sem permissão → 403', async () => {
    await login('professor')
    dbUser = { id: 'u1', role: 'professor', nome: 'Ana', session_version: 0 }
    expect(((await requireRole('admin')) as NextResponse).status).toBe(403)
  })
})

describe('canAccessTurma', () => {
  const professor: Session = { sub: 'p1', role: 'professor', nome: 'P', ver: 0, exp: 0 }
  const admin: Session = { ...professor, role: 'admin' }

  it('admin acessa qualquer turma', async () => {
    expect(await canAccessTurma(admin, 't1')).toBe(true)
  })

  it('professor só acessa turma atribuída', async () => {
    turmaAssignment = null
    expect(await canAccessTurma(professor, 't1')).toBe(false)
    turmaAssignment = { id: 'x' }
    expect(await canAccessTurma(professor, 't1')).toBe(true)
  })
})
