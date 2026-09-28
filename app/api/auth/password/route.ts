import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole, revokeSessions } from '@/lib/auth/guard'
import { createSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from '@/lib/auth/session'
import { hashPassword, validatePassword, verifyPassword } from '@/lib/auth/password'
import { serverError } from '@/lib/api/errors'
import { getClientIp, hitLimit, LIMITS, registerStrike } from '@/lib/security/rate-limit'
import { audit } from '@/lib/security/audit'

// Troca a própria senha. Derruba as sessões em outros dispositivos e renova a atual.
export async function PUT(request: NextRequest) {
  const session = await requireRole('admin', 'professor', 'monitor')
  if (session instanceof NextResponse) return session

  try {
    const { senha_atual, nova_senha } = await request.json()

    if (typeof senha_atual !== 'string' || !senha_atual) {
      return NextResponse.json({ error: 'Informe a senha atual' }, { status: 400 })
    }
    const passwordError = validatePassword(nova_senha)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }
    if (senha_atual === nova_senha) {
      return NextResponse.json({ error: 'A nova senha deve ser diferente da atual' }, { status: 400 })
    }

    const ip = getClientIp(request)
    const { limit, windowSeconds } = LIMITS.loginAccount
    const { allowed, retryAfter } = await hitLimit(`password:${session.sub}`, limit, windowSeconds)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, nome, role, password_hash')
      .eq('id', session.sub)
      .single()

    if (!(await verifyPassword(senha_atual, user?.password_hash))) {
      await registerStrike(ip, 'password_change_failed')
      return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 })
    }

    const { error } = await supabase
      .from('users')
      .update({ password_hash: await hashPassword(nova_senha) })
      .eq('id', session.sub)
    if (error) return serverError('auth.password', error)

    const version = await revokeSessions(session.sub)
    await audit(request, session, { action: 'password_change', entity: 'user', entityId: session.sub })

    const response = NextResponse.json({ success: true })
    response.cookies.set(
      SESSION_COOKIE,
      await createSessionToken({ id: user!.id, role: user!.role, nome: user!.nome, session_version: version ?? 0 }),
      SESSION_COOKIE_OPTIONS
    )
    return response
  } catch (error) {
    return serverError('auth.password', error)
  }
}
