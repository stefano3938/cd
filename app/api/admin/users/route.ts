import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

// Cliente com service role para criar usuários no Auth
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nome, email, password, role, data_nascimento, nome_lider_direto, geracao, telefone_lider_direto } = body

    if (!nome || !email || !password || !role) {
      return NextResponse.json({ error: 'Campos obrigatórios não preenchidos' }, { status: 400 })
    }

    // 1. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Confirma email automaticamente
    })

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
        email,
        role,
        data_nascimento: data_nascimento || null,
        nome_lider_direto: nome_lider_direto || null,
        geracao: geracao || null,
        telefone_lider_direto: telefone_lider_direto || null
      }])
      .select()
      .single()

    if (error) {
      // Se falhar ao criar perfil, deletar usuário do Auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)

      if (error.code === '23505') {
        return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 })
  }
}
