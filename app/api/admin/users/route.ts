import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'
import { hashPassword } from '@/lib/auth/password'
import { handleError, parseBody } from '@/lib/http/errors'
import { USER_COLUMNS } from '@/lib/supabase/columns'
import { createUserSchema } from '@/lib/validation/schemas'

export async function GET() {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const { data, error } = await supabase
      .from('users')
      .select(USER_COLUMNS)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return handleError(error, 'listar usuários')
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const { password, ...user } = await parseBody(request, createUserSchema)
    const password_hash = await hashPassword(password)

    const { data, error } = await supabase
      .from('users')
      .insert({ ...user, password_hash })
      .select(USER_COLUMNS)
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return handleError(error, 'criar usuário')
  }
}
