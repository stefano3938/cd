import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { serverError } from '@/lib/api/errors'

export async function POST(request: NextRequest) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const body = await request.json()
  const { course_id, nome, ordem, numero_de_aulas } = body

  if (!course_id || !nome || ordem === undefined) {
    return NextResponse.json({ error: 'Campos obrigatórios: course_id, nome, ordem' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('modules')
    .insert({ course_id, nome, ordem, numero_de_aulas: numero_de_aulas || 4 })
    .select()
    .single()

  if (error) return serverError('modules.create', error)
  return NextResponse.json(data, { status: 201 })
}
