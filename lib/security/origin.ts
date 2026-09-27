const STATE_CHANGING = ['POST', 'PUT', 'PATCH', 'DELETE']

// Navegadores sempre enviam Origin em requisições que alteram dados.
// Se o Origin for de outro host, é uma tentativa de CSRF. Sem Origin (curl, scripts) segue para a autenticação normal.
export function isCrossOrigin(method: string, origin: string | null, host: string | null) {
  if (!STATE_CHANGING.includes(method.toUpperCase())) return false
  if (!origin) return false
  try {
    return new URL(origin).host !== host
  } catch {
    return true
  }
}
