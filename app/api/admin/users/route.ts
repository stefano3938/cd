import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

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

    // Hash simples para demo - em produção usar bcrypt
    const password_hash = Buffer.from(password).toString('base64')

    const { data, error } = await supabase
      .from('users')
      .insert([{
        nome,
        email,
        password_hash,
        role,
        data_nascimento: data_nascimento || null,
        nome_lider_direto: nome_lider_direto || null,
        geracao: geracao || null,
        telefone_lider_direto: telefone_lider_direto || null
      }])
      .select()
      .single()

    if (error) {
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
