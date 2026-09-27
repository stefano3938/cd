import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'
import { handleError, parseBody, parseData } from '@/lib/http/errors'
import { saveAttendanceSchema, uuid } from '@/lib/validation/schemas'

export async function GET(request: NextRequest) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const classParam = request.nextUrl.searchParams.get('class_id')
    const studentParam = request.nextUrl.searchParams.get('student_id')

    let query = supabase
      .from('attendance')
      .select('*, students(nome), classes(titulo)')
      .order('marked_at', { ascending: false })

    if (classParam) {
      query = query.eq('class_id', parseData(classParam, uuid))
    }

    if (studentParam) {
      query = query.eq('student_id', parseData(studentParam, uuid))
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return handleError(error, 'listar presenças')
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const { class_id, attendance } = await parseBody(request, saveAttendanceSchema)

    // Remove registros existentes para esta aula
    const { error: deleteError } = await supabase
      .from('attendance')
      .delete()
      .eq('class_id', class_id)

    if (deleteError) throw deleteError

    if (attendance.length === 0) {
      return NextResponse.json([], { status: 201 })
    }

    // Insere novos registros
    const records = attendance.map(a => ({
      student_id: a.student_id,
      class_id,
      status: a.status,
      marked_by: auth.userId
    }))

    const { data, error } = await supabase
      .from('attendance')
      .insert(records)
      .select()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return handleError(error, 'salvar chamada')
  }
}
