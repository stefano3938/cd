import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/guard'

// Sessão atual validada no banco (usuário existe, perfil atual, sessão não revogada)
export async function GET() {
  const session = await requireRole('admin', 'professor', 'monitor')
  if (session instanceof NextResponse) return session

  return NextResponse.json({ id: session.sub, nome: session.nome, role: session.role })
}
