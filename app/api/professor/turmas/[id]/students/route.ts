import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { canAccessTurma, forbidden, requireUser } from '@/lib/auth/guard'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(['admin', 'professor', 'monitor'])
  if (auth instanceof NextResponse) return auth

  const { id: turma_id } = await params

  if (!(await canAccessTurma(auth, turma_id))) return forbidden()

  const { data, error } = await supabase
    .from('students')
    .select('id, nome, email, telefone')
    .eq('turma_id', turma_id)
    .order('nome')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
