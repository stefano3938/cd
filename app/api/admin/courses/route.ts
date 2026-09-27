import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'

export async function GET() {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  const { data, error } = await supabase
    .from('courses')
    .select('*, modules(id, nome, ordem, numero_de_aulas)')
    .order('ano', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const { nome, ano, descricao } = body

  if (!nome || !ano) {
    return NextResponse.json({ error: 'Campos obrigatórios: nome, ano' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('courses')
    .insert({ nome, ano, descricao, created_by: auth.userId })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
