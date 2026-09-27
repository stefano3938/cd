import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'

export async function GET(request: NextRequest) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  const turma_id = request.nextUrl.searchParams.get('turma_id')

  let query = supabase
    .from('students')
    .select('*, turmas(nome)')
    .order('nome')

  if (turma_id) {
    query = query.eq('turma_id', turma_id)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const {
    nome,
    email,
    telefone,
    turma_id,
    data_nascimento,
    nome_responsavel,
    telefone_responsavel,
    nome_lider_direto,
    geracao,
    telefone_lider_direto
  } = body

  if (!nome || !turma_id) {
    return NextResponse.json({ error: 'Campos obrigatórios: nome, turma_id' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('students')
    .insert({
      nome,
      email: email || null,
      telefone: telefone || null,
      turma_id,
      data_nascimento: data_nascimento || null,
      nome_responsavel: nome_responsavel || null,
      telefone_responsavel: telefone_responsavel || null,
      nome_lider_direto: nome_lider_direto || null,
      geracao: geracao || null,
      telefone_lider_direto: telefone_lider_direto || null
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
