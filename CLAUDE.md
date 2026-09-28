# CLAUDE.md

Sistema de controle do curso "Capacitação Destino" da igreja: cadastro de turmas, professores e alunos, e chamada (presença). Admins (coordenação) usam no desktop; professores fazem a chamada pelo celular.

**Alunos não acessam o sistema.** Só admin e professor fazem login. Consentimento é coletado fora do sistema (ficha/papel) e registrado pelo admin; pedidos de titulares (cópia, correção, exclusão) chegam à coordenação, que os atende pelo painel.

## Stack

- Next.js 14 (App Router) + TypeScript + React 18
- Supabase (Postgres) acessado **somente pelo servidor** com a service role key
- CSS Modules em `assets/css/` (Tailwind só para utilitários)
- Deploy: Vercel (serverless — nada de estado em memória entre requisições)

## Comandos

```bash
npm run dev      # desenvolvimento
npm run build    # build de produção (roda type-check)
npm run lint     # next lint (.eslintrc.json)
npm test         # vitest — tests/*.test.ts (não precisa de .env nem banco)
node --env-file=.env.local scripts/create-admin.mjs   # cria/redefine admin
```

Variáveis obrigatórias: ver `.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`).

## Estrutura

- `app/api/admin/*` — rotas só para admin
- `app/api/professor/*` — rotas de professor (admin também acessa)
- `app/api/auth/*` — login/logout (públicas, com rate limit), `session` e `password` (exigem login)
- `app/privacidade` — aviso de privacidade público (modelo; dados da igreja em `lib/lgpd/config.ts`)
- `app/admin/lgpd` — auditoria, IPs bloqueados, anonimização de turma
- `lib/auth/` — sessão (cookie HMAC + `session_version` no banco), `requireRole`, `canAccessTurma`, `revokeSessions`, senhas (bcrypt)
- `lib/security/rate-limit.ts` — rate limit e bloqueio de IP (funções SQL da migração 002)
- `lib/security/audit.ts` — `audit(request, session, {...})` grava em `audit_log` (migração 003)
- `lib/lgpd/` — configuração do controlador, versão do aviso, regras de consentimento (menor → responsável)
- `lib/api/` — helpers de erro (`serverError`) e de chamada (`parseAttendance`, validações de turma)
- `lib/supabase/schema.sql` + `lib/supabase/migrations/*.sql` — rodar em ordem no SQL Editor
- `middleware.ts` — bloqueio de CSRF por Origin, rate limit em `/api/*` + checagem de sessão/perfil (defesa em profundidade)
- `next.config.mjs` — cabeçalhos de segurança (CSP, HSTS, X-Frame-Options...) e `no-store` na API
- `tests/` — testes de sessão, senhas, consentimento, validação de entrada, middleware e `requireRole` (Supabase e cookies mockados)
- `docs/SEGURANCA.md`, `docs/LGPD.md` — decisões de segurança e privacidade
- `PLANEJAMENTO.md` — roadmap

## Regras obrigatórias

### Segurança
- **Toda rota de API nova começa com `requireRole`** — o middleware não basta (houve CVE de bypass de middleware no Next 14):
  ```ts
  const session = await requireRole('admin')
  if (session instanceof NextResponse) return session
  ```
- Rotas de professor que recebem `turma_id` devem chamar `canAccessTurma(session, turma_id)`; se receberem `class_id`/`student_id`, validar que pertencem à turma (`classBelongsToTurma`, `studentsBelongToTurma`).
- **Nunca confiar em IDs de usuário vindos do cliente** (`marked_by`, `created_by`, `professor_id`): usar `session.sub`.
- **Nunca** `select('*')` na tabela `users` nem devolver `password_hash`. Usar `USER_PUBLIC_COLUMNS` (`lib/auth/users.ts`).
- **Nunca** `.update(body)` com o corpo inteiro: sempre lista de campos permitidos.
- Senhas: `hashPassword` / `validatePassword` de `lib/auth/password.ts`. Nunca Base64, nunca log de senha.
- Erros de banco: `return serverError('contexto', error)` — nunca devolver `error.message` ao cliente.
- `lib/supabase/client.ts` usa a service role key: **nunca importar em componente `'use client'`**.
- **Nada em `localStorage`/`sessionStorage`.** O único estado de login no navegador é o cookie `session` (HttpOnly). Telas protegidas chamam `GET /api/auth/session` ao abrir e usam o `nome`/`role` devolvidos para exibir na UI.
- Mudou senha ou perfil de um usuário → `revokeSessions(id)` (derruba sessões abertas).
- Não criar rotas de debug/seed públicas (ex.: `create-admin`, `test-db`).
- Operação com várias escritas dependentes → função SQL (transação) chamada via `supabase.rpc`, nunca várias chamadas soltas.
- Mudou regra de acesso, sessão, senha ou consentimento → ajustar/adicionar teste em `tests/` e rodar `npm test`.

### LGPD
- O sistema trata dados de **menores** (há responsável) e dados que podem revelar **convicção religiosa** (dado sensível, art. 11). Ver `docs/LGPD.md`.
- Coletar e devolver só o necessário (minimização): endpoints de professor retornam apenas `id, nome` dos alunos.
- Não logar dados pessoais (nome, e-mail, telefone, datas de nascimento) em `console.*`.
- Rota que cria, altera, exclui, exporta ou exibe ficha de dado pessoal → chamar `audit(...)`. Em `details` só IDs, nomes de campos e contagens — nunca os valores.
- Mudou o texto do aviso de privacidade → incrementar `PRIVACY_POLICY_VERSION`.
- Campo novo com dado pessoal → atualizar o inventário em `docs/LGPD.md`.

## Skills do projeto

- `nova-rota-api` — padrão para criar rota de API segura
- `revisao-seguranca` — checklist de segurança para revisar mudanças
- `revisao-lgpd` — checklist de privacidade para mudanças que tocam dados pessoais

## Idioma

Código, comentários, mensagens de erro e UI em **português**.
