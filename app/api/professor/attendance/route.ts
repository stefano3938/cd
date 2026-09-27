import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { canAccessTurma, forbidden, getUserTurmaIds, requireUser } from '@/lib/auth/guard'

// Buscar chamada de uma aula específica
export async function GET(request: NextRequest) {
  const auth = await requireUser(['admin', 'professor', 'monitor'])
  if (auth instanceof NextResponse) return auth

  const class_id = request.nextUrl.searchParams.get('class_id')
  const turma_id = request.nextUrl.searchParams.get('turma_id')

  if (!class_id || !turma_id) {
    return NextResponse.json({ error: 'class_id e turma_id obrigatórios' }, { status: 400 })
  }

  if (!(await canAccessTurma(auth, turma_id))) return forbidden()

  // Buscar alunos da turma com seus status de presença para esta aula
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, nome')
    .eq('turma_id', turma_id)
    .order('nome')

  if (studentsError) {
    return NextResponse.json({ error: studentsError.message }, { status: 500 })
  }

  // Buscar presenças já registradas
  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .select('student_id, status')
    .eq('class_id', class_id)

  if (attendanceError) {
    return NextResponse.json({ error: attendanceError.message }, { status: 500 })
  }

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
  const auth = await requireUser(['admin', 'professor', 'monitor'])
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const { class_id, attendance } = body

  if (!class_id || !attendance || !Array.isArray(attendance)) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: class_id, attendance (array)' },
      { status: 400 }
    )
  }

  // Professor/monitor só pode marcar alunos das próprias turmas
  if (auth.role !== 'admin') {
    const studentIds = attendance.map((a: { student_id: string }) => a.student_id)
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, turma_id')
      .in('id', studentIds)

    if (studentsError) {
      return NextResponse.json({ error: 'Erro ao validar alunos' }, { status: 500 })
    }

    const turmaIds = await getUserTurmaIds(auth.userId)
    const allowed = students?.length === new Set(studentIds).size &&
      students.every(s => turmaIds.includes(s.turma_id))
    if (!allowed) return forbidden()
  }

  // Usar upsert para inserir ou atualizar
  const records = attendance.map((a: { student_id: string; status: string }) => ({
    student_id: a.student_id,
    class_id,
    status: a.status,
    marked_by: auth.userId,
    marked_at: new Date().toISOString()
  }))

  const { error } = await supabase
    .from('attendance')
    .upsert(records, { onConflict: 'student_id,class_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
