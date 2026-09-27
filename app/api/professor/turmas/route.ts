import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'

export async function GET(request: NextRequest) {
  const auth = await requireUser(['admin', 'professor', 'monitor'])
  if (auth instanceof NextResponse) return auth

  // Professor/monitor só vê as próprias turmas; admin pode consultar outro professor
  const professor_id = auth.role === 'admin'
    ? request.nextUrl.searchParams.get('professor_id') ?? auth.userId
    : auth.userId

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
