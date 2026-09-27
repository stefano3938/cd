import { NextResponse } from 'next/server'
import { z, ZodType } from 'zod'

z.config(z.locales.pt())

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

// Lê e valida o corpo JSON; lança HttpError 400 se inválido.
export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new HttpError(400, 'Corpo da requisição inválido')
  }
  return parseData(body, schema)
}

export function parseData<T>(data: unknown, schema: ZodType<T>): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const issue = result.error.issues[0]
    const field = issue.path.join('.')
    throw new HttpError(400, field ? `${field}: ${issue.message}` : issue.message)
  }
  return result.data
}

// Converte qualquer erro em resposta padronizada, sem expor detalhes do banco.
export function handleError(error: unknown, context: string) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  const code = (error as { code?: string } | null)?.code
  switch (code) {
    case '23505':
      return NextResponse.json({ error: 'Registro duplicado' }, { status: 409 })
    case '23503':
      return NextResponse.json(
        { error: 'Operação não permitida: registro vinculado a outros dados' },
        { status: 409 }
      )
    case '22P02':
      return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 })
    case 'PGRST116':
      return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 })
  }

  console.error(`Erro ao ${context}:`, error)
  return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
}
