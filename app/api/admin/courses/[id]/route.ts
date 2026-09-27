import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { serverError } from '@/lib/api/errors'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params

  const { data, error } = await supabase
    .from('courses')
    .select('*, modules(id, nome, ordem, numero_de_aulas)')
    .eq('id', id)
    .single()

  if (error) return serverError('courses.get', error)
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params
  const body = await request.json()
  const { nome, ano, descricao } = body

  const { data, error } = await supabase
    .from('courses')
    .update({ nome, ano, descricao })
    .eq('id', id)
    .select()
    .single()

  if (error) return serverError('courses.update', error)
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params

  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', id)

  if (error) return serverError('courses.delete', error)
  return NextResponse.json({ success: true })
}
