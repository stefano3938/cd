import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { serverError } from '@/lib/api/errors'
import { audit } from '@/lib/security/audit'
import { buildConsent } from '@/lib/lgpd/consent'

export async function GET(request: NextRequest) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const turma_id = request.nextUrl.searchParams.get('turma_id')

  let query = supabase
    .from('students')
    .select('*, turmas(nome)')
    .order('nome')

  if (turma_id) {
    query = query.eq('turma_id', turma_id)
  }

  const { data, error } = await query

  if (error) return serverError('students.list', error)
  await audit(request, session, {
    action: 'view',
    entity: 'student',
    details: { lista: true, turma_id: turma_id ?? null, total: data?.length ?? 0 }
  })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const body = await request.json()
  const {
    nome,
    email,
    telefone,
    turma_id,
    data_nascimento,
    nome_responsavel,
    telefone_responsavel,
    nome_lider_direto,
    geracao,
    telefone_lider_direto
  } = body

  if (!nome || !turma_id) {
    return NextResponse.json({ error: 'Campos obrigatórios: nome, turma_id' }, { status: 400 })
  }

  // Consentimento é opcional na criação (cadastro rápido/importação); sem ele o aluno fica "pendente".
  // Se enviado, precisa ser válido (ex.: menor → responsável).
  let consent = {}
  if (body.consentimento_confirmado !== undefined) {
    const result = buildConsent(body, session.sub)
    if (result.error !== null) return NextResponse.json({ error: result.error }, { status: 400 })
    consent = result.fields
  }

  const { data, error } = await supabase
    .from('students')
    .insert({
      nome,
      email: email || null,
      telefone: telefone || null,
      turma_id,
      data_nascimento: data_nascimento || null,
      nome_responsavel: nome_responsavel || null,
      telefone_responsavel: telefone_responsavel || null,
      nome_lider_direto: nome_lider_direto || null,
      geracao: geracao || null,
      telefone_lider_direto: telefone_lider_direto || null,
      ...consent
    })
    .select()
    .single()

  if (error) return serverError('students.create', error)
  await audit(request, session, {
    action: 'create',
    entity: 'student',
    entityId: data.id,
    details: { consentimento: Object.keys(consent).length > 0 }
  })
  return NextResponse.json(data, { status: 201 })
}
