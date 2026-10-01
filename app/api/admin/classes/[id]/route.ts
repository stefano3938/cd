import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { conflict, isForeignKeyViolation, serverError } from '@/lib/api/errors'
import { audit } from '@/lib/security/audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params

  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) return serverError('classes.get', error)
  if (!data) return NextResponse.json({ error: 'Aula não encontrada' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params
  const body = await request.json()
  const { titulo, ordem, data_aula } = body

  const { data, error } = await supabase
    .from('classes')
    .update({ titulo, ordem, data_aula })
    .eq('id', id)
    .select()
    .single()

  if (error) return serverError('classes.update', error)
  return NextResponse.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params

  // Excluir a aula apagaria as presenças já registradas nela
  const { count, error: countError } = await supabase
    .from('attendance')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', id)
  if (countError) return serverError('classes.delete', countError)
  if (count) return conflict(`A aula tem ${count} registro(s) de chamada e não pode ser excluída.`)

  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', id)

  if (error) {
    if (isForeignKeyViolation(error)) return conflict('A aula tem chamada registrada.')
    return serverError('classes.delete', error)
  }
  await audit(request, session, { action: 'delete', entity: 'class', entityId: id })
  return NextResponse.json({ success: true })
}
