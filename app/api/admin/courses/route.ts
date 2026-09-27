import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { serverError } from '@/lib/api/errors'

export async function GET() {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { data, error } = await supabase
    .from('courses')
    .select('*, modules(id, nome, ordem, numero_de_aulas)')
    .order('ano', { ascending: false })

  if (error) return serverError('courses.list', error)
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const body = await request.json()
  const { nome, ano, descricao } = body

  if (!nome || !ano) {
    return NextResponse.json({ error: 'Campos obrigatórios: nome, ano' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('courses')
    .insert({ nome, ano, descricao, created_by: session.sub })
    .select()
    .single()

  if (error) return serverError('courses.create', error)
  return NextResponse.json(data, { status: 201 })
}
