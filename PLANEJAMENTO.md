# Planejamento — Sistema de Controle de Curso

## O curso

**Curso:** Capacitação Destino · **Periodicidade:** anual · **Módulos:** 6 (quantidade de aulas definida pelo admin)

**Horários (domingos):** 07:30–09:30 · 10:30–12:30 · 18:00–20:00

## Perfis e permissões

| Funcionalidade | Admin | Professor | Monitor |
|----------------|:-----:|:---------:|:-------:|
| Cadastro de usuários | ✅ | ❌ | ❌ |
| Matrículas | ✅ | ❌ | ❌ |
| Caderneta de chamadas | ✅ | ✅ (só suas turmas) | ❌ |
| Controle de frequência | ✅ | ❌ | ❌ |
| Consulta de cadastros | ✅ | ⏳ planejado | ❌ |
| Consulta de turmas | ✅ | ❌ | ❌ |

> Monitor ainda não tem área própria: o login mostra uma mensagem e não entra.
> **Alunos não acessam o sistema** — os dados são registrados pela coordenação a partir da ficha de matrícula.

## Formulários

### Matrícula do aluno

| Campo | Obrigatório | Observação |
|-------|:-----------:|------------|
| Nome completo | Sim | |
| Data de nascimento | Sim | Idade calculada |
| Nome e telefone do responsável | Sim (menores) | Dado de terceiro — ver `docs/LGPD.md` |
| E-mail | Sim | |
| Nome e telefone do líder direto, geração | Sim | Dado de terceiro |
| Turma | Sim | 07h30, 10h30, 18h00 |
| Foto | ⚠️ Revisar | Avaliar necessidade (LGPD — minimização, menores) |

### Cadastro do professor/monitor

Nome, data de nascimento, e-mail, senha (mín. 8 caracteres), líder direto, geração, telefone do líder. Foto: mesma revisão acima.

## Status

### ✅ Feito

**Funcionalidades**
- Login com redirecionamento por perfil
- Admin: dashboard; CRUD de cursos, módulos, aulas, turmas (com professores), professores, usuários, alunos
- Importação de alunos via CSV (máx. 1000 por vez)
- Caderneta de chamadas (admin) e frequência por turma
- Relatório de presença por turma com exportação CSV
- Professor: chamada mobile-first (turmas → aulas → presença/falta)

**Segurança** (detalhes em `docs/SEGURANCA.md`)
- Sessão por cookie `httpOnly` assinado; `requireRole` em todas as rotas; middleware como camada extra
- Professor limitado às próprias turmas; autor da chamada vem da sessão
- Senhas com bcrypt (contas Base64 legadas migram no login)
- Supabase só pelo servidor (service role) + RLS bloqueando chaves públicas
- Rate limit em `/api/*` e bloqueio automático e progressivo de IP abusivo
- Erros genéricos para o cliente; CSV protegido contra injeção de fórmulas
- Next.js atualizado; dependência sem uso removida
- Sessão revogável: excluir usuário, trocar senha ou perfil derruba as sessões na hora
- Troca de senha pelo próprio usuário (admin e professor)
- Tela "LGPD e Segurança": auditoria, IPs bloqueados (desbloquear), anonimização de turma
- Cabeçalhos de segurança (CSP, HSTS, anti-iframe) e bloqueio de CSRF por Origin
- Turma + professores salvos em transação (migração 004)
- Testes automatizados (`npm test`): sessão, senhas, consentimento, entrada, middleware, revogação
- ESLint no formato compatível com Next 14 (`.eslintrc.json`)
- CI no GitHub Actions (`.github/workflows/ci.yml`): lint, testes e build a cada push/PR

**LGPD** (detalhes em `docs/LGPD.md`)
- Aviso de privacidade público em `/privacidade` (modelo — preencher dados da igreja)
- Consentimento na matrícula (menor → responsável obrigatório), status na consulta de cadastros, registro posterior pela ficha
- Trilha de auditoria (ver ficha, exportar, criar, alterar, excluir, chamadas, logins)
- Exportação dos dados do aluno em JSON (portabilidade)
- Anonimização por turma (retenção); limpeza da auditoria via `purge_audit_log`

**Documentação**
- `CLAUDE.md`, `docs/SEGURANCA.md`, `docs/LGPD.md`
- Skills: `nova-rota-api`, `revisao-seguranca`, `revisao-lgpd`

### 🔧 Pendente — operação (fazer antes de usar com dados reais)

- [x] Apagar `app/api/create-admin/` e `app/api/test-db/`
- [x] Configurar `SUPABASE_SERVICE_ROLE_KEY` e `SESSION_SECRET` no `.env.local`
- [x] Configurar as mesmas variáveis na Vercel
- [x] `npm install` (atualiza Next e lockfile)
- [x] Rodar migrações `001` a `004` em ordem (todas obrigatórias) — conferido em 27/09/2026: RLS ativo, acesso anônimo bloqueado, funções e colunas criadas
- [ ] Rodar migração `005_indices.sql` (ajuste de índices; não urgente)
- [x] `npm install`, `npm test`, `npm run lint` e `npm run build`
- [x] Apagar `eslint.config.mjs` (substituído por `.eslintrc.json`)
- [ ] Criar admin com `scripts/create-admin.mjs`; remover/trocar senha de `admin@capacitacao.com`
- [x] Avaliar se houve acesso indevido no período em que a API era pública — 27/09/2026: só 1 admin e 1 professor, ambos criados em jan/2026 pela equipe; nenhuma conta estranha. Leituras anônimas antigas não têm como ser verificadas (logs do Supabase têm retenção curta)
- [ ] Preencher `CONTROLLER` em `lib/lgpd/config.ts` e os trechos `[...]` do aviso de privacidade

## Roadmap

### Fase 1 — LGPD (decisões da igreja)
- [ ] Definir prazos de retenção (alunos e auditoria) e publicar no aviso
- [ ] Regularizar consentimento dos alunos já cadastrados (status "Pendente")
- [ ] Link/QR code do aviso na ficha de matrícula em papel
- [ ] Decidir sobre a foto
- [ ] Agendar `purge_audit_log` (pg_cron no Supabase) conforme o prazo definido

### Fase 2 — Robustez
- [ ] Validação de entrada com zod em todas as rotas
- [ ] Redefinição de senha por e-mail (com rate limit) — hoje o admin redefine
- [ ] Testes de integração das rotas com banco de teste (Supabase local)
- [ ] CSP com nonce (remover `'unsafe-inline'`)

### Fase 3 — Funcionalidades
- [ ] Consulta de cadastros para professor (só suas turmas, campos mínimos)
- [ ] Histórico de chamadas do professor
- [ ] Área do monitor
- [ ] Transferência de aluno entre turmas
- [ ] Relatórios por aluno e geral do curso; exportação Excel/PDF
- [ ] Paginação nas listas grandes

### Futuro
- Página do aluno (ver a própria frequência)
- Notificações (e-mail/SMS) — exige revisão LGPD
- Multi-igreja (multi-tenancy)

## Modelo de dados

```
Course (1) ─ (*) Module (1) ─ (*) Class
Course (1) ─ (*) Turma (*) ─ (*) Professor [turma_professors]
Turma  (1) ─ (*) Student
Student (1) ─ (*) Attendance (*) ─ (1) Class
User/Professor (1) ─ (*) Attendance [marked_by]
```

Segurança: `rate_limits`, `ip_blocks` (migração 002). LGPD: `audit_log`, colunas de consentimento/anonimização em `students`, `users.session_version` (migração 003).
