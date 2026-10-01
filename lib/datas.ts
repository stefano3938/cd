// Colunas DATE do banco chegam como 'AAAA-MM-DD'. new Date('2026-10-05') interpreta como meia-noite UTC,
// que no Brasil (UTC−3) ainda é 04/10 — a data aparecia um dia antes. Aqui a data é montada no fuso local.
// Pode ser importado no cliente (sem segredos).

export function parseDataLocal(valor: string) {
  const [ano, mes, dia] = valor.slice(0, 10).split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

export function formatarData(valor?: string | null) {
  if (!valor) return '-'
  return parseDataLocal(valor).toLocaleDateString('pt-BR')
}
