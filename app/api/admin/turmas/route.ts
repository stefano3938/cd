import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { serverError } from '@/lib/api/errors'

export async function GET() {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { data, error } = await supabase
    .from('turmas')
    .select(`
      *,
      courses(nome),
      turma_professors(professor_id, users(id, nome))
    `)
    .order('created_at', { ascending: false })

  if (error) return serverError('turmas.list', error)
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const body = await request.json()
  const { course_id, nome, horario_inicio, horario_fim, dia_semana, professor_ids } = body

  if (!course_id || !nome || !horario_inicio || !horario_fim) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  // Turma + professores numa única transação (função SQL da migração 004)
  const { data: turma, error } = await supabase.rpc('criar_turma', {
    p_course_id: course_id,
    p_nome: nome,
    p_horario_inicio: horario_inicio,
    p_horario_fim: horario_fim,
    p_dia_semana: dia_semana || 'domingo',
    p_professor_ids: Array.isArray(professor_ids) ? professor_ids : []
  })

  if (error) return serverError('turmas.create', error)
  return NextResponse.json(turma, { status: 201 })
}
