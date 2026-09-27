import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/guard'
import { handleError, parseBody } from '@/lib/http/errors'
import { createModuleSchema } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  const auth = await requireUser(['admin'])
  if (auth instanceof NextResponse) return auth

  try {
    const input = await parseBody(request, createModuleSchema)

    const { data, error } = await supabase
      .from('modules')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return handleError(error, 'criar módulo')
  }
}
