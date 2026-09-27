import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/guard'

export const dynamic = 'force-dynamic'

// Retorna o usuário da sessão atual (usado pelo front no lugar do localStorage).
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  return NextResponse.json({ id: session.userId, nome: session.nome, role: session.role })
}
