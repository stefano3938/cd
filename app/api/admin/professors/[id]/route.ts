import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'
import { hashPassword } from '@/lib/auth/password'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await request.json()
  const { email, nome, telefone, senha } = body

  const updateData: any = { email, nome, telefone }
  if (senha) {
    updateData.password_hash = await hashPassword(senha)
  }

  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', id)
    .eq('role', 'professor')
    .select('id, email, nome, telefone, created_at')
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
    .from('users')
    .delete()
    .eq('id', id)
    .eq('role', 'professor')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
