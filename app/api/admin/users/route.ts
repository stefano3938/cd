import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'
import { hashPassword, MIN_PASSWORD_LENGTH } from '@/lib/auth/password'
import { USER_COLUMNS } from '@/lib/supabase/columns'

export async function GET() {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const { data, error } = await supabase
      .from('users')
      .select(USER_COLUMNS)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const body = await request.json()
    const { nome, email, password, role, data_nascimento, nome_lider_direto, geracao, telefone_lider_direto } = body

    if (!nome || !email || !password || !role) {
      return NextResponse.json({ error: 'Campos obrigatórios não preenchidos' }, { status: 400 })
    }

    if (!['admin', 'professor', 'monitor'].includes(role)) {
      return NextResponse.json({ error: 'Perfil inválido' }, { status: 400 })
    }

    if (String(password).length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres` }, { status: 400 })
    }

    const password_hash = await hashPassword(password)

    const { data, error } = await supabase
      .from('users')
      .insert([{
        nome,
        email: String(email).trim(),
        password_hash,
        role,
        data_nascimento: data_nascimento || null,
        nome_lider_direto: nome_lider_direto || null,
        geracao: geracao || null,
        telefone_lider_direto: telefone_lider_direto || null
      }])
      .select(USER_COLUMNS)
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 })
  }
}
