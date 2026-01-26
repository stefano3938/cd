import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET() {
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
  const body = await request.json()
  const { nome, ano, descricao, created_by } = body

  if (!nome || !ano) {
    return NextResponse.json({ error: 'Campos obrigatórios: nome, ano' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('courses')
    .insert({ nome, ano, descricao, created_by })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
