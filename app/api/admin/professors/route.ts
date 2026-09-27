import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { requireRole } from '@/lib/auth/guard'
import { hashPassword, validatePassword } from '@/lib/auth/password'
import { isUniqueViolation, serverError } from '@/lib/api/errors'
import { audit } from '@/lib/security/audit'

export async function GET() {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const { data, error } = await supabase
    .from('users')
    .select('id, email, nome, telefone, created_at')
    .eq('role', 'professor')
    .order('nome')

  if (error) return serverError('professors.list', error)
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session

  const body = await request.json()
  const { email, nome, telefone, senha } = body

  if (!email || !nome || !senha) {
    return NextResponse.json({ error: 'Campos obrigatórios: email, nome, senha' }, { status: 400 })
  }
  const passwordError = validatePassword(senha)
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('users')
    .insert({ email: String(email).trim(), nome, telefone, password_hash: await hashPassword(senha), role: 'professor' })
    .select('id, email, nome, telefone, created_at')
    .single()

  if (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 400 })
    }
    return serverError('professors.create', error)
  }
  await audit(request, session, { action: 'create', entity: 'user', entityId: data.id, details: { role: 'professor' } })
  return NextResponse.json(data, { status: 201 })
}
