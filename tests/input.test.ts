import { describe, expect, it, vi } from 'vitest'

// lib/api/attendance importa o cliente Supabase, que exige variáveis de ambiente
vi.mock('@/lib/supabase/client', () => ({ supabase: {} }))

import { parseAttendance } from '@/lib/api/attendance'
import { isCrossOrigin } from '@/lib/security/origin'

describe('parseAttendance', () => {
  it('aceita registros válidos', () => {
    expect(parseAttendance([{ student_id: 'a', status: 'presente' }, { student_id: 'b', status: 'falta' }]))
      .toEqual([{ student_id: 'a', status: 'presente' }, { student_id: 'b', status: 'falta' }])
  })

  it('descarta campos extras (ex.: marked_by forjado)', () => {
    expect(parseAttendance([{ student_id: 'a', status: 'presente', marked_by: 'outro' }]))
      .toEqual([{ student_id: 'a', status: 'presente' }])
  })

  it('rejeita lista vazia, não-lista, status inválido ou aluno ausente', () => {
    expect(parseAttendance([])).toBeNull()
    expect(parseAttendance('x')).toBeNull()
    expect(parseAttendance([{ student_id: 'a', status: 'talvez' }])).toBeNull()
    expect(parseAttendance([{ status: 'presente' }])).toBeNull()
    expect(parseAttendance([null])).toBeNull()
  })
})

describe('isCrossOrigin (CSRF)', () => {
  it('bloqueia POST/PUT/DELETE vindos de outro site', () => {
    expect(isCrossOrigin('POST', 'https://malicioso.com', 'app.igreja.org')).toBe(true)
    expect(isCrossOrigin('delete', 'https://malicioso.com', 'app.igreja.org')).toBe(true)
    expect(isCrossOrigin('POST', 'null', 'app.igreja.org')).toBe(true)
  })

  it('permite mesma origem, GET e requisições sem Origin', () => {
    expect(isCrossOrigin('POST', 'https://app.igreja.org', 'app.igreja.org')).toBe(false)
    expect(isCrossOrigin('GET', 'https://malicioso.com', 'app.igreja.org')).toBe(false)
    expect(isCrossOrigin('POST', null, 'app.igreja.org')).toBe(false)
  })
})
