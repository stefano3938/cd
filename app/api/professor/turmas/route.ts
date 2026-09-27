import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { serverError } from '@/lib/api/errors'

// Turmas do professor logado (o ID vem da sessão, não da query string)
export async function GET() {
  const session = await requireRole('professor')
  if (session instanceof NextResponse) return session

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
    .eq('professor_id', session.sub)

  if (error) return serverError('professor.turmas', error)

  const turmas = data?.map(tp => tp.turmas).filter(Boolean) || []
  return NextResponse.json(turmas)
}
