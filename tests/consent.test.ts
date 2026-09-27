import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildConsent } from '@/lib/lgpd/consent'
import { calcularIdade, isMenor, PRIVACY_POLICY_VERSION } from '@/lib/lgpd/config'

describe('consentimento LGPD', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const adulto = '1990-01-01'
  const menor = '2012-01-01'

  it('calcula idade e maioridade', () => {
    expect(calcularIdade(adulto)).toBe(36)
    expect(isMenor(menor)).toBe(true)
    expect(isMenor(adulto)).toBe(false)
    expect(isMenor(null)).toBe(false)
  })

  it('exige confirmação explícita', () => {
    const r = buildConsent({ consentimento_titular: 'aluno', consentimento_confirmado: 'true' }, 'admin1')
    expect(r.error).not.toBeNull()
  })

  it('exige titular válido', () => {
    const r = buildConsent({ consentimento_titular: 'pastor', consentimento_confirmado: true }, 'admin1')
    expect(r.error).not.toBeNull()
  })

  it('menor de idade não pode consentir sozinho (art. 14)', () => {
    const r = buildConsent(
      { consentimento_titular: 'aluno', consentimento_confirmado: true, data_nascimento: menor },
      'admin1'
    )
    expect(r.error).toMatch(/responsável/)
  })

  it('consentimento do responsável exige nome do responsável', () => {
    const r = buildConsent(
      { consentimento_titular: 'responsavel', consentimento_confirmado: true, data_nascimento: menor },
      'admin1'
    )
    expect(r.error).toMatch(/responsável/)
  })

  it('registra versão do aviso, titular e quem registrou', () => {
    const r = buildConsent(
      {
        consentimento_titular: 'responsavel',
        consentimento_confirmado: true,
        data_nascimento: menor,
        nome_responsavel: 'Maria',
      },
      'admin1'
    )
    expect(r.error).toBeNull()
    expect(r.fields).toMatchObject({
      consentimento_titular: 'responsavel',
      consentimento_versao: PRIVACY_POLICY_VERSION,
      consentimento_registrado_por: 'admin1',
    })
  })

  it('aluno maior pode consentir', () => {
    const r = buildConsent(
      { consentimento_titular: 'aluno', consentimento_confirmado: true, data_nascimento: adulto },
      'admin1'
    )
    expect(r.error).toBeNull()
  })
})
