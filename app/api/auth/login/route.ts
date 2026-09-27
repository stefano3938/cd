import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { verifyPassword } from '@/lib/auth/password'
import { SESSION_COOKIE, sessionCookieOptions, signSession } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar usuário no banco
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, nome, role, password_hash')
      .eq('email', String(email).trim())
      .maybeSingle()

    if (error) throw error

    // Verificar senha
    const passwordMatch = user ? await verifyPassword(password, user.password_hash) : false

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
    console.error('Erro no login:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
