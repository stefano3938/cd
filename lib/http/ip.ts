import type { NextRequest } from 'next/server'

// IP do cliente. Na Vercel, request.ip e x-forwarded-for são preenchidos pela
// própria plataforma. Em outro host, garanta que um proxy confiável defina
// x-forwarded-for, senão o cliente pode falsificar o valor.
export function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return request.ip ?? forwarded ?? request.headers.get('x-real-ip') ?? 'desconhecido'
}
