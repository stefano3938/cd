import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'

export async function GET(request: NextRequest) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  const class_id = request.nextUrl.searchParams.get('class_id')
  const student_id = request.nextUrl.searchParams.get('student_id')

  let query = supabase
    .from('attendance')
    .select('*, students(nome), classes(titulo)')
    .order('marked_at', { ascending: false })

  if (class_id) {
    query = query.eq('class_id', class_id)
  }

  if (student_id) {
    query = query.eq('student_id', student_id)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const { class_id, attendance } = body

  if (!class_id || !attendance || !Array.isArray(attendance)) {
    return NextResponse.json({ error: 'Campos obrigatórios: class_id, attendance' }, { status: 400 })
  }

  try {
    // Remove registros existentes para esta aula
    await supabase
      .from('attendance')
      .delete()
      .eq('class_id', class_id)

    // Insere novos registros
    const records = attendance.map((a: { student_id: string; status: string }) => ({
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
    console.error('Error saving attendance:', error)
    return NextResponse.json({ error: 'Erro ao salvar chamada' }, { status: 500 })
  }
}
