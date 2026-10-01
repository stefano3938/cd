import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { serverError } from '@/lib/api/errors'
import { fetchAll } from '@/lib/supabase/fetch-all'

export async function GET(request: NextRequest) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const module_id = request.nextUrl.searchParams.get('module_id')

  // Sem module_id retorna todas as aulas (usado pela Caderneta de Chamadas)
  const { data, error } = await fetchAll((from, to) => {
    let query = supabase
      .from('classes')
      .select('*')
      .order('ordem')
      .order('id')
      .range(from, to)

    if (module_id) query = query.eq('module_id', module_id)
    return query
  })

  if (error) return serverError('classes.list', error)
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const body = await request.json()
  const { module_id, titulo, ordem, data_aula } = body

  if (!module_id || !titulo || ordem === undefined) {
    return NextResponse.json({ error: 'Campos obrigatórios: module_id, titulo, ordem' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('classes')
    .insert({ module_id, titulo, ordem, data_aula })
    .select()
    .single()

  if (error) return serverError('classes.create', error)
  return NextResponse.json(data, { status: 201 })
}
