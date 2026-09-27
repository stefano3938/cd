import { supabase } from '@/lib/supabase/server'

// Limites de tentativas de login com falha, numa janela de 15 minutos.
// Guardado no banco para valer entre instâncias do servidor (serverless).
const WINDOW_MINUTES = 15
const MAX_FAILURES_PER_EMAIL = 5
const MAX_FAILURES_PER_IP = 20

export interface LoginLimit {
  blocked: boolean
  retryAfterSeconds: number
}

function windowStart() {
  return new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString()
}

async function countFailures(column: 'ip' | 'email', value: string) {
  const { count, error } = await supabase
    .from('login_attempts')
    .select('id', { count: 'exact', head: true })
    .eq(column, value)
    .eq('success', false)
    .gte('created_at', windowStart())

  if (error) throw error
  return count ?? 0
}

export async function checkLoginLimit(ip: string, email: string): Promise<LoginLimit> {
  const [byIp, byEmail] = await Promise.all([
    countFailures('ip', ip),
    countFailures('email', email)
  ])

  const blocked = byIp >= MAX_FAILURES_PER_IP || byEmail >= MAX_FAILURES_PER_EMAIL
  return { blocked, retryAfterSeconds: blocked ? WINDOW_MINUTES * 60 : 0 }
}

export async function recordLoginAttempt(ip: string, email: string, success: boolean) {
  const { error } = await supabase
    .from('login_attempts')
    .insert({ ip, email, success })

  if (error) console.error('Erro ao registrar tentativa de login:', error.code)

  // Limpeza ocasional de registros antigos
  if (Math.random() < 0.05) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('login_attempts').delete().lt('created_at', oneDayAgo)
  }
}
