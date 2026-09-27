import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { canAccessTurma, forbidden, getUserTurmaIds, requireUser } from '@/lib/auth/guard'
import { handleError, parseBody, parseData } from '@/lib/http/errors'
import { saveAttendanceSchema, uuid } from '@/lib/validation/schemas'

// Buscar chamada de uma aula específica
export async function GET(request: NextRequest) {
  const auth = await requireUser(['admin', 'professor', 'monitor'])
  if (auth instanceof NextResponse) return auth

  try {
    const class_id = parseData(request.nextUrl.searchParams.get('class_id'), uuid)
    const turma_id = parseData(request.nextUrl.searchParams.get('turma_id'), uuid)

    if (!(await canAccessTurma(auth, turma_id))) return forbidden()

    // Buscar alunos da turma com seus status de presença para esta aula
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, nome')
      .eq('turma_id', turma_id)
      .order('nome')

    if (studentsError) throw studentsError

    // Buscar presenças já registradas
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('student_id, status')
      .eq('class_id', class_id)

    if (attendanceError) throw attendanceError

    // Mesclar dados
    const attendanceMap = new Map(attendance?.map(a => [a.student_id, a.status]) || [])
    const result = students?.map(s => ({
      ...s,
      status: attendanceMap.get(s.id) || null
    })) || []

    return NextResponse.json(result)
  } catch (error) {
    return handleError(error, 'buscar chamada')
  }
}

// Salvar chamada
export async function POST(request: NextRequest) {
  const auth = await requireUser(['admin', 'professor', 'monitor'])
  if (auth instanceof NextResponse) return auth

  try {
    const { class_id, attendance } = await parseBody(request, saveAttendanceSchema)

    if (attendance.length === 0) {
      return NextResponse.json({ success: true })
    }

    // Professor/monitor só pode marcar alunos das próprias turmas
    if (auth.role !== 'admin') {
      const studentIds = attendance.map(a => a.student_id)
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, turma_id')
        .in('id', studentIds)

      if (studentsError) throw studentsError

      const turmaIds = await getUserTurmaIds(auth.userId)
      const allowed = students?.length === new Set(studentIds).size &&
        students.every(s => turmaIds.includes(s.turma_id))
      if (!allowed) return forbidden()
    }

    // Usar upsert para inserir ou atualizar
    const records = attendance.map(a => ({
      student_id: a.student_id,
      class_id,
      status: a.status,
      marked_by: auth.userId,
      marked_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('attendance')
      .upsert(records, { onConflict: 'student_id,class_id' })

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error, 'salvar chamada')
  }
}
