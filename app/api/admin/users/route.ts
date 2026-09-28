import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { hashPassword, validatePassword } from '@/lib/auth/password'
import { isUniqueViolation, serverError } from '@/lib/api/errors'
import { USER_PUBLIC_COLUMNS, VALID_ROLES } from '@/lib/auth/users'
import { audit } from '@/lib/security/audit'

export async function GET() {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { data, error } = await supabase
    .from('users')
    .select(USER_PUBLIC_COLUMNS)
    .order('created_at', { ascending: false })

  if (error) return serverError('users.list', error)
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  try {
    const body = await request.json()
    const { nome, email, password, role, data_nascimento, nome_lider_direto, geracao, telefone_lider_direto } = body

    if (!nome || !email || !password || !role) {
      return NextResponse.json({ error: 'Campos obrigatórios não preenchidos' }, { status: 400 })
    }
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Perfil inválido' }, { status: 400 })
    }
    const passwordError = validatePassword(password)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('users')
      .insert([{
        nome,
        email: String(email).trim(),
        password_hash: await hashPassword(password),
        role,
        data_nascimento: data_nascimento || null,
        nome_lider_direto: nome_lider_direto || null,
        geracao: geracao || null,
        telefone_lider_direto: telefone_lider_direto || null
      }])
      .select(USER_PUBLIC_COLUMNS)
      .single()

    if (error) {
      if (isUniqueViolation(error)) {
        return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 400 })
      }
      return serverError('users.create', error)
    }

    await audit(request, session, { action: 'create', entity: 'user', entityId: data.id, details: { role } })
    return NextResponse.json(data)
  } catch (error) {
    return serverError('users.create', error)
  }
}
