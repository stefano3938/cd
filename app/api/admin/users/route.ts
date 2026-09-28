<<<<<<< HEAD
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
=======
import { NextRequest, NextResponse } from 'next/server'
>>>>>>> 15730aa7f64577f0d7fb8de6e6f75e38549f3300
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { hashPassword, validatePassword } from '@/lib/auth/password'
import { isUniqueViolation, serverError } from '@/lib/api/errors'
import { USER_PUBLIC_COLUMNS, VALID_ROLES } from '@/lib/auth/users'
import { audit } from '@/lib/security/audit'

// Cliente com service role para criar usuários no Auth
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

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
<<<<<<< HEAD

    // 1. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Confirma email automaticamente
    })
=======
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Perfil inválido' }, { status: 400 })
    }
    const passwordError = validatePassword(password)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }
>>>>>>> 15730aa7f64577f0d7fb8de6e6f75e38549f3300

    if (authError) {
      if (authError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 400 })
      }
      throw authError
    }

    // 2. Criar perfil na tabela users
    const { data, error } = await supabase
      .from('users')
      .insert([{
        auth_id: authData.user.id,
        nome,
<<<<<<< HEAD
        email,
=======
        email: String(email).trim(),
        password_hash: await hashPassword(password),
>>>>>>> 15730aa7f64577f0d7fb8de6e6f75e38549f3300
        role,
        data_nascimento: data_nascimento || null,
        nome_lider_direto: nome_lider_direto || null,
        geracao: geracao || null,
        telefone_lider_direto: telefone_lider_direto || null
      }])
      .select(USER_PUBLIC_COLUMNS)
      .single()

    if (error) {
<<<<<<< HEAD
      // Se falhar ao criar perfil, deletar usuário do Auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)

      if (error.code === '23505') {
=======
      if (isUniqueViolation(error)) {
>>>>>>> 15730aa7f64577f0d7fb8de6e6f75e38549f3300
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
