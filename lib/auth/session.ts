// Sessão assinada com HMAC-SHA256 (Web Crypto) — funciona no middleware (edge) e nas rotas (node)

export type Role = 'admin' | 'professor' | 'monitor'

export interface Session {
  sub: string
  role: Role
  nome: string
  ver: number   // users.session_version no momento do login; se mudar, a sessão é revogada
  exp: number
}

export const SESSION_COOKIE = 'session'
export const SESSION_TTL_SECONDS = 60 * 60 * 8

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
}

const encoder = new TextEncoder()

function getSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET não configurado (mínimo 32 caracteres)')
  }
  return secret
}

function toBase64Url(bytes: Uint8Array) {
  let binary = ''
  bytes.forEach(b => { binary += String.fromCharCode(b) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(binary, c => c.charCodeAt(0))
}

async function getKey() {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function createSessionToken(user: { id: string; role: Role; nome: string; session_version: number }) {
  const session: Session = {
    sub: user.id,
    role: user.role,
    nome: user.nome,
    ver: user.session_version,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  }
  const payload = toBase64Url(encoder.encode(JSON.stringify(session)))
  const signature = await crypto.subtle.sign('HMAC', await getKey(), encoder.encode(payload))
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`
}

export async function verifySessionToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null

  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await getKey(),
      fromBase64Url(signature),
      encoder.encode(payload)
    )
    if (!valid) return null

    const session = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as Session
    if (
      !session.sub ||
      !session.role ||
      typeof session.ver !== 'number' ||
      session.exp < Math.floor(Date.now() / 1000)
    ) {
      return null
    }
    return session
  } catch {
    return null
  }
}
