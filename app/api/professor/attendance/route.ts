import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { canAccessTurma, forbidden, requireRole } from '@/lib/auth/guard'
import { serverError } from '@/lib/api/errors'
import { classBelongsToTurma, parseAttendance, studentsBelongToTurma } from '@/lib/api/attendance'
import { audit } from '@/lib/security/audit'

// Buscar chamada de uma aula específica
export async function GET(request: NextRequest) {
  const session = await requireRole('professor', 'admin')
  if (session instanceof NextResponse) return session

  const class_id = request.nextUrl.searchParams.get('class_id')
  const turma_id = request.nextUrl.searchParams.get('turma_id')

  if (!class_id || !turma_id) {
    return NextResponse.json({ error: 'class_id e turma_id obrigatórios' }, { status: 400 })
  }

  if (!(await canAccessTurma(session, turma_id)) || !(await classBelongsToTurma(class_id, turma_id))) {
    return forbidden()
  }

  // Buscar alunos da turma com seus status de presença para esta aula
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, nome')
    .eq('turma_id', turma_id)
    .order('nome')

  if (studentsError) return serverError('professor.attendance.students', studentsError)

  const studentIds = students?.map(s => s.id) || []

  // Buscar presenças já registradas (apenas dos alunos desta turma)
  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .select('student_id, status')
    .eq('class_id', class_id)
    .in('student_id', studentIds)

  if (attendanceError) return serverError('professor.attendance.list', attendanceError)

  // Mesclar dados
  const attendanceMap = new Map(attendance?.map(a => [a.student_id, a.status]) || [])
  const result = students?.map(s => ({
    ...s,
    status: attendanceMap.get(s.id) || null
  })) || []

  return NextResponse.json(result)
}

// Salvar chamada
export async function POST(request: NextRequest) {
  const session = await requireRole('professor', 'admin')
  if (session instanceof NextResponse) return session

  const body = await request.json()
  const { class_id, turma_id } = body
  const attendance = parseAttendance(body.attendance)

  if (!class_id || !turma_id || !attendance) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: class_id, turma_id, attendance (array)' },
      { status: 400 }
    )
  }

  if (
    !(await canAccessTurma(session, turma_id)) ||
    !(await classBelongsToTurma(class_id, turma_id)) ||
    !(await studentsBelongToTurma(attendance.map(a => a.student_id), turma_id))
  ) {
    return forbidden()
  }

  // Usar upsert para inserir ou atualizar. Quem marcou vem da sessão, não do cliente.
  const records = attendance.map(a => ({
    student_id: a.student_id,
    class_id,
    status: a.status,
    marked_by: session.sub,
    marked_at: new Date().toISOString()
  }))

  const { error } = await supabase
    .from('attendance')
    .upsert(records, { onConflict: 'student_id,class_id' })

  if (error) return serverError('professor.attendance.save', error)

  await audit(request, session, {
    action: 'update',
    entity: 'attendance',
    entityId: class_id,
    details: { turma_id, registros: records.length }
  })

  return NextResponse.json({ success: true })
}
