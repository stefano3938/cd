import { SignJWT, jwtVerify } from 'jose'

// Este arquivo roda também no middleware (Edge), por isso não usa next/headers.

export type Role = 'admin' | 'professor' | 'monitor'

export interface Session {
  userId: string
  role: Role
  nome: string
}

export const SESSION_COOKIE = 'session'
const MAX_AGE_SECONDS = 60 * 60 * 8 // 8 horas

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: MAX_AGE_SECONDS
}

function getSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET ausente ou curto (mínimo 32 caracteres)')
  }
  return new TextEncoder().encode(secret)
}

export async function signSession(session: Session) {
  return new SignJWT({ role: session.role, nome: session.nome })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret())
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null
  const secret = getSecret()
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
    const role = payload.role
    if (!payload.sub || (role !== 'admin' && role !== 'professor' && role !== 'monitor')) {
      return null
    }
    return { userId: payload.sub, role, nome: String(payload.nome ?? '') }
  } catch {
    return null
  }
}
