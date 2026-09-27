import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'

export async function GET() {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  const { data, error } = await supabase
    .from('turmas')
    .select(`
      *,
      courses(nome),
      turma_professors(professor_id, users(id, nome))
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const { course_id, nome, horario_inicio, horario_fim, dia_semana, professor_ids } = body

  if (!course_id || !nome || !horario_inicio || !horario_fim) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  const { data: turma, error } = await supabase
    .from('turmas')
    .insert({ course_id, nome, horario_inicio, horario_fim, dia_semana: dia_semana || 'domingo' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (professor_ids?.length) {
    const relations = professor_ids.map((professor_id: string) => ({
      turma_id: turma.id,
      professor_id
    }))
    await supabase.from('turma_professors').insert(relations)
  }

  return NextResponse.json(turma, { status: 201 })
}
