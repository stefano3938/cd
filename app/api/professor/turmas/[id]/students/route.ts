import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { canAccessTurma, forbidden, requireUser } from '@/lib/auth/guard'
import { handleError, parseData } from '@/lib/http/errors'
import { idParams } from '@/lib/validation/schemas'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(['admin', 'professor', 'monitor'])
  if (auth instanceof NextResponse) return auth

  try {
    const { id: turma_id } = parseData(params, idParams)

    if (!(await canAccessTurma(auth, turma_id))) return forbidden()

    const { data, error } = await supabase
      .from('students')
      .select('id, nome, email, telefone')
      .eq('turma_id', turma_id)
      .order('nome')

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error) {
    return handleError(error, 'listar alunos da turma')
  }
}
