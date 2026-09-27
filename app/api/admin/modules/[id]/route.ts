import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await request.json()
  const { nome, ordem, numero_de_aulas } = body

  const { data, error } = await supabase
    .from('modules')
    .update({ nome, ordem, numero_de_aulas })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const { error } = await supabase
    .from('modules')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
