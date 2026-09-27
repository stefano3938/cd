import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'
import { handleError, HttpError, parseBody } from '@/lib/http/errors'
import { importStudentsSchema } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const { students, turma_id } = await parseBody(request, importStudentsSchema)

    // Ignora linhas sem nome
    const records = students
      .filter(s => s.nome.length > 0)
      .map(s => ({
        nome: s.nome,
        email: s.email || null,
        telefone: s.telefone || null,
        turma_id
      }))

    if (records.length === 0) {
      throw new HttpError(400, 'Nenhum aluno válido na lista')
    }

    const { data, error } = await supabase
      .from('students')
      .insert(records)
      .select('id')

    if (error) throw error

    return NextResponse.json({
      success: true,
      imported: data?.length || 0,
      total: students.length
    })
  } catch (error) {
    return handleError(error, 'importar alunos')
  }
}
