import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { Role, Session, SESSION_COOKIE, verifySession } from './session'

export async function getSession() {
  return verifySession(cookies().get(SESSION_COOKIE)?.value)
}

// Uso nas rotas:
//   const auth = await requireUser(['admin'])
//   if (auth instanceof NextResponse) return auth
export async function requireUser(roles?: Role[]): Promise<Session | NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  if (roles && !roles.includes(session.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  return session
}

// IDs das turmas em que o usuário é professor/monitor.
export async function getUserTurmaIds(userId: string) {
  const { data, error } = await supabase
    .from('turma_professors')
    .select('turma_id')
    .eq('professor_id', userId)

  if (error) throw error
  return (data ?? []).map(tp => tp.turma_id as string)
}

// Admin acessa qualquer turma; professor/monitor só as suas.
export async function canAccessTurma(session: Session, turmaId: string) {
  if (session.role === 'admin') return true
  const turmaIds = await getUserTurmaIds(session.userId)
  return turmaIds.includes(turmaId)
}

export function forbidden() {
  return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
}
