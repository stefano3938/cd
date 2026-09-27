import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { serverError } from '@/lib/api/errors'
import { audit } from '@/lib/security/audit'
import { buildConsent } from '@/lib/lgpd/consent'

// Registra (ou renova) o consentimento de um aluno já cadastrado
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params
  const body = await request.json()

  const { data: student, error: fetchError } = await supabase
    .from('students')
    .select('id, data_nascimento, nome_responsavel, anonimizado_em')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return serverError('students.consent', fetchError)
  if (!student) return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })
  if (student.anonimizado_em) {
    return NextResponse.json({ error: 'Aluno anonimizado' }, { status: 400 })
  }

  const result = buildConsent(
    {
      consentimento_confirmado: body.consentimento_confirmado,
      consentimento_titular: body.consentimento_titular,
      data_nascimento: student.data_nascimento,
      nome_responsavel: student.nome_responsavel,
    },
    session.sub
  )
  if (result.error !== null) return NextResponse.json({ error: result.error }, { status: 400 })

  const { data, error } = await supabase
    .from('students')
    .update(result.fields)
    .eq('id', id)
    .select('id, consentimento_em, consentimento_versao, consentimento_titular')
    .single()

  if (error) return serverError('students.consent', error)
  await audit(request, session, {
    action: 'consent',
    entity: 'student',
    entityId: id,
    details: { titular: result.fields.consentimento_titular, versao: result.fields.consentimento_versao }
  })
  return NextResponse.json(data)
}
