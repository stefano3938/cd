import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }
  return NextResponse.json(data)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await request.json()
  const { titulo, ordem, data_aula } = body

  const { data, error } = await supabase
    .from('classes')
    .update({ titulo, ordem, data_aula })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
