import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
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
  const body = await request.json()
  const { nome, email, telefone, turma_id } = body

  if (!nome || !turma_id) {
    return NextResponse.json({ error: 'Campos obrigatórios: nome, turma_id' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('students')
    .insert({ nome, email, telefone, turma_id })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
