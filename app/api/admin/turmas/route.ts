import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'
import { handleError, parseBody } from '@/lib/http/errors'
import { createTurmaSchema } from '@/lib/validation/schemas'

export async function GET() {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const { data, error } = await supabase
      .from('turmas')
      .select(`
        *,
        courses(nome),
        turma_professors(professor_id, users(id, nome))
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return handleError(error, 'listar turmas')
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const { professor_ids, ...turmaData } = await parseBody(request, createTurmaSchema)

    const { data: turma, error } = await supabase
      .from('turmas')
      .insert(turmaData)
      .select()
      .single()

    if (error) throw error

    if (professor_ids?.length) {
      const relations = professor_ids.map(professor_id => ({
        turma_id: turma.id,
        professor_id
      }))
      const { error: relationError } = await supabase.from('turma_professors').insert(relations)
      if (relationError) throw relationError
    }

    return NextResponse.json(turma, { status: 201 })
  } catch (error) {
    return handleError(error, 'criar turma')
  }
}
