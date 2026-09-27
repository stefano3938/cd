import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'
import { handleError, parseBody, parseData } from '@/lib/http/errors'
import { idParams, updateTurmaSchema } from '@/lib/validation/schemas'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = parseData(params, idParams)
    const { professor_ids, ...turmaData } = await parseBody(request, updateTurmaSchema)

    const { data, error } = await supabase
      .from('turmas')
      .update(turmaData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    if (professor_ids !== undefined) {
      const { error: deleteError } = await supabase.from('turma_professors').delete().eq('turma_id', id)
      if (deleteError) throw deleteError

      if (professor_ids.length) {
        const relations = professor_ids.map(professor_id => ({
          turma_id: id,
          professor_id
        }))
        const { error: insertError } = await supabase.from('turma_professors').insert(relations)
        if (insertError) throw insertError
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    return handleError(error, 'atualizar turma')
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = parseData(params, idParams)
    const { error } = await supabase
      .from('turmas')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error, 'excluir turma')
  }
}
