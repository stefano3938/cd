import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'
import { hashPassword } from '@/lib/auth/password'
import { handleError, parseBody, parseData } from '@/lib/http/errors'
import { idParams, updateProfessorSchema } from '@/lib/validation/schemas'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = parseData(params, idParams)
    const { senha, ...professor } = await parseBody(request, updateProfessorSchema)

    const updateData: Record<string, unknown> = { ...professor }
    if (senha) {
      updateData.password_hash = await hashPassword(senha)
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .eq('role', 'professor')
      .select('id, email, nome, telefone, created_at')
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return handleError(error, 'atualizar professor')
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = parseData(params, idParams)
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .eq('role', 'professor')

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error, 'excluir professor')
  }
}
