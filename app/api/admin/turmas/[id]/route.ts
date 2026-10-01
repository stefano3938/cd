import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { conflict, isForeignKeyViolation, serverError } from '@/lib/api/errors'
import { audit } from '@/lib/security/audit'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params
  const body = await request.json()
  const { nome, horario_inicio, horario_fim, dia_semana, professor_ids } = body

  const { data, error } = await supabase
    .from('turmas')
    .update({ nome, horario_inicio, horario_fim, dia_semana })
    .eq('id', id)
    .select()
    .single()

  if (error) return serverError('turmas.update', error)

  if (Array.isArray(professor_ids)) {
    // Substituição atômica (função SQL da migração 004)
    const { error: relError } = await supabase.rpc('definir_professores_turma', {
      p_turma_id: id,
      p_professor_ids: professor_ids
    })
    if (relError) return serverError('turmas.update.professors', relError)
  }

  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params

  // Excluir a turma apagaria os alunos e as presenças (antes da migração 006). Só turma vazia.
  const { count, error: countError } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('turma_id', id)
  if (countError) return serverError('turmas.delete', countError)
  if (count) {
    return conflict(`A turma tem ${count} aluno(s). Mova os alunos para outra turma ou exclua-os antes de excluir a turma.`)
  }

  const { error } = await supabase
    .from('turmas')
    .delete()
    .eq('id', id)

  if (error) {
    if (isForeignKeyViolation(error)) return conflict('A turma ainda tem alunos vinculados.')
    return serverError('turmas.delete', error)
  }
  await audit(request, session, { action: 'delete', entity: 'turma', entityId: id })
  return NextResponse.json({ success: true })
}
