import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { serverError } from '@/lib/api/errors'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params
  const body = await request.json()
  const { nome, ordem, numero_de_aulas } = body

  const { data, error } = await supabase
    .from('modules')
    .update({ nome, ordem, numero_de_aulas })
    .eq('id', id)
    .select()
    .single()

  if (error) return serverError('modules.update', error)
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { id } = await params

  const { error } = await supabase
    .from('modules')
    .delete()
    .eq('id', id)

  if (error) return serverError('modules.delete', error)
  return NextResponse.json({ success: true })
}
