import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { serverError } from '@/lib/api/errors'
import { parseAttendance } from '@/lib/api/attendance'
import { audit } from '@/lib/security/audit'
import { fetchAll } from '@/lib/supabase/fetch-all'

export async function GET(request: NextRequest) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const class_id = request.nextUrl.searchParams.get('class_id')
  const student_id = request.nextUrl.searchParams.get('student_id')
  const turma_id = request.nextUrl.searchParams.get('turma_id')

  // Busca paginada: sem isso o Supabase corta em 1000 linhas e a frequência sai errada
  const { data, error } = await fetchAll((from, to) => {
    let query = supabase
      .from('attendance')
      .select('id, student_id, class_id, status, marked_at, students!inner(nome, turma_id), classes(titulo, data_aula)')
      .order('marked_at', { ascending: false })
      .order('id')
      .range(from, to)

    if (class_id) query = query.eq('class_id', class_id)
    if (student_id) query = query.eq('student_id', student_id)
    if (turma_id) query = query.eq('students.turma_id', turma_id)
    return query
  })

  if (error) return serverError('attendance.list', error)
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const body = await request.json()
  const { class_id } = body
  const attendance = parseAttendance(body.attendance)

  if (!class_id || !attendance) {
    return NextResponse.json({ error: 'Campos obrigatórios: class_id, attendance' }, { status: 400 })
  }

  // Upsert em vez de apagar e reinserir: se algo falhar, as presenças já gravadas não se perdem
  const records = attendance.map(a => ({
    student_id: a.student_id,
    class_id,
    status: a.status,
    marked_by: session.sub,
    marked_at: new Date().toISOString()
  }))

  const { data, error } = await supabase
    .from('attendance')
    .upsert(records, { onConflict: 'student_id,class_id' })
    .select()

  if (error) return serverError('attendance.save', error)
  await audit(request, session, {
    action: 'update',
    entity: 'attendance',
    entityId: class_id,
    details: { registros: records.length }
  })
  return NextResponse.json(data, { status: 201 })
}
