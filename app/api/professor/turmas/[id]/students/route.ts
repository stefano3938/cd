import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { canAccessTurma, forbidden, requireRole } from '@/lib/auth/guard'
import { serverError } from '@/lib/api/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole('professor', 'admin')
  if (session instanceof NextResponse) return session

  const { id: turma_id } = await params
  if (!(await canAccessTurma(session, turma_id))) return forbidden()

  // Apenas o necessário para a chamada (minimização de dados — LGPD art. 6º, III)
  const { data, error } = await supabase
    .from('students')
    .select('id, nome')
    .eq('turma_id', turma_id)
    .order('nome')

  if (error) return serverError('professor.turma.students', error)

  return NextResponse.json(data || [])
}
