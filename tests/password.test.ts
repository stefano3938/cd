import { describe, expect, it } from 'vitest'
import {
  hashPassword,
  isBcryptHash,
  matchesLegacyBase64,
  validatePassword,
  verifyPassword,
} from '@/lib/auth/password'

describe('senhas', () => {
  it('valida tamanho mínimo', () => {
    expect(validatePassword('1234567')).not.toBeNull()
    expect(validatePassword(undefined)).not.toBeNull()
    expect(validatePassword(12345678)).not.toBeNull()
    expect(validatePassword('12345678')).toBeNull()
  })

  it('gera hash bcrypt e verifica corretamente', async () => {
    const hash = await hashPassword('senha-forte-123')
    expect(isBcryptHash(hash)).toBe(true)
    expect(await verifyPassword('senha-forte-123', hash)).toBe(true)
    expect(await verifyPassword('senha-errada', hash)).toBe(false)
  })

  it('nunca aceita hash que não seja bcrypt (ex.: Base64 legado) em verifyPassword', async () => {
    const legacy = Buffer.from('admin').toString('base64')
    expect(await verifyPassword('admin', legacy)).toBe(false)
    expect(await verifyPassword('admin', null)).toBe(false)
  })

  it('reconhece senha legada em Base64 só para migração', () => {
    const legacy = Buffer.from('minha-senha').toString('base64')
    expect(matchesLegacyBase64('minha-senha', legacy)).toBe(true)
    expect(matchesLegacyBase64('outra-senha', legacy)).toBe(false)
  })

  it('não trata hash bcrypt como legado', async () => {
    const hash = await hashPassword('minha-senha')
    expect(matchesLegacyBase64('minha-senha', hash)).toBe(false)
  })
})
