import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { createSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from '@/lib/auth/session'
import { hashPassword, matchesLegacyBase64, verifyPassword } from '@/lib/auth/password'
import { serverError } from '@/lib/api/errors'
import { getClientIp, hitLimit, LIMITS, registerStrike, resetLimit } from '@/lib/security/rate-limit'
import { audit } from '@/lib/security/audit'

// O limite por IP (10/min) e o bloqueio de IP já são aplicados no middleware.
// Aqui: limite por IP + e-mail e registro de falhas (10 falhas em 15 min bloqueiam o IP).
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }

    const ip = getClientIp(request)
    const accountKey = `login:${ip}:${email.trim().toLowerCase()}`
    const { limit, windowSeconds } = LIMITS.loginAccount
    // Limite e busca do usuário são independentes: em paralelo (cada ida ao banco custa ~150 ms).
    // A senha só é verificada depois de confirmar que o limite não estourou.
    const [{ allowed, retryAfter }, { data: user }] = await Promise.all([
      hitLimit(accountKey, limit, windowSeconds),
      supabase
        .from('users')
        .select('id, email, nome, role, password_hash, session_version')
        .eq('email', email.trim())
        .maybeSingle(),
    ])
    if (!allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    let authenticated = await verifyPassword(password, user?.password_hash)

    // Migração: contas criadas com Base64 passam a usar bcrypt no primeiro login
    if (!authenticated && user && matchesLegacyBase64(password, user.password_hash)) {
      await supabase
        .from('users')
        .update({ password_hash: await hashPassword(password) })
        .eq('id', user.id)
      authenticated = true
    }

    if (!user || !authenticated) {
      await Promise.all([
        registerStrike(ip, 'login_failed'),
        audit(request, null, { action: 'login_failed', entity: 'auth', entityId: user?.id ?? null }),
      ])
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    await Promise.all([
      resetLimit(accountKey),
      audit(request, { sub: user.id, role: user.role, nome: user.nome, ver: user.session_version, exp: 0 }, {
        action: 'login',
        entity: 'auth',
        entityId: user.id
      }),
    ])

    const response = NextResponse.json({
      user: { id: user.id, nome: user.nome, email: user.email, role: user.role },
      message: 'Login realizado com sucesso'
    })

    response.cookies.set(SESSION_COOKIE, await createSessionToken(user), SESSION_COOKIE_OPTIONS)

    return response
  } catch (error) {
    return serverError('login', error)
  }
}
