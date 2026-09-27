# Back-end — Guia de Organização

Este documento define como o back-end (rotas `app/api/*`) deve ser organizado.
Serve de referência para novas rotas e para a refatoração das existentes.

> Modelo de dados e regras do banco: veja [`BANCO_DE_DADOS.md`](./BANCO_DE_DADOS.md).

---

## 1. Visão geral

| Camada | Onde fica | Responsabilidade |
|--------|-----------|------------------|
| Páginas (client) | `app/admin/*`, `app/professor/*` | UI; chamam a API via `fetch` |
| Middleware | `middleware.ts` | Bloqueia rotas sem sessão válida |
| Rotas de API | `app/api/**/route.ts` | Validar entrada, checar permissão, chamar serviço |
| Serviços | `lib/services/*.ts` | Regras de negócio e acesso ao banco |
| Acesso ao banco | `lib/supabase/server.ts` | Cliente Supabase **somente no servidor** |
| Validação | `lib/validation/*.ts` | Schemas `zod` de entrada |
| Autenticação | `lib/auth/*.ts` | Hash de senha, sessão, checagem de papel |

Regra principal: **o navegador nunca fala direto com o banco.** Toda leitura e
escrita passa pela API, que confere quem é o usuário antes de agir.

---

## 2. Estrutura de pastas alvo

```
app/
  api/
    auth/
      login/route.ts        POST  - cria sessão
      logout/route.ts       POST  - encerra sessão
      me/route.ts           GET   - usuário da sessão atual
    admin/...               rotas exclusivas de admin
    professor/...           rotas de professor/monitor
lib/
  auth/
    password.ts             hashPassword / verifyPassword (bcrypt)
    session.ts              createSession / getSession / destroySession
    guard.ts                requireUser(roles?) para usar nas rotas
  services/
    users.ts
    students.ts
    turmas.ts
    attendance.ts
    ...
  validation/
    users.ts                schemas zod
    students.ts
    ...
  supabase/
    server.ts               cliente com SERVICE ROLE (server-only)
    types.ts                tipos das tabelas
middleware.ts               protege /admin, /professor e /api (exceto login)
```

---

## 3. Variáveis de ambiente

Crie `.env.local` (não versionado) e mantenha um `.env.example` versionado:

```env
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=chave_service_role   # NUNCA com prefixo NEXT_PUBLIC_

# Sessão
SESSION_SECRET=string_aleatoria_com_32+_caracteres
```

- Variáveis com `NEXT_PUBLIC_` vão para o navegador. **Chaves de banco nunca
  devem ter esse prefixo.**
- Hoje o projeto usa `NEXT_PUBLIC_SUPABASE_ANON_KEY` em `lib/supabase/client.ts`
  — isso deve ser substituído por `lib/supabase/server.ts`.

Exemplo de `lib/supabase/server.ts`:

```ts
import 'server-only'
import { createClient } from '@supabase/supabase-js'

export const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)
```

---

## 4. Autenticação e sessão

### Como deve funcionar

1. `POST /api/auth/login` recebe e-mail e senha, confere com `bcrypt.compare`.
2. Se válido, gera um token assinado (JWT com a lib `jose`) contendo
   `{ sub: user.id, role: user.role }` e grava em **cookie `httpOnly`,
   `secure`, `sameSite=lax`**, com expiração (ex.: 8h).
3. `middleware.ts` verifica o cookie em toda requisição para `/admin/*`,
   `/professor/*` e `/api/*` (exceto `/api/auth/login`).
4. Cada rota chama `requireUser([...papéis])` para garantir o papel correto.
5. O front usa `GET /api/auth/me` para saber quem está logado — **não usar
   `localStorage` para autorização.**

### Senhas

- Sempre `bcrypt` com custo 10–12, em um único lugar (`lib/auth/password.ts`).
- Nunca retornar `password_hash` em nenhuma resposta. Sempre listar colunas no
  `select(...)` em vez de `select('*')` na tabela `users`.
- Senha mínima: 8 caracteres.

> Alternativa: usar **Supabase Auth** (tabela `auth.users`). Resolve sessão e
> recuperação de senha, mas exige migrar os usuários. A abordagem acima mantém
> a tabela `users` atual e é a mudança menor.

### Exemplo de guard

```ts
// lib/auth/guard.ts
import { getSession } from './session'

export type Role = 'admin' | 'professor' | 'monitor'

export async function requireUser(roles?: Role[]) {
  const session = await getSession()
  if (!session) throw new HttpError(401, 'Não autenticado')
  if (roles && !roles.includes(session.role)) {
    throw new HttpError(403, 'Sem permissão')
  }
  return session // { userId, role }
}
```

---

## 5. Permissões por rota

Baseado no `PLANEJAMENTO.md`:

| Área | admin | professor | monitor |
|------|:-----:|:---------:|:-------:|
| `/api/admin/users` (cadastro de usuários) | ✅ | ❌ | ❌ |
| `/api/admin/students` (matrículas) | ✅ | ❌ | ❌ |
| Caderneta de chamadas (registrar presença) | ✅ | ✅ só suas turmas | ✅ só suas turmas |
| Controle de frequência / relatórios | ✅ | ❌ | ❌ |
| Consulta de cadastros (leitura) | ✅ | ✅ só suas turmas | ✅ só suas turmas |
| Consulta de turmas anteriores | ✅ | ❌ | ❌ |

Regras importantes:
- Professor só acessa turmas em que está em `turma_professors`.
- `marked_by` da presença vem **da sessão**, nunca do corpo da requisição.

---

## 6. Padrão de uma rota

Toda rota segue os mesmos passos: **autenticar → validar → executar → responder.**

```ts
// app/api/admin/students/route.ts
import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth/guard'
import { createStudentSchema } from '@/lib/validation/students'
import { createStudent, listStudents } from '@/lib/services/students'
import { handle } from '@/lib/http'

export const GET = handle(async () => {
  await requireUser(['admin'])
  return listStudents()
})

export const POST = handle(async (req: NextRequest) => {
  await requireUser(['admin'])
  const input = createStudentSchema.parse(await req.json())
  return createStudent(input)
})
```

`handle` (em `lib/http.ts`) converte o retorno em JSON e os erros em respostas
padronizadas:

| Situação | Status | Corpo |
|----------|--------|-------|
| Sucesso (leitura) | 200 | dados |
| Sucesso (criação) | 201 | registro criado |
| Entrada inválida (zod) | 400 | `{ error, fields }` |
| Sem sessão | 401 | `{ error }` |
| Sem permissão | 403 | `{ error }` |
| Não encontrado | 404 | `{ error }` |
| Conflito (ex.: e-mail duplicado, código `23505`) | 409 | `{ error }` |
| Erro inesperado | 500 | `{ error: 'Erro interno' }` — sem detalhes do banco |

### Convenções

- Nomes de rota em inglês e no plural (`/students`, `/turmas` é exceção já usada).
- `GET` lista / busca, `POST` cria, `PUT` atualiza, `DELETE` remove.
- Mensagens de erro ao usuário em português.
- Nada de `console.log` com dados de usuário; logar só o erro.
- Nunca repassar `error.message` do banco para o cliente.

---

## 7. Inventário atual das rotas

Situação das rotas existentes e o que fazer com cada uma.

| Rota | Métodos | Ação necessária |
|------|---------|-----------------|
| `/api/auth/login` | POST | Criar cookie de sessão; remover `debug` e `console.log` |
| `/api/create-admin` | POST | ✅ Removida (usar `supabase/seed.sql`) |
| `/api/test-db` | GET | ✅ Removida |
| `/api/admin/users` | GET POST | Guard admin; bcrypt em vez de Base64; não retornar `password_hash` |
| `/api/admin/users/[id]` | GET PUT DELETE | Guard admin; mesmo cuidado com senha |
| `/api/admin/professors` | GET POST | Unificar com `/users` (professor é um `role`) |
| `/api/admin/professors/[id]` | PUT DELETE | Unificar com `/users/[id]` |
| `/api/admin/students` | GET POST | Guard admin; validação zod |
| `/api/admin/students/[id]` | PUT DELETE | Guard admin |
| `/api/admin/students/import` | POST | Guard admin; limitar tamanho da lista |
| `/api/admin/courses` | GET POST | Guard admin |
| `/api/admin/courses/[id]` | GET PUT DELETE | Guard admin |
| `/api/admin/modules` | POST | Guard admin |
| `/api/admin/modules/[id]` | PUT DELETE | Guard admin |
| `/api/admin/classes` | GET POST | Guard admin |
| `/api/admin/classes/[id]` | GET PUT DELETE | Guard admin |
| `/api/admin/turmas` | GET POST | Guard admin |
| `/api/admin/turmas/[id]` | PUT DELETE | Guard admin |
| `/api/admin/attendance` | GET POST | Guard admin; `marked_by` da sessão |
| `/api/admin/reports/attendance` | GET | Guard admin |
| `/api/professor/turmas` | GET | Guard professor/monitor; usar id da sessão |
| `/api/professor/turmas/[id]/classes` | GET | Checar vínculo em `turma_professors` |
| `/api/professor/turmas/[id]/students` | GET | Checar vínculo em `turma_professors` |
| `/api/professor/attendance` | GET POST | Checar vínculo; `marked_by` da sessão |

---

## 8. Plano de migração (ordem sugerida)

> Status: passos 1 a 5 concluídos (sessão em cookie, `middleware.ts`,
> `requireUser` em todas as rotas, `marked_by`/`created_by` vindos da sessão,
> professor restrito às próprias turmas). Senhas de `/api/admin/users` já usam
> bcrypt. Passo 9 (RLS) pronto em `supabase/migrations/`, falta aplicar no Supabase.
> Senhas antigas em Base64: redefinir com `supabase/reset_password.sql`.
> Passo 7 concluído: validação `zod` (`lib/validation/schemas.ts`) e erros
> padronizados (`lib/http/errors.ts`) em todas as rotas. Pendente: passo 8.

1. **Remover** `/api/create-admin` e `/api/test-db`.
2. Criar `lib/supabase/server.ts`, `.env.example` e trocar os imports de
   `lib/supabase/client.ts` nas rotas.
3. Criar `lib/auth/*` (senha, sessão, guard) e `middleware.ts`.
4. Atualizar login/logout/me e trocar `localStorage` por `/api/auth/me` no front.
5. Aplicar `requireUser` em todas as rotas da tabela acima.
6. Corrigir senhas: bcrypt em todos os lugares; redefinir as senhas de usuários
   criados com Base64.
7. Adicionar validação `zod` e o helper `handle` rota a rota.
8. Extrair lógica para `lib/services/*` à medida que as rotas forem tocadas.
9. Ativar RLS no banco (ver `BANCO_DE_DADOS.md`).

---

## 9. Checklist para toda nova rota

- [ ] Chama `requireUser` com os papéis corretos
- [ ] Valida o corpo/query com `zod`
- [ ] Usa `select` com colunas explícitas (nunca expõe `password_hash`)
- [ ] Professor/monitor: confere vínculo com a turma
- [ ] Usa dados da sessão (id, role) em vez de dados enviados pelo cliente
- [ ] Erros padronizados, sem detalhes internos
- [ ] Sem `console.log` de dados pessoais

---

## 10. Proteção contra ataques

| Camada | Onde | Regra |
|--------|------|-------|
| Limite de login por e-mail | `lib/auth/rate-limit.ts` (tabela `login_attempts`) | 5 falhas em 15 min → 429 por 15 min |
| Limite de login por IP | idem | 20 falhas em 15 min → 429 por 15 min |
| Limite geral da API | `middleware.ts` (memória) | 120 requisições/min por IP → 429 |
| Bloqueio manual de IP | `middleware.ts`, variável `BLOCKED_IPS` | 403 em qualquer página ou rota |
| Validação de entrada | `lib/validation/schemas.ts` | Corpo, parâmetros e IDs validados; campos extras descartados |
| Erros sem detalhes internos | `lib/http/errors.ts` | Mensagem do banco nunca vai para o cliente |
| Login sem revelar e-mails | `app/api/auth/login` | Mesmo tempo de resposta para e-mail inexistente |

Observações:
- O limite de login fica no banco para valer entre instâncias do servidor.
  Aplique `supabase/migrations/20260928000000_login_attempts.sql`; sem a
  tabela o login funciona, mas **sem limite** (e loga um erro).
- O limite geral é por instância (memória). Para ataques de volume (DDoS),
  use o firewall da hospedagem — ex.: Vercel Firewall, ou Cloudflare na frente.
- O IP vem de `request.ip` / `x-forwarded-for`. Na Vercel isso é confiável;
  em outro host, confirme que um proxy define esse cabeçalho.
- Para bloquear um IP: adicione em `BLOCKED_IPS` e faça redeploy. Tentativas
  recentes ficam na tabela `login_attempts`:
  ```sql
  SELECT ip, count(*) AS falhas, max(created_at) AS ultima
  FROM login_attempts WHERE NOT success
  GROUP BY ip ORDER BY falhas DESC LIMIT 20;
  ```
