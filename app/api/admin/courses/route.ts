import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'
import { handleError, parseBody } from '@/lib/http/errors'
import { createCourseSchema } from '@/lib/validation/schemas'

export async function GET() {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*, modules(id, nome, ordem, numero_de_aulas)')
      .order('ano', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return handleError(error, 'listar cursos')
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const input = await parseBody(request, createCourseSchema)

    const { data, error } = await supabase
      .from('courses')
      .insert({ ...input, created_by: auth.userId })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return handleError(error, 'criar curso')
  }
}
