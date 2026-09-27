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
