import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'
import { hashPassword } from '@/lib/auth/password'

export async function GET() {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  const { data, error } = await supabase
    .from('users')
    .select('id, email, nome, telefone, created_at')
    .eq('role', 'professor')
    .order('nome')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const { email, nome, telefone, senha } = body

  if (!email || !nome || !senha) {
    return NextResponse.json({ error: 'Campos obrigatórios: email, nome, senha' }, { status: 400 })
  }

  const password_hash = await hashPassword(senha)

  const { data, error } = await supabase
    .from('users')
    .insert({ email, nome, telefone, password_hash, role: 'professor' })
    .select('id, email, nome, telefone, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
