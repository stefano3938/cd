# Segurança

Como o sistema se protege, o que configurar e como agir em incidentes.

## Arquitetura

```
Navegador ──► middleware.ts ──► app/api/**/route.ts ──► Supabase (service role)
               │ rate limit /api/*        │ requireRole + checagens     │ RLS ativo, sem policies:
               │ bloqueio de IP           │ de posse da turma           │ chaves públicas não acessam nada
               │ sessão/perfil (páginas)  │ campos permitidos
```

O navegador **nunca** fala direto com o Supabase. Toda leitura/escrita passa pelas rotas `/api`.

## Camadas

| Camada | Onde | O que faz |
|--------|------|-----------|
| Sessão | `lib/auth/session.ts` | Cookie `session` `httpOnly`, `sameSite=lax`, `secure` em produção, assinado com HMAC-SHA256 (`SESSION_SECRET`), expira em 8h |
| Revogação | `lib/auth/guard.ts` | A cada requisição, `getSession` confere no banco se o usuário existe, o perfil atual e `users.session_version`. Excluir usuário, trocar senha ou perfil derruba as sessões na hora |
| Autorização | `lib/auth/guard.ts` | `requireRole` em todo handler; `canAccessTurma` limita professor às turmas dele |
| Auditoria | `lib/security/audit.ts` | Ações sobre dados pessoais e acessos gravadas em `audit_log` |
| Middleware | `middleware.ts` | Rate limit + bloqueio de IP em `/api/*`; redireciona páginas sem sessão. É defesa extra — as rotas se protegem sozinhas |
| Senhas | `lib/auth/password.ts` | bcrypt (custo 12), mínimo 8 caracteres; contas legadas em Base64 migram no login |
| Banco | `migrations/001_enable_rls.sql` | RLS ativo e `REVOKE` para `anon`/`authenticated` |
| Erros | `lib/api/errors.ts` | Cliente recebe mensagem genérica; detalhe só no log do servidor |
| CSRF | `middleware.ts` + `lib/security/origin.ts` | Cookie `sameSite=lax` + recusa POST/PUT/PATCH/DELETE com `Origin` de outro host |
| Cabeçalhos | `next.config.mjs` | CSP, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; `Cache-Control: no-store` em `/api` |
| Transações | `migrations/004_turma_transacional.sql` | Criar turma e trocar professores numa transação; só aceita usuários com perfil professor |
| Testes | `tests/` (`npm test`) | Sessão (adulteração, expiração, segredo), senhas, consentimento, entrada, CSRF, middleware (401/403/429/redirect), revogação no `requireRole` |

## Rate limit e bloqueio de IP

Contadores no Postgres (`migrations/002_rate_limit_ip_block.sql`), porque na Vercel cada instância tem memória própria.

| Regra | Limite | Onde |
|-------|--------|------|
| Qualquer rota `/api/*` | 120 req/min por IP | middleware (`LIMITS.api`) |
| `POST /api/auth/login` | 10 req/min por IP | middleware (`LIMITS.login`) |
| Login por IP + e-mail | 5 tentativas / 15 min (zera no sucesso) | rota de login (`LIMITS.loginAccount`) |
| Strikes → bloqueio | 10 strikes / 15 min bloqueiam o IP | `ip_register_strike` |

**Strike** = login com falha ou estouro de rate limit. O bloqueio começa em 15 min e **dobra a cada reincidência** (máx. 24h). IP bloqueado recebe `429` com `Retry-After` em todas as rotas `/api`.

Os limites ficam em `LIMITS` (`lib/security/rate-limit.ts`).

**Fail-open:** se o Supabase estiver fora do ar, o rate limit libera a requisição (e registra no log). A autenticação continua valendo.

**IP do cliente:** vem de `request.ip`/`x-forwarded-for`, confiáveis na Vercel. Em outro provedor, confirme que o proxy sobrescreve esse header, senão o IP pode ser forjado.

### Operação

Pelo SQL Editor do Supabase (não há tela no painel). O bloqueio expira sozinho; desbloquear mantém o histórico, então a escalada continua valendo:

```sql
-- IPs bloqueados agora
SELECT ip, reason, block_count, blocked_until FROM ip_blocks WHERE blocked_until > NOW();

-- Desbloquear um IP
DELETE FROM ip_blocks WHERE ip = '203.0.113.10';

-- Zerar todos os contadores (ex.: após um falso positivo em massa)
TRUNCATE rate_limits;
```

## Configuração obrigatória

| Variável | Observação |
|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Pública |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secreta.** Nunca com prefixo `NEXT_PUBLIC_`. Rotacione se vazar |
| `SESSION_SECRET` | **Secreta**, ≥ 32 caracteres aleatórios. Trocar invalida todas as sessões |

Migrações a rodar, em ordem: `schema.sql` → `001_enable_rls.sql` → `002_rate_limit_ip_block.sql` → `003_lgpd_auditoria.sql` → `004_turma_transacional.sql`.
**A 003 é obrigatória**: sem a coluna `users.session_version`, todas as rotas autenticadas respondem 401.

## Senhas

- Usuário troca a própria senha em **Alterar senha** (admin) / **Senha** (professor): exige a senha atual, tem limite de tentativas e erro conta como strike de IP. Ao trocar, as outras sessões caem.
- Admin redefine a senha de outro usuário em Cadastro de Usuários/Professores; as sessões desse usuário caem.

## Limitações conhecidas

- O middleware verifica só a assinatura do cookie (edge, sem banco). Revogação é aplicada nas rotas de API e nas telas via `GET /api/auth/session`.
- Sem MFA.
- Sem validação de schema (zod) nas entradas; validação é manual por rota.
- CSP usa `'unsafe-inline'` para scripts (exigência do App Router sem nonce). Para endurecer: CSP com nonce gerado no middleware.
- Rotas de API sem testes de integração com banco real (os testes atuais mockam o Supabase).

## Resposta a incidentes

1. **Conter:** rotacionar `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API) e `SESSION_SECRET` (Vercel → Env Vars → redeploy — derruba todas as sessões). Para um usuário só: trocar a senha dele (derruba as sessões). Bloquear IPs suspeitos em `ip_blocks`.
2. **Investigar:** tabela `audit_log` no Supabase (quem viu/exportou/alterou o quê), logs da Vercel e do Supabase. Identificar dados e titulares afetados.
3. **Comunicar:** se houver risco ou dano relevante aos titulares, o controlador (igreja) comunica a ANPD e os titulares em prazo razoável (LGPD art. 48; a Resolução CD/ANPD nº 15/2024 fixa 3 dias úteis). Ver `docs/LGPD.md`.
4. **Corrigir e registrar:** corrigir a causa, registrar o incidente (data, dados, titulares, medidas).

## Histórico

- Antes da correção de segurança, todas as rotas `/api` eram públicas (sem autenticação), existiam rotas `create-admin`/`test-db` e um admin padrão com senha `admin`. **Se o sistema esteve publicado com dados reais nesse período, trate como possível incidente** (passo 2 acima).
