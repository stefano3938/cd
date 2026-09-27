import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { serverError } from '@/lib/api/errors'

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

  const { error } = await supabase
    .from('turmas')
    .delete()
    .eq('id', id)

  if (error) return serverError('turmas.delete', error)
  return NextResponse.json({ success: true })
}
