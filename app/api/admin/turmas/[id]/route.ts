import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await request.json()
  const { nome, horario_inicio, horario_fim, dia_semana, professor_ids } = body

  const { data, error } = await supabase
    .from('turmas')
    .update({ nome, horario_inicio, horario_fim, dia_semana })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (professor_ids !== undefined) {
    await supabase.from('turma_professors').delete().eq('turma_id', id)
    if (professor_ids.length) {
      const relations = professor_ids.map((professor_id: string) => ({
        turma_id: id,
        professor_id
      }))
      await supabase.from('turma_professors').insert(relations)
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const { error } = await supabase
    .from('turmas')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
