import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { verifyPassword } from '@/lib/auth/password'
import { checkLoginLimit, recordLoginAttempt } from '@/lib/auth/rate-limit'
import { SESSION_COOKIE, sessionCookieOptions, signSession } from '@/lib/auth/session'
import { handleError, parseBody } from '@/lib/http/errors'
import { getClientIp } from '@/lib/http/ip'
import { loginSchema } from '@/lib/validation/schemas'

// Hash de uma senha aleatória: comparar contra ele quando o e-mail não existe
// faz a resposta levar o mesmo tempo, sem revelar quais e-mails estão cadastrados.
const DUMMY_HASH = '$2b$10$Tyw2G.M1ZmZHv5PP/o72lOJoK.OJ7JG5hw5iYZ2azPqI9iiY/Vl0C'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await parseBody(request, loginSchema)
    const ip = getClientIp(request)
    const emailKey = email.toLowerCase()

    try {
      const limit = await checkLoginLimit(ip, emailKey)
      if (limit.blocked) {
        return NextResponse.json(
          { error: 'Muitas tentativas de login. Aguarde 15 minutos e tente novamente.' },
          { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
        )
      }
    } catch (error) {
      // Tabela login_attempts ainda não criada: segue sem limite, mas avisa
      console.error('Rate limit do login indisponível (aplique a migration login_attempts):', error)
    }

    // Buscar usuário no banco
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, nome, role, password_hash')
      .eq('email', email)
      .maybeSingle()

    if (error) throw error

    // Verificar senha
    const passwordMatch = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH)

    await recordLoginAttempt(ip, emailKey, Boolean(user && passwordMatch))

    if (!user || !passwordMatch) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    const token = await signSession({ userId: user.id, role: user.role, nome: user.nome })

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, nome: user.nome, role: user.role },
      message: 'Login realizado com sucesso'
    })
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions)
    return response

  } catch (error) {
    return handleError(error, 'fazer login')
  }
}
