import { describe, expect, it } from 'vitest'
import { fetchAll, PAGE_SIZE } from '@/lib/supabase/fetch-all'

// Simula o Supabase: devolve no máximo PAGE_SIZE linhas por chamada, conforme o range pedido
function fakeTable(total: number) {
  const rows = Array.from({ length: total }, (_, i) => i)
  const calls: [number, number][] = []
  const page = (from: number, to: number) => {
    calls.push([from, to])
    return Promise.resolve({ data: rows.slice(from, to + 1), error: null })
  }
  return { page, calls }
}

describe('fetchAll', () => {
  it('busca todas as linhas quando passa de 1000 (o Supabase cortaria sem erro)', async () => {
    const { page, calls } = fakeTable(2500)
    const { data, error } = await fetchAll(page)
    expect(error).toBeNull()
    expect(data).toHaveLength(2500)
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]])
  })

  it('faz uma chamada extra quando o total é múltiplo exato do tamanho da página', async () => {
    const { page, calls } = fakeTable(PAGE_SIZE)
    const { data } = await fetchAll(page)
    expect(data).toHaveLength(PAGE_SIZE)
    expect(calls).toHaveLength(2)
  })

  it('tabela vazia devolve lista vazia', async () => {
    const { data, error } = await fetchAll(fakeTable(0).page)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('para no primeiro erro e não devolve dados parciais', async () => {
    let n = 0
    const { data, error } = await fetchAll((from) => {
      n++
      return Promise.resolve(
        from === 0
          ? { data: Array(PAGE_SIZE).fill(1), error: null }
          : { data: null, error: { code: '500' } }
      )
    })
    expect(data).toBeNull()
    expect(error).toEqual({ code: '500' })
    expect(n).toBe(2)
  })
})
