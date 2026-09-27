import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'
import { hashPassword, MIN_PASSWORD_LENGTH } from '@/lib/auth/password'
import { USER_COLUMNS } from '@/lib/supabase/columns'

const EDITABLE_FIELDS = [
  'nome', 'email', 'telefone', 'role', 'foto_url', 'data_nascimento',
  'nome_lider_direto', 'geracao', 'telefone_lider_direto'
] as const

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = await params
    const { data, error } = await supabase
      .from('users')
      .select(USER_COLUMNS)
      .eq('id', id)
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Erro ao buscar usuário' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = await params
    const body = await request.json()

    // Só atualiza campos permitidos; a senha é tratada à parte
    const updateData: Record<string, unknown> = {}
    for (const field of EDITABLE_FIELDS) {
      if (field in body) updateData[field] = body[field]
    }

    if (updateData.role && !['admin', 'professor', 'monitor'].includes(updateData.role as string)) {
      return NextResponse.json({ error: 'Perfil inválido' }, { status: 400 })
    }

    if (body.password) {
      if (String(body.password).length < MIN_PASSWORD_LENGTH) {
        return NextResponse.json({ error: `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres` }, { status: 400 })
      }
      updateData.password_hash = await hashPassword(body.password)
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select(USER_COLUMNS)
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = await params

    if (id === auth.userId) {
      return NextResponse.json({ error: 'Você não pode excluir o próprio usuário' }, { status: 400 })
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Erro ao excluir usuário' }, { status: 500 })
  }
}
