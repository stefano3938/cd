import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole, revokeSessions } from '@/lib/auth/guard'
import { audit } from '@/lib/security/audit'
import { hashPassword, validatePassword } from '@/lib/auth/password'
import { conflict, isMissingFunction, isUniqueViolation, MIGRACAO_006_PENDENTE, serverError } from '@/lib/api/errors'
import { USER_PUBLIC_COLUMNS, VALID_ROLES } from '@/lib/auth/users'

// Somente estes campos podem ser alterados via API (evita mass assignment de password_hash, id etc.)
const EDITABLE_FIELDS = [
  'nome', 'email', 'telefone', 'role', 'data_nascimento',
  'nome_lider_direto', 'geracao', 'telefone_lider_direto'
] as const

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params
  const { data, error } = await supabase
    .from('users')
    .select(USER_PUBLIC_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (error) return serverError('users.get', error)
  if (!data) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  try {
    const { id } = await params
    const body = await request.json()

    const updateData: Record<string, unknown> = {}
    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) updateData[field] = body[field] === '' ? null : body[field]
    }

    if (updateData.role !== undefined && !VALID_ROLES.includes(updateData.role as string)) {
      return NextResponse.json({ error: 'Perfil inválido' }, { status: 400 })
    }
    if (id === session.sub && updateData.role !== undefined && updateData.role !== 'admin') {
      return NextResponse.json({ error: 'Você não pode remover seu próprio perfil de administrador' }, { status: 400 })
    }

    if (body.password) {
      const passwordError = validatePassword(body.password)
      if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 })
      updateData.password_hash = await hashPassword(body.password)
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select(USER_PUBLIC_COLUMNS)
      .single()

    if (error) {
      if (isUniqueViolation(error)) {
        return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 400 })
      }
      return serverError('users.update', error)
    }

    if (updateData.password_hash || updateData.role !== undefined) {
      await revokeSessions(id)
    }
    await audit(request, session, {
      action: 'update',
      entity: 'user',
      entityId: id,
      details: { campos: Object.keys(updateData).map(f => (f === 'password_hash' ? 'senha' : f)) }
    })

    return NextResponse.json(data)
  } catch (error) {
    return serverError('users.update', error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params
  if (id === session.sub) {
    return NextResponse.json({ error: 'Você não pode excluir o próprio usuário' }, { status: 400 })
  }

  // Função da migração 006: com ela, as chamadas marcadas pelo usuário são mantidas
  const { data: excluidos, error } = await supabase.rpc('excluir_usuario', { p_user_id: id })

  if (error) {
    if (isMissingFunction(error)) return conflict(MIGRACAO_006_PENDENTE)
    return serverError('users.delete', error)
  }
  if (!excluidos) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  await audit(request, session, { action: 'delete', entity: 'user', entityId: id })
  return NextResponse.json({ success: true })
}
