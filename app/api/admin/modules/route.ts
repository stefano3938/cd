import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
