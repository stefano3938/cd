# 30/09/2026 — Login mais rápido, dashboard e retirada da tela de LGPD

## Pedido

1. Tirar a tela "LGPD e Segurança". A proteção dos dados conforme a LGPD continua, só sem a tela.
2. O login está demorado.
3. Ao clicar no menu do admin, a tela inteira recarrega como se fosse outra página. O desejado é que o conteúdo troque na mesma tela.

## Feito

### Login mais rápido — `app/api/auth/login/route.ts`

Cada ida ao Supabase custa cerca de 150 ms, e o login fazia tudo em fila. Agora:

- a checagem do limite de tentativas e a busca do usuário rodam em paralelo;
- depois do login (ou da falha), zerar o limite e gravar a auditoria também rodam em paralelo.

A segurança não mudou: a senha só é aceita se o limite não tiver estourado, e o bcrypt continua com custo 12.

| | Antes | Depois |
|---|---|---|
| Login (servidor de desenvolvimento, medido com curl) | ~1,9 s | ~0,78 s |

### Dashboard — `app/api/admin/stats/route.ts` (nova) e `app/admin/dashboard/page.tsx`

O dashboard fazia 4 chamadas e baixava a lista completa de cursos, turmas, professores e **todos os alunos com todos os dados** só para contar quantos eram. Agora faz 1 chamada a `GET /api/admin/stats`, que devolve só os números (`count`, sem linhas).

Ganhos: menos tempo, menos consumo do limite de requisições e nenhum dado pessoal trafegando sem necessidade (minimização, LGPD).

### Tela "LGPD e Segurança" removida

A pedido do usuário: tirar a tela e manter as funções de bloqueio e segurança.

- Apagado: `app/admin/lgpd/page.tsx`.
- Removido o item do menu em `components/admin/AdminLayout.tsx`.
- Documentação ajustada (`CLAUDE.md`, `README.md`, `PLANEJAMENTO.md`, `docs/SEGURANCA.md`, `docs/LGPD.md`): onde se dizia "ver na tela", agora diz como consultar pelo SQL Editor do Supabase.

**Mantido (continua funcionando sem a tela):**

- rate limit e **bloqueio automático e progressivo de IP** (`middleware.ts`, `lib/security/rate-limit.ts`). O bloqueio expira sozinho. Desbloqueio manual pelo SQL Editor (ver `docs/SEGURANCA.md`);
- **auditoria** gravada em `audit_log` em toda criação, alteração, exclusão, exportação e login;
- **anonimização** por turma: `SELECT anonimizar_turma('<id da turma>');`;
- as rotas de API `app/api/admin/audit`, `ip-blocks` e `turmas/[id]/anonymize` continuam, protegidas por `requireRole('admin')`, para uso futuro;
- senhas com bcrypt, sessão revogável, RLS, CSRF, cabeçalhos de segurança e consentimento na matrícula.

### Menu fixo: o conteúdo troca na mesma tela

Causa: cada página em `app/admin/*/page.tsx` envolvia seu conteúdo em `<AdminLayout>`. A cada clique o layout era desmontado e montado de novo: a tela ficava em branco, a sessão era consultada outra vez e o menu era redesenhado.

Correção:

1. Novo `app/admin/layout.tsx` envolve `{children}` com `<AdminLayout>`. O menu e o cabeçalho são montados uma única vez para toda a área `/admin`.
2. As 12 páginas `app/admin/*/page.tsx` não importam mais o `AdminLayout` (o wrapper virou `<>…</>`).
3. `components/admin/AdminLayout.tsx` mostra o conteúdo sem esperar a consulta da sessão; só o nome do usuário aguarda. A segurança é mantida: o middleware barra quem não tem sessão de admin, e cada rota de API valida a sessão com `requireRole`.

A URL continua mudando a cada item do menu, então o botão "voltar" do navegador e os links diretos seguem funcionando.

Verificado: `npm run lint` (só os 4 avisos antigos de `useEffect`), `npm test` (42 passaram) e `npm run build` (ok).

## Como testar

- [ ] Login com senha certa e com senha errada; conferir o tempo de resposta
- [ ] Dashboard mostra os totais corretos de cursos, turmas, professores e alunos
- [ ] O menu não mostra mais "LGPD e Segurança"
- [ ] Clicar nos itens do menu: o menu e o cabeçalho ficam parados e só o conteúdo à direita troca
- [ ] Botão "voltar" do navegador volta para a tela anterior
- [ ] Sair e tentar abrir `/admin/dashboard` direto: deve ir para o login
- [ ] Errar a senha várias vezes ainda bloqueia (resposta 429 "Muitas tentativas")
- [ ] `npm test` e `npm run build`
