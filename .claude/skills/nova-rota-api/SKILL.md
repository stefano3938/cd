---
name: nova-rota-api
description: Cria uma rota de API Next.js (app/api/**/route.ts) seguindo o padrão seguro do projeto — autenticação com requireRole, validação de acesso à turma, campos permitidos, erros genéricos. Use sempre que for criar ou alterar uma rota em app/api.
---

# Nova rota de API

Siga este padrão ao criar ou alterar qualquer arquivo `app/api/**/route.ts`.

## 1. Escolha o perfil

| Pasta | Perfis | Chamada |
|-------|--------|---------|
| `app/api/admin/...` | admin | `requireRole('admin')` |
| `app/api/professor/...` | professor e admin | `requireRole('professor', 'admin')` |
| `app/api/auth/...` | público | sem `requireRole` — só login/logout |

Nunca crie rotas públicas fora de `app/api/auth`.

## 2. Modelo

```ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { canAccessTurma, forbidden, requireRole } from '@/lib/auth/guard'
import { serverError } from '@/lib/api/errors'

export async function POST(request: NextRequest) {
  const session = await requireRole('professor', 'admin')
  if (session instanceof NextResponse) return session

  const body = await request.json()
  const { turma_id, nome } = body   // desestruture só os campos permitidos

  if (!turma_id || typeof nome !== 'string') {
    return NextResponse.json({ error: 'Campos obrigatórios: turma_id, nome' }, { status: 400 })
  }

  if (!(await canAccessTurma(session, turma_id))) return forbidden()

  const { data, error } = await supabase
    .from('tabela')
    .insert({ turma_id, nome, created_by: session.sub })   // ID do usuário vem da sessão
    .select('id, nome')                                   // colunas explícitas
    .single()

  if (error) return serverError('tabela.create', error)
  return NextResponse.json(data, { status: 201 })
}
```

Em rotas dinâmicas (`[id]`), mantenha a assinatura usada no projeto:
`{ params }: { params: Promise<{ id: string }> }` e `const { id } = await params`.

## 3. Checklist antes de terminar

- [ ] `requireRole` é a **primeira** instrução de cada handler exportado (GET/POST/PUT/DELETE)
- [ ] Recebe `turma_id`? → `canAccessTurma`. Recebe `class_id`/`student_id` em rota de professor? → `classBelongsToTurma` / `studentsBelongToTurma` (`lib/api/attendance.ts`)
- [ ] Nenhum ID de usuário vindo do body/query (`marked_by`, `created_by`, `professor_id`) — use `session.sub`
- [ ] Sem `.update(body)` — só campos listados
- [ ] Tabela `users`: `select(USER_PUBLIC_COLUMNS)`, nunca `*`, nunca `password_hash` na resposta
- [ ] Erros via `serverError(...)`; conflito de unique via `isUniqueViolation`
- [ ] Nenhum `console.log` com dados pessoais
- [ ] Mexe com dado pessoal (criar/alterar/excluir/exportar/ver ficha)? → `await audit(request, session, { action, entity, entityId, details })` de `lib/security/audit.ts`, com `details` sem valores pessoais
- [ ] Altera senha ou perfil de usuário? → `revokeSessions(id)`
- [ ] O arquivo `route.ts` exporta **apenas** handlers HTTP (constantes compartilhadas vão para `lib/`)
- [ ] Rota nova sob `/api` já recebe rate limit do `middleware.ts`; se for sensível (ex.: reset de senha), adicione limite próprio com `hitLimit` de `lib/security/rate-limit.ts`
- [ ] Dado pessoal novo? Rode a skill `revisao-lgpd`
