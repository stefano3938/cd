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
  const { nome, ordem, numero_de_aulas } = body

  const { data, error } = await supabase
    .from('modules')
    .update({ nome, ordem, numero_de_aulas })
    .eq('id', id)
    .select()
    .single()

  if (error) return serverError('modules.update', error)
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params

  // Excluir o módulo apagaria as aulas e, com elas, as presenças já registradas
  const { count, error: countError } = await supabase
    .from('attendance')
    .select('id, classes!inner(module_id)', { count: 'exact', head: true })
    .eq('classes.module_id', id)
  if (countError) return serverError('modules.delete', countError)
  if (count) return conflict('O módulo tem aulas com chamada registrada e não pode ser excluído.')

  const { error } = await supabase
    .from('modules')
    .delete()
    .eq('id', id)

  if (error) {
    if (isForeignKeyViolation(error)) return conflict('O módulo tem aulas com chamada registrada.')
    return serverError('modules.delete', error)
  }
  await audit(request, session, { action: 'delete', entity: 'module', entityId: id })
  return NextResponse.json({ success: true })
}
