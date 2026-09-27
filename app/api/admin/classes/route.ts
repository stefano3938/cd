import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'
import { handleError, parseBody, parseData } from '@/lib/http/errors'
import { createClassSchema, uuid } from '@/lib/validation/schemas'

export async function GET(request: NextRequest) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const module_id = parseData(request.nextUrl.searchParams.get('module_id'), uuid)

    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('module_id', module_id)
      .order('ordem')

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return handleError(error, 'listar aulas')
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const input = await parseBody(request, createClassSchema)

    const { data, error } = await supabase
      .from('classes')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return handleError(error, 'criar aula')
  }
}
