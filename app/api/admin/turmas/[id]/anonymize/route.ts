import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { serverError } from '@/lib/api/errors'
import { audit } from '@/lib/security/audit'

// Anonimiza os alunos de uma turma (retenção — LGPD art. 16). IRREVERSÍVEL.
// Exige que o admin digite o nome exato da turma como confirmação.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params
  const { confirmacao } = await request.json()

  const { data: turma, error: turmaError } = await supabase
    .from('turmas')
    .select('id, nome')
    .eq('id', id)
    .maybeSingle()

  if (turmaError) return serverError('turmas.anonymize', turmaError)
  if (!turma) return NextResponse.json({ error: 'Turma não encontrada' }, { status: 404 })

  if (typeof confirmacao !== 'string' || confirmacao.trim() !== turma.nome) {
    return NextResponse.json({ error: 'Digite o nome exato da turma para confirmar' }, { status: 400 })
  }

  const { data: total, error } = await supabase.rpc('anonimizar_turma', { p_turma_id: id })
  if (error) return serverError('turmas.anonymize', error)

  await audit(request, session, {
    action: 'anonymize',
    entity: 'turma',
    entityId: id,
    details: { alunos_anonimizados: total }
  })

  return NextResponse.json({ success: true, anonimizados: total })
}
