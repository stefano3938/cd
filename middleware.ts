import { NextRequest, NextResponse } from 'next/server'
import { Role, SESSION_COOKIE, verifySession } from '@/lib/auth/session'

const TEACHING_ROLES: Role[] = ['admin', 'professor', 'monitor']

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
  matcher: ['/admin/:path*', '/professor/:path*', '/api/admin/:path*', '/api/professor/:path*']
}
