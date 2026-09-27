import bcrypt from 'bcryptjs'
import { timingSafeEqual } from 'crypto'

const BCRYPT_ROUNDS = 12
export const MIN_PASSWORD_LENGTH = 8

// Hash usado quando o usuário não existe, para o tempo de resposta não revelar e-mails cadastrados
let dummyHash: Promise<string> | null = null
function getDummyHash() {
  dummyHash ??= bcrypt.hash('dummy-password', BCRYPT_ROUNDS)
  return dummyHash
}

export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`
  }
  return null
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export function isBcryptHash(hash: string) {
  return /^\$2[aby]\$\d{2}\$/.test(hash)
}

export async function verifyPassword(password: string, hash: string | null | undefined) {
  if (!hash || !isBcryptHash(hash)) {
    await bcrypt.compare(password, await getDummyHash())
    return false
  }
  return bcrypt.compare(password, hash)
}

// Contas antigas criadas com Base64 (sem hash). Usado só para migrar para bcrypt no próximo login.
export function matchesLegacyBase64(password: string, hash: string | null | undefined) {
  if (!hash || isBcryptHash(hash)) return false
  const expected = Buffer.from(Buffer.from(password).toString('base64'))
  const actual = Buffer.from(hash)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
