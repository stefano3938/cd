// O Supabase devolve no máximo 1000 linhas por consulta (configuração "Max rows").
// Acima disso o resultado vem cortado SEM erro. Este helper busca página por página até acabar.
// A consulta precisa de ordem estável (termine o .order() com uma coluna única, ex.: 'id').
export const PAGE_SIZE = 1000

type PageResult<T> = PromiseLike<{ data: T[] | null; error: unknown }>

export async function fetchAll<T>(page: (from: number, to: number) => PageResult<T>) {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) return { data: null, error }
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return { data: rows, error: null }
  }
}
