import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { serverError } from '@/lib/api/errors'
import { audit } from '@/lib/security/audit'
import { consentNeedsRenewal, STUDENT_EDITABLE_FIELDS } from '@/lib/lgpd/consent'

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
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Só os campos enviados e permitidos (correção de dados do titular — LGPD art. 18, III)
  const updateData: Record<string, string | null> = {}
  for (const field of STUDENT_EDITABLE_FIELDS) {
    if (body[field] === undefined) continue
    const value = body[field]
    if (value !== null && typeof value !== 'string') {
      return NextResponse.json({ error: `Campo inválido: ${field}` }, { status: 400 })
    }
    updateData[field] = value?.trim() || null
  }
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para alterar' }, { status: 400 })
  }
  if ('nome' in updateData && !updateData.nome) {
    return NextResponse.json({ error: 'O nome é obrigatório' }, { status: 400 })
  }
  if ('turma_id' in updateData && !updateData.turma_id) {
    return NextResponse.json({ error: 'A turma é obrigatória' }, { status: 400 })
  }
  if (updateData.data_nascimento && !/^\d{4}-\d{2}-\d{2}$/.test(updateData.data_nascimento)) {
    return NextResponse.json({ error: 'Data de nascimento inválida' }, { status: 400 })
  }

  const { data: atual, error: fetchError } = await supabase
    .from('students')
    .select('id, data_nascimento, nome_responsavel, consentimento_titular, anonimizado_em')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return serverError('students.update', fetchError)
  if (!atual) return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })
  if (atual.anonimizado_em) {
    return NextResponse.json({ error: 'Aluno anonimizado não pode ser editado' }, { status: 400 })
  }

  // Se a correção invalida o consentimento registrado (ex.: virou menor e quem consentiu foi o aluno,
  // ou o responsável que consentiu foi apagado), o consentimento volta a "pendente".
  const consentimentoInvalido = consentNeedsRenewal({
    titular: atual.consentimento_titular,
    data_nascimento: 'data_nascimento' in updateData ? updateData.data_nascimento : atual.data_nascimento,
    nome_responsavel: 'nome_responsavel' in updateData ? updateData.nome_responsavel : atual.nome_responsavel,
  })
  const consentReset = consentimentoInvalido
    ? { consentimento_em: null, consentimento_versao: null, consentimento_titular: null, consentimento_registrado_por: null }
    : {}

  const { data, error } = await supabase
    .from('students')
    .update({ ...updateData, ...consentReset })
    .eq('id', id)
    .select('*, turmas(nome)')
    .single()

  if (error) return serverError('students.update', error)
  await audit(request, session, {
    action: 'update',
    entity: 'student',
    entityId: id,
    details: { campos: Object.keys(updateData), consentimento_pendente: consentimentoInvalido }
  })
  return NextResponse.json({ ...data, consentimento_resetado: consentimentoInvalido })
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
