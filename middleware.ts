import { NextRequest, NextResponse } from 'next/server'
import { Role, SESSION_COOKIE, verifySession } from '@/lib/auth/session'
import { getClientIp } from '@/lib/http/ip'

const TEACHING_ROLES: Role[] = ['admin', 'professor', 'monitor']

// ---------- Bloqueio manual de IPs ----------
// BLOCKED_IPS="1.2.3.4,5.6.7.8" nas variáveis de ambiente.
const blockedIps = new Set(
  (process.env.BLOCKED_IPS ?? '').split(',').map(ip => ip.trim()).filter(Boolean)
)

// ---------- Limite geral de requisições à API ----------
// Em memória, por instância: segura abusos simples. Para ataques maiores use o
// firewall da hospedagem (ex.: Vercel Firewall / Cloudflare). O login tem um
// limite próprio, guardado no banco (lib/auth/rate-limit.ts).
const API_LIMIT = 120 // requisições
const API_WINDOW_MS = 60 * 1000 // por minuto, por IP
const hits = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string) {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || entry.resetAt <= now) {
    if (hits.size > 10_000) hits.clear()
    hits.set(ip, { count: 1, resetAt: now + API_WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > API_LIMIT
}

// ---------- Autorização ----------

function isProtected(pathname: string) {
  return ['/admin', '/professor', '/api/admin', '/api/professor'].some(
    prefix => pathname === prefix || pathname.startsWith(prefix + '/')
  )
}

function requiredRoles(pathname: string): Role[] {
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    return ['admin']
  }
  return TEACHING_ROLES
}

function homeFor(role: Role) {
  return role === 'admin' ? '/admin/dashboard' : '/professor/chamada'
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith('/api/')
  const ip = getClientIp(request)

  if (blockedIps.has(ip)) {
    return new NextResponse('Acesso bloqueado', { status: 403 })
  }

  if (isApi && isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente em instantes.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  if (!isProtected(pathname)) {
    return NextResponse.next()
  }

  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value)

  if (!session) {
    return isApi
      ? NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url))
  }

  if (!requiredRoles(pathname).includes(session.role)) {
    return isApi
      ? NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
      : NextResponse.redirect(new URL(homeFor(session.role), request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Tudo, exceto arquivos estáticos
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)']
}
