import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole, revokeSessions } from '@/lib/auth/guard'
import { audit } from '@/lib/security/audit'
import { hashPassword, validatePassword } from '@/lib/auth/password'
import { conflict, isMissingFunction, isUniqueViolation, MIGRACAO_006_PENDENTE, serverError } from '@/lib/api/errors'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params
  const body = await request.json()
  const { email, nome, telefone, senha } = body

  const updateData: Record<string, unknown> = { email, nome, telefone }
  if (senha) {
    const passwordError = validatePassword(senha)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }
    updateData.password_hash = await hashPassword(senha)
  }

  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', id)
    .eq('role', 'professor')
    .select('id, email, nome, telefone, created_at')
    .single()

  if (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 400 })
    }
    return serverError('professors.update', error)
  }

  if (updateData.password_hash) await revokeSessions(id)
  await audit(request, session, {
    action: 'update',
    entity: 'user',
    entityId: id,
    details: { campos: Object.keys(updateData).map(f => (f === 'password_hash' ? 'senha' : f)) }
  })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params

  // Função da migração 006: com ela, as chamadas marcadas pelo professor são mantidas
  const { data: excluidos, error } = await supabase.rpc('excluir_usuario', { p_user_id: id, p_role: 'professor' })

  if (error) {
    if (isMissingFunction(error)) return conflict(MIGRACAO_006_PENDENTE)
    return serverError('professors.delete', error)
  }
  if (!excluidos) return NextResponse.json({ error: 'Professor não encontrado' }, { status: 404 })
  await audit(request, session, { action: 'delete', entity: 'user', entityId: id })
  return NextResponse.json({ success: true })
}
