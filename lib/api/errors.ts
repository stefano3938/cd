import { NextResponse } from 'next/server'

// Registra o erro no servidor e devolve mensagem genérica, sem detalhes internos do banco
export function serverError(context: string, error: unknown) {
  const code = (error as { code?: string })?.code
  console.error(`[${context}]`, code ?? '', (error as Error)?.message ?? error)
  return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
}

export function isUniqueViolation(error: unknown) {
  return (error as { code?: string })?.code === '23505'
}

// Registro ainda referenciado por outro (ON DELETE RESTRICT, migração 006)
export function isForeignKeyViolation(error: unknown) {
  return (error as { code?: string })?.code === '23503'
}

// Função SQL inexistente: a migração correspondente ainda não foi rodada no Supabase
export function isMissingFunction(error: unknown) {
  return (error as { code?: string })?.code === 'PGRST202'
}

export const MIGRACAO_006_PENDENTE =
  'Exclusão bloqueada: rode a migração 006_protege_exclusoes.sql no Supabase. Sem ela, excluir o usuário apagaria as chamadas que ele fez.'

export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 })
}
