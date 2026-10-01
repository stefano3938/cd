import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { conflict, isForeignKeyViolation, serverError } from '@/lib/api/errors'
import { audit } from '@/lib/security/audit'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params

  const { data, error } = await supabase
    .from('courses')
    .select('*, modules(id, nome, ordem, numero_de_aulas)')
    .eq('id', id)
    .single()

  if (error) return serverError('courses.get', error)
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params
  const body = await request.json()
  const { nome, ano, descricao } = body

  const { data, error } = await supabase
    .from('courses')
    .update({ nome, ano, descricao })
    .eq('id', id)
    .select()
    .single()

  if (error) return serverError('courses.update', error)
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params

  // Excluir o curso apagaria turmas, alunos, aulas e presenças em cascata. Só curso sem turmas e sem chamadas.
  const [turmas, chamadas] = await Promise.all([
    supabase.from('turmas').select('id', { count: 'exact', head: true }).eq('course_id', id),
    supabase
      .from('attendance')
      .select('id, classes!inner(modules!inner(course_id))', { count: 'exact', head: true })
      .eq('classes.modules.course_id', id),
  ])
  const countError = turmas.error || chamadas.error
  if (countError) return serverError('courses.delete', countError)
  if (turmas.count) {
    return conflict(`O curso tem ${turmas.count} turma(s). Exclua as turmas antes de excluir o curso.`)
  }
  if (chamadas.count) {
    return conflict('O curso tem aulas com chamada registrada e não pode ser excluído.')
  }

  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', id)

  if (error) {
    if (isForeignKeyViolation(error)) return conflict('O curso ainda tem turmas ou chamadas vinculadas.')
    return serverError('courses.delete', error)
  }
  await audit(request, session, { action: 'delete', entity: 'course', entityId: id })
  return NextResponse.json({ success: true })
}
