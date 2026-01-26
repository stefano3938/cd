import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    // Verificar se a tabela users existe e listar usuários
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, nome, role, created_at')
      .limit(10)

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      })
    }

    return NextResponse.json({
      success: true,
      users,
      count: users?.length || 0
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    })
  }
}
