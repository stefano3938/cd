import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'
import { hashPassword } from '@/lib/auth/password'
import { handleError, parseBody } from '@/lib/http/errors'
import { createProfessorSchema } from '@/lib/validation/schemas'

const PROFESSOR_COLUMNS = 'id, email, nome, telefone, created_at'

export async function GET() {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const { data, error } = await supabase
      .from('users')
      .select(PROFESSOR_COLUMNS)
      .eq('role', 'professor')
      .order('nome')

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return handleError(error, 'listar professores')
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const { senha, ...professor } = await parseBody(request, createProfessorSchema)
    const password_hash = await hashPassword(senha)

    const { data, error } = await supabase
      .from('users')
      .insert({ ...professor, password_hash, role: 'professor' })
      .select(PROFESSOR_COLUMNS)
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return handleError(error, 'criar professor')
  }
}
