import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  const professor_id = request.nextUrl.searchParams.get('professor_id')

  if (!professor_id) {
    return NextResponse.json({ error: 'professor_id obrigatório' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('turma_professors')
    .select(`
      turma_id,
      turmas (
        id,
        nome,
        horario_inicio,
        horario_fim,
        dia_semana,
        course_id,
        courses (
          id,
          nome,
          ano
        )
      )
    `)
    .eq('professor_id', professor_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const turmas = data?.map(tp => tp.turmas).filter(Boolean) || []
  return NextResponse.json(turmas)
}
