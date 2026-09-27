import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'
import { hashPassword } from '@/lib/auth/password'
import { handleError, HttpError, parseBody, parseData } from '@/lib/http/errors'
import { USER_COLUMNS } from '@/lib/supabase/columns'
import { idParams, updateUserSchema } from '@/lib/validation/schemas'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = parseData(params, idParams)
    const { data, error } = await supabase
      .from('users')
      .select(USER_COLUMNS)
      .eq('id', id)
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return handleError(error, 'buscar usuário')
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = parseData(params, idParams)
    const { password, ...user } = await parseBody(request, updateUserSchema)

    // Evita que o admin tire o próprio acesso
    if (id === auth.userId && user.role && user.role !== 'admin') {
      throw new HttpError(400, 'Você não pode remover seu próprio perfil de admin')
    }

    const updateData: Record<string, unknown> = { ...user }
    if (password) {
      updateData.password_hash = await hashPassword(password)
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select(USER_COLUMNS)
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    return handleError(error, 'atualizar usuário')
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = parseData(params, idParams)

    if (id === auth.userId) {
      throw new HttpError(400, 'Você não pode excluir o próprio usuário')
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error, 'excluir usuário')
  }
}
