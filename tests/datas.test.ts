import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { formatarData, parseDataLocal } from '@/lib/datas'
import { calcularIdade, isMenor } from '@/lib/lgpd/config'

// O bug só aparece em fuso negativo (Brasil). Força o fuso de São Paulo durante estes testes.
const tzOriginal = process.env.TZ
beforeAll(() => { process.env.TZ = 'America/Sao_Paulo' })
afterAll(() => { process.env.TZ = tzOriginal })

describe('datas sem deslocamento de fuso', () => {
  it('mostra a mesma data gravada no banco (antes aparecia um dia antes)', () => {
    expect(formatarData('2026-10-05')).toBe('05/10/2026')
    expect(formatarData('2026-01-01')).toBe('01/01/2026')
  })

  it('aceita valor vazio', () => {
    expect(formatarData(null)).toBe('-')
    expect(formatarData('')).toBe('-')
  })

  it('monta a data no fuso local', () => {
    const d = parseDataLocal('2026-10-05')
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 5])
  })

  it('no dia do aniversário de 18 anos a pessoa já é maior', () => {
    const aniversario = new Date(2026, 9, 5, 8, 0)
    expect(calcularIdade('2008-10-05', aniversario)).toBe(18)
    expect(calcularIdade('2008-10-06', aniversario)).toBe(17)
  })

  it('isMenor continua tratando ausência de data como não menor', () => {
    expect(isMenor(undefined)).toBe(false)
  })
})
