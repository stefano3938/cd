---
name: revisao-seguranca
description: Checklist de revisão de segurança específico deste projeto (auth por cookie de sessão, Supabase com service role, rate limit, RLS). Use ao revisar um diff, antes de commit/PR, ou quando o usuário pedir "revisar segurança".
---

# Revisão de segurança

Revise as mudanças (ex.: `git diff main...HEAD`) contra os itens abaixo. Reporte cada problema com arquivo:linha, cenário de ataque concreto e correção sugerida. Não reporte estilo.

## Autenticação e autorização
- Todo handler em `app/api/**/route.ts` (exceto `app/api/auth/*`) começa com `requireRole(...)`.
- Rotas de professor validam posse da turma (`canAccessTurma`) e pertinência de aula/aluno à turma.
- Nenhum ID de ator vindo do cliente (`marked_by`, `created_by`, `professor_id`, `user_id`) é usado para gravar ou filtrar — deve ser `session.sub`.
- Decisões de acesso no front (`role` no cliente) nunca substituem checagem no servidor. Nada de `localStorage`/`sessionStorage`: dados do usuário vêm de `GET /api/auth/session`.
- Alterações em `middleware.ts` não removem `/api/:path*` do `matcher`.
- Troca de senha/perfil chama `revokeSessions`; `getSession` continua conferindo `session_version` no banco.
- Operações sobre dados pessoais registram `audit(...)` (sem valores pessoais em `details`).
- Nenhuma rota pública nova (debug, seed, "create-admin", "test").

## Dados
- Tabela `users`: sem `select('*')`, sem `password_hash` em respostas ou logs.
- Sem `.update(body)` / `.insert(body)` com objeto vindo direto do cliente (mass assignment).
- Respostas de erro não expõem `error.message`/`details` do Postgres (usar `serverError`).
- `lib/supabase/client.ts` não é importado (direta ou indiretamente) em arquivo `'use client'`.
- Nenhuma variável secreta com prefixo `NEXT_PUBLIC_`.

## Senhas e sessão
- Senhas só via `hashPassword`/`verifyPassword` (bcrypt). Mínimo `MIN_PASSWORD_LENGTH`.
- Cookie `session` continua `httpOnly`, `sameSite: 'lax'`, `secure` em produção.
- `SESSION_SECRET` nunca aparece no código nem em logs.

## Abuso
- Endpoints novos de autenticação/recuperação de senha têm limite próprio (`hitLimit`) e registram falhas (`registerStrike`).
- Importações/listas aceitam tamanho máximo (ex.: `MAX_IMPORT`).
- Exportações CSV escapam células que começam com `= + - @`.

## Banco
- Tabela nova → migração em `lib/supabase/migrations/NNN_*.sql` com `ENABLE ROW LEVEL SECURITY` e `REVOKE ALL ... FROM anon, authenticated`.
- Função SQL nova → `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated` e `GRANT ... TO service_role`.

## Dependências
- `next` permanece em versão sem CVEs conhecidas (≥ 15.5.27; a linha 14 não recebe mais correções). Rodar `npm audit --omit=dev`.
- Dependência nova é realmente usada e de fonte confiável.
