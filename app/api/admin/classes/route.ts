import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'

export async function GET(request: NextRequest) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  const module_id = request.nextUrl.searchParams.get('module_id')

  if (!module_id) {
    return NextResponse.json({ error: 'module_id obrigatório' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('module_id', module_id)
    .order('ordem')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
