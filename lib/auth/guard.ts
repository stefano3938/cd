import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { Role, Session, SESSION_COOKIE, verifySessionToken } from './session'

// Valida assinatura do cookie e confere no banco: usuário ainda existe, perfil atual e versão da sessão.
// Assim, excluir um usuário, mudar o perfil ou trocar a senha derruba as sessões abertas na hora.
export async function getSession(): Promise<Session | null> {
  const token = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value)
  if (!token) return null

  const { data: user } = await supabase
    .from('users')
    .select('id, role, nome, session_version')
    .eq('id', token.sub)
    .maybeSingle()

  if (!user || user.session_version !== token.ver) return null

  return { ...token, role: user.role, nome: user.nome }
}

/**
 * Uso em rotas:
 *   const session = await requireRole('admin')
 *   if (session instanceof NextResponse) return session
 */
export async function requireRole(...roles: Role[]): Promise<Session | NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  if (!roles.includes(session.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }
  return session
}

// Admin acessa qualquer turma; professor apenas as turmas atribuídas a ele
export async function canAccessTurma(session: Session, turmaId: string) {
  if (session.role === 'admin') return true

  const { data } = await supabase
    .from('turma_professors')
    .select('id')
    .eq('turma_id', turmaId)
    .eq('professor_id', session.sub)
    .maybeSingle()

  return !!data
}

// Invalida todas as sessões abertas do usuário
export async function revokeSessions(userId: string) {
  const { data } = await supabase
    .from('users')
    .select('session_version')
    .eq('id', userId)
    .maybeSingle()
  if (!data) return null

  const next = (data.session_version ?? 0) + 1
  await supabase.from('users').update({ session_version: next }).eq('id', userId)
  return next
}

export function forbidden() {
  return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
}
