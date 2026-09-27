import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'

export async function GET(request: NextRequest) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  const turma_id = request.nextUrl.searchParams.get('turma_id')
  const course_id = request.nextUrl.searchParams.get('course_id')

  // Buscar turmas (filtrar por curso se especificado)
  let turmasQuery = supabase
    .from('turmas')
    .select('id, nome, course_id, courses(nome)')

  if (course_id) {
    turmasQuery = turmasQuery.eq('course_id', course_id)
  }

  const { data: turmas, error: turmasError } = await turmasQuery

  if (turmasError) {
    return NextResponse.json({ error: turmasError.message }, { status: 500 })
  }

  // Se turma específica, buscar detalhes
  if (turma_id) {
    // Buscar alunos da turma
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, nome')
      .eq('turma_id', turma_id)
      .order('nome')

    if (studentsError) {
      return NextResponse.json({ error: studentsError.message }, { status: 500 })
    }

    // Buscar turma com curso
    const { data: turma } = await supabase
      .from('turmas')
      .select('*, courses(*)')
      .eq('id', turma_id)
      .single()

    // Buscar todas as aulas do curso
    const { data: modules } = await supabase
      .from('modules')
      .select('id, nome, ordem, classes(id, titulo, ordem)')
      .eq('course_id', turma?.course_id)
      .order('ordem')

    // Buscar todas as presenças dos alunos desta turma
    const studentIds = students?.map(s => s.id) || []
    const { data: attendance } = await supabase
      .from('attendance')
      .select('student_id, class_id, status')
      .in('student_id', studentIds)

    // Organizar aulas
    const allClasses: { id: string; titulo: string; module: string }[] = []
    modules?.forEach(m => {
      const classes = m.classes as any[]
      classes?.sort((a, b) => a.ordem - b.ordem).forEach(c => {
        allClasses.push({
          id: c.id,
          titulo: c.titulo,
          module: m.nome
        })
      })
    })

    // Criar mapa de presença
    const attendanceMap = new Map<string, Map<string, string>>()
    attendance?.forEach(a => {
      if (!attendanceMap.has(a.student_id)) {
        attendanceMap.set(a.student_id, new Map())
      }
      attendanceMap.get(a.student_id)?.set(a.class_id, a.status)
    })

    // Montar relatório
    const report = students?.map(s => {
      const studentAttendance = attendanceMap.get(s.id) || new Map()
      const presencas = allClasses.filter(c => studentAttendance.get(c.id) === 'presente').length
      const faltas = allClasses.filter(c => studentAttendance.get(c.id) === 'falta').length
      const total = allClasses.length
      const percentual = total > 0 ? Math.round((presencas / total) * 100) : 0

      return {
        id: s.id,
        nome: s.nome,
        presencas,
        faltas,
        total,
        percentual,
        detalhes: allClasses.map(c => ({
          class_id: c.id,
          titulo: c.titulo,
          module: c.module,
          status: studentAttendance.get(c.id) || null
        }))
      }
    }) || []

    return NextResponse.json({
      turma,
      classes: allClasses,
      students: report
    })
  }

  // Retornar resumo por turma
  const summary = await Promise.all(
    (turmas || []).map(async (t) => {
      const { count: totalStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('turma_id', t.id)

      return {
        id: t.id,
        nome: t.nome,
        curso: (t.courses as any)?.nome,
        total_alunos: totalStudents || 0
      }
    })
  )

  return NextResponse.json({ turmas: summary })
}
