// Rate limit e bloqueio de IP via funções SQL (migração 002).
// Usa fetch direto no PostgREST para funcionar no middleware (edge) sem carregar o supabase-js.
import type { NextRequest } from 'next/server'

export type GuardStatus = 'ok' | 'rate_limited' | 'blocked'

export const LIMITS = {
  login: { limit: 10, windowSeconds: 60 },         // por IP
  loginAccount: { limit: 5, windowSeconds: 900 },  // por IP + e-mail
  api: { limit: 120, windowSeconds: 60 },          // por IP, demais rotas /api
  loginFailStrikes: { max: 10, windowSeconds: 900, blockSeconds: 900 },
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase não configurado')

  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`rpc ${fn} falhou: ${res.status}`)
  return res.json() as Promise<T>
}

// Na Vercel, request.ip e x-forwarded-for são definidos pela plataforma (não pelo cliente).
// Fora da Vercel, confirme que o proxy sobrescreve x-forwarded-for; senão o IP pode ser forjado.
export function getClientIp(request: NextRequest) {
  return (
    request.ip ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  )
}

// Em caso de falha do banco, libera a requisição (fail-open): a autenticação continua protegendo as rotas
export async function guardRequest(ip: string, bucket: string, limit: number, windowSeconds: number) {
  try {
    const [row] = await rpc<{ status: GuardStatus; retry_after: number }[]>('api_guard', {
      p_ip: ip,
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })
    return { status: row?.status ?? 'ok', retryAfter: row?.retry_after ?? 0 }
  } catch (error) {
    console.error('[rate-limit] guardRequest', (error as Error).message)
    return { status: 'ok' as GuardStatus, retryAfter: 0 }
  }
}

export async function hitLimit(key: string, limit: number, windowSeconds: number) {
  try {
    const [row] = await rpc<{ allowed: boolean; retry_after: number }[]>('rate_limit_hit', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })
    return { allowed: row?.allowed ?? true, retryAfter: row?.retry_after ?? 0 }
  } catch (error) {
    console.error('[rate-limit] hitLimit', (error as Error).message)
    return { allowed: true, retryAfter: 0 }
  }
}

export async function resetLimit(key: string) {
  try {
    await rpc('rate_limit_reset', { p_key: key })
  } catch (error) {
    console.error('[rate-limit] resetLimit', (error as Error).message)
  }
}

// Retorna os segundos de bloqueio aplicados (0 se o IP não foi bloqueado)
export async function registerStrike(ip: string, reason: string) {
  const { max, windowSeconds, blockSeconds } = LIMITS.loginFailStrikes
  try {
    return await rpc<number>('ip_register_strike', {
      p_ip: ip,
      p_reason: reason,
      p_max_strikes: max,
      p_window_seconds: windowSeconds,
      p_block_seconds: blockSeconds,
    })
  } catch (error) {
    console.error('[rate-limit] registerStrike', (error as Error).message)
    return 0
  }
}

export function tooManyRequestsBody(status: GuardStatus) {
  return {
    error: status === 'blocked'
      ? 'Acesso temporariamente bloqueado por excesso de requisições.'
      : 'Muitas requisições. Tente novamente em instantes.',
  }
}
