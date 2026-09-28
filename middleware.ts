<<<<<<< HEAD
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const pathname = request.nextUrl.pathname

  // Rotas públicas
  const publicRoutes = ['/login', '/']
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith('/_next'))

  // Se não tem sessão e não é rota pública, redireciona para login
  if (!session && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Se tem sessão e está na página de login, redireciona baseado no role
  if (session && pathname === '/login') {
    // Busca o perfil do usuário para saber o role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', session.user.id)
      .single()

    if (profile?.role === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/professor/chamada', request.url))
    }
  }

  // Verifica permissões para rotas de admin
  if (session && pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', session.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/professor/chamada', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
=======
import { NextRequest, NextResponse } from 'next/server'
import { Role, SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'
import { getClientIp, guardRequest, LIMITS, tooManyRequestsBody } from '@/lib/security/rate-limit'
import { isCrossOrigin } from '@/lib/security/origin'

// Primeira barreira. Cada rota de API também valida a sessão (requireRole),
// então a segurança não depende só do middleware.
const RULES: { prefix: string; roles: Role[] }[] = [
  { prefix: '/api/admin', roles: ['admin'] },
  { prefix: '/api/professor', roles: ['professor', 'admin'] },
  { prefix: '/admin', roles: ['admin'] },
  { prefix: '/professor', roles: ['professor'] },
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith('/api/')

  // Defesa extra contra CSRF (além do cookie sameSite=lax)
  if (isApi && isCrossOrigin(request.method, request.headers.get('origin'), request.headers.get('host'))) {
    return NextResponse.json({ error: 'Origem não permitida' }, { status: 403 })
  }

  // Rate limit + bloqueio de IP em todas as rotas de API
  if (isApi) {
    const isLogin = pathname === '/api/auth/login'
    const { limit, windowSeconds } = isLogin ? LIMITS.login : LIMITS.api
    const { status, retryAfter } = await guardRequest(
      getClientIp(request),
      isLogin ? 'login' : 'api',
      limit,
      windowSeconds
    )
    if (status !== 'ok') {
      return NextResponse.json(tooManyRequestsBody(status), {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      })
    }
  }

  const rule = RULES.find(r => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`))
  if (!rule) return NextResponse.next()

  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)

  if (!session) {
    return isApi
      ? NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url))
  }

  if (!rule.roles.includes(session.role)) {
    if (isApi) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    // Monitor ainda não tem área própria: volta para o login em vez de entrar em loop de redirecionamento
    const home = session.role === 'admin' ? '/admin/dashboard'
      : session.role === 'professor' ? '/professor/chamada'
      : '/login'
    return NextResponse.redirect(new URL(home, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/professor/:path*', '/api/:path*'],
>>>>>>> 15730aa7f64577f0d7fb8de6e6f75e38549f3300
}
