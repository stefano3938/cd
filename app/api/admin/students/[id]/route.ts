import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'
import { handleError, parseBody, parseData } from '@/lib/http/errors'
import { idParams, updateStudentSchema } from '@/lib/validation/schemas'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = parseData(params, idParams)
    const input = await parseBody(request, updateStudentSchema)

    const { data, error } = await supabase
      .from('students')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return handleError(error, 'atualizar aluno')
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = parseData(params, idParams)
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error, 'excluir aluno')
  }
}
