import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'
import { handleError, parseBody, parseData } from '@/lib/http/errors'
import { createStudentSchema, uuid } from '@/lib/validation/schemas'

export async function GET(request: NextRequest) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const turmaParam = request.nextUrl.searchParams.get('turma_id')

    let query = supabase
      .from('students')
      .select('*, turmas(nome)')
      .order('nome')

    if (turmaParam) {
      query = query.eq('turma_id', parseData(turmaParam, uuid))
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return handleError(error, 'listar alunos')
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const input = await parseBody(request, createStudentSchema)

    const { data, error } = await supabase
      .from('students')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return handleError(error, 'criar aluno')
  }
}
