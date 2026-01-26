import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    // Inserir usuário admin
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email: 'admin@capacitacao.com',
          password_hash: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
          nome: 'Administrador',
          role: 'admin'
        }
      ])
      .select()

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Usuário admin criado com sucesso!',
      user: data
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
