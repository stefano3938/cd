import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: turma_id } = await params

  // Buscar a turma com o curso
  const { data: turma, error: turmaError } = await supabase
    .from('turmas')
    .select('*, courses(*)')
    .eq('id', turma_id)
    .single()

  if (turmaError || !turma) {
    return NextResponse.json({ error: 'Turma não encontrada' }, { status: 404 })
  }

  // Buscar módulos do curso com suas aulas
  const { data: modules, error: modulesError } = await supabase
    .from('modules')
    .select(`
      id,
      nome,
      ordem,
      numero_de_aulas,
      classes (
        id,
        titulo,
        ordem,
        data_aula
      )
    `)
    .eq('course_id', turma.course_id)
    .order('ordem')

  if (modulesError) {
    return NextResponse.json({ error: modulesError.message }, { status: 500 })
  }

  // Organizar dados
  const result = {
    turma: {
      id: turma.id,
      nome: turma.nome,
      horario_inicio: turma.horario_inicio,
      horario_fim: turma.horario_fim,
      dia_semana: turma.dia_semana
    },
    curso: turma.courses,
    modules: modules?.map(m => ({
      ...m,
      classes: (m.classes as any[])?.sort((a, b) => a.ordem - b.ordem) || []
    })) || []
  }

  return NextResponse.json(result)
}
