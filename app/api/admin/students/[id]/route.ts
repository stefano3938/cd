import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { serverError } from '@/lib/api/errors'
import { audit } from '@/lib/security/audit'

// Ficha completa do aluno — cada visualização fica registrada na auditoria
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params

  const { data, error } = await supabase
    .from('students')
    .select('*, turmas(nome, horario_inicio)')
    .eq('id', id)
    .maybeSingle()

  if (error) return serverError('students.get', error)
  if (!data) return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })

  await audit(request, session, { action: 'view', entity: 'student', entityId: id })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params
  const body = await request.json()
  const { nome, email, telefone, turma_id } = body

  const { data, error } = await supabase
    .from('students')
    .update({ nome, email, telefone, turma_id })
    .eq('id', id)
    .select()
    .single()

  if (error) return serverError('students.update', error)
  await audit(request, session, {
    action: 'update',
    entity: 'student',
    entityId: id,
    details: { campos: ['nome', 'email', 'telefone', 'turma_id'] }
  })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params

  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id)

  if (error) return serverError('students.delete', error)
  await audit(request, session, { action: 'delete', entity: 'student', entityId: id })
  return NextResponse.json({ success: true })
}
