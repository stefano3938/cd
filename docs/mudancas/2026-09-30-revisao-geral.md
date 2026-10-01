# 30/09/2026 — Revisão geral do projeto

Escopo: todas as rotas de API, autenticação, banco (schema e migrações 001–005), telas do admin e do professor, dependências e configuração. Nenhuma alteração de código foi feita nesta revisão; os itens abaixo são para decidir e priorizar.

Legenda: 🔴 corrigir antes de usar com volume real · 🟠 importante · 🟡 melhoria · ✅ está bom

---

## 1. Problemas que causam perda ou erro de dados

### 🔴 1.1 Excluir um professor apaga todas as chamadas que ele fez
`lib/supabase/schema.sql:95`: `attendance.marked_by ... REFERENCES users(id) ON DELETE CASCADE`.
Excluir um professor (ou um admin que fez chamadas) apaga do banco **todas as presenças e faltas que ele registrou**, de todas as turmas. A tela só pergunta "Excluir professor?".
**Correção:** migração `006` trocando para `ON DELETE SET NULL` (e permitindo `marked_by` nulo). Opcional: impedir a exclusão de usuário com chamadas e oferecer "desativar".

### 🔴 1.2 Exclusões em cascata sem aviso nem auditoria
- Excluir uma **turma** apaga todos os alunos dela e todas as presenças (`students.turma_id ... ON DELETE CASCADE`). A tela pergunta só "Excluir turma?".
- Excluir um **curso** apaga módulos, aulas, turmas, alunos e presenças. Excluir **módulo/aula** apaga as presenças daquela aula.
- `DELETE /api/admin/turmas/[id]` e `courses/[id]` **não chamam `audit(...)`**, embora apaguem dados pessoais (regra do CLAUDE.md).
**Correção:** bloquear a exclusão quando houver alunos/presenças (`ON DELETE RESTRICT` ou checagem na rota, com mensagem "a turma tem N alunos"), deixar a confirmação explícita sobre o que será apagado e auditar.

### 🔴 1.3 Frequência e relatório ficam errados quando passar de 1000 registros
O Supabase devolve no máximo **1000 linhas** por consulta (padrão "Max rows").
- `app/admin/frequencia/page.tsx:61` chama `GET /api/admin/attendance` **sem filtro** (todas as presenças do sistema) e filtra no navegador. Com 3 turmas × 50 alunos, isso estoura em ~7 aulas, e a partir daí faltam presenças na tela, sem nenhum erro.
- `app/api/admin/reports/attendance/route.ts:53`: presenças da turma = alunos × aulas (50 × 24 = 1200), então o percentual sai errado.
- `GET /api/admin/students` sem filtro também trunca acima de 1000 alunos.
**Correção:** filtrar no servidor (por turma/aula), paginar com `.range()` ou calcular os totais numa função SQL (`count`/`group by`).

### 🟠 1.4 Datas aparecem um dia antes
`new Date('2026-10-05')` é lido como meia-noite **UTC**, que no Brasil (UTC−3) é 04/10 às 21h. Então `toLocaleDateString('pt-BR')` mostra **04/10**.
Afeta: data da aula (`professor/chamada:295`, `admin/chamadas:194`, `admin/cursos:324`, `admin/frequencia:251`) e **data de nascimento** (`consulta-cadastros:229`). `calcularIdade` (`lib/lgpd/config.ts:18`) também erra no dia do aniversário no navegador; no dia em que faz 18 anos, a pessoa ainda aparece como menor.
**Correção:** um helper `formatarData('AAAA-MM-DD')` que monta a data sem fuso (`split('-')`), usado em todos os pontos.

### 🟠 1.5 Não dá para corrigir os dados de um aluno matriculado
A tela **Matrículas** só cria e exclui. A edição existe só em `/admin/alunos` (fora do menu) e o `PUT /api/admin/students/[id]` só aceita nome, e-mail, telefone e turma. Responsável, data de nascimento e líder **não podem ser corrigidos**. Hoje a única saída é excluir e recadastrar, o que **apaga as presenças** (item 1.2).
Isso também é um direito do titular na LGPD (art. 18, III: correção).
**Correção:** edição completa na tela de matrícula, com lista de campos permitidos e auditoria (`campos` alterados).

---

## 2. Interface

### 🔴 2.1 Telas que existem mas não estão no menu
O menu tem: Dashboard, Cadastro de Usuários, Matrículas, Caderneta, Frequência, Consulta de Cadastros, Consulta de Turmas.
**Fora do menu** (só acessíveis digitando o endereço):
- `/admin/cursos`: **criar curso, módulos e aulas** (sem isso não há aula para fazer chamada)
- `/admin/turmas`: **criar turma e vincular professores** (sem isso o professor não vê nada)
- `/admin/relatorios`: relatório por turma e exportação CSV
- `/admin/alunos`: importação CSV e edição de aluno
- `/admin/professores`: duplica parte de "Cadastro de Usuários"

**Sugestão:** menu em grupos. *Cadastros*: Usuários, Matrículas. *Curso*: Cursos e aulas, Turmas. *Chamada*: Caderneta, Frequência, Relatórios. *Consultas*: Cadastros, Turmas. Juntar Alunos em Matrículas (importação e edição) e remover Professores, que fica coberto por Usuários.

### 🟠 2.2 Professor (celular)
- Não mostra quais aulas **já têm chamada feita**. O professor não sabe o que falta.
- Falta o botão **"Todos presentes"**: em turma grande, marcar um por um é lento.
- Horário aparece como `07:30:00 - 09:30:00`; o ideal é `07:30–09:30`.
- O botão "voltar" do celular (Android) sai do sistema em vez de voltar para a lista de aulas, porque as telas não mudam a URL.
- Se a sessão expirar durante a chamada, as marcações se perdem ao salvar (aparece "Não autenticado"). Sugestão: avisar e manter as marcações.

### 🟡 2.3 Admin
- Sem layout para celular (menu fixo de 240 px). Ok se o admin usa só desktop, como diz o CLAUDE.md.
- Os erros usam `alert()`. Uma mensagem na própria tela seria mais amigável.
- Caderneta (`admin/chamadas`) lista **todas as aulas de todos os cursos**, não só as do curso da turma escolhida.
- Os cartões de turma/aula são `div` com clique, sem acesso por teclado (acessibilidade).
- 4 avisos de lint de `useEffect` (alunos, chamadas, frequência). Não quebram nada.

---

## 3. Segurança

### ✅ O que está bom
- `requireRole` em **todas** as rotas, com o middleware como segunda camada; sessão por cookie HttpOnly com HMAC e revogação por `session_version`.
- Professor limitado às próprias turmas (`canAccessTurma`, `classBelongsToTurma`, `studentsBelongToTurma`); `marked_by` sempre vem da sessão.
- Nada de `select('*')` em `users`; lista de campos permitidos nas edições; `serverError` não vaza erro do banco.
- bcrypt custo 12; rate limit por IP e por conta; bloqueio progressivo de IP; anti-CSRF por Origin; CSP, HSTS e anti-iframe.
- RLS ativo em todas as tabelas, `REVOKE` para `anon` e `authenticated`, funções SQL só para `service_role`.
- CSV protegido contra injeção de fórmula; `.env.local` fora do git; CI com lint, testes e build.

### 🟠 3.1 Next.js 14 com vulnerabilidades conhecidas (`npm audit`)
A linha 14 não recebe mais correções; elas saem na 15.5.x. As críticas (RCE no Image Optimizer, servidor Windows, Server Actions) **não se aplicam** aqui: o projeto não usa `next/image` nem Server Actions e roda na Vercel (Linux). Ainda se aplicam alguns DoS e cache poisoning do App Router.
**Correção:** migrar para Next 15.5.x numa tarefa separada. O projeto já usa `params: Promise`, que facilita; a principal mudança é `cookies()` passar a ser assíncrono em `lib/auth/guard.ts`.
`npm audit fix` (sem `--force`) resolve `ws` e `nanoid` sem quebrar nada.

### 🟡 3.2 Pontos menores
- **Logout não invalida o token no servidor**: só apaga o cookie. Se o cookie tiver sido copiado, ele vale até expirar (8 h). Opcional: logout chama `revokeSessions` (isso também derruba as sessões em outros aparelhos).
- `revokeSessions` lê e depois grava (`lib/auth/guard.ts:54`). Duas trocas simultâneas podem gerar a mesma versão. Melhor um `UPDATE ... SET session_version = session_version + 1` numa função SQL.
- `PUT /api/admin/turmas/[id]` faz duas escritas separadas (turma e professores); a regra do projeto pede uma função SQL (transação).
- Várias rotas não validam tipos (ex.: `nome` vazio no PUT de professor, `email` numérico na importação, que vira erro 500). Já está no roadmap: validação com zod.
- CSP com `'unsafe-inline'` (já no roadmap: nonce).

---

## 4. LGPD

- 🟠 **Aviso de privacidade público com campos entre colchetes** (`[NOME DA IGREJA]`, `[CNPJ]`, `[PRAZO]`...). Preencher `lib/lgpd/config.ts` e `app/privacidade/page.tsx`. A região agora é conhecida: São Paulo, Brasil. Incrementar `PRIVACY_POLICY_VERSION`.
- 🟠 Correção de dados do titular: ver 1.5.
- 🟡 `consulta-turmas` e o `GET /api/admin/students` trazem a ficha completa de todos os alunos só para listar e contar (minimização). Melhor selecionar só as colunas usadas.
- 🟡 Relatório de presença por turma (nomes + frequência) e a exportação CSV não são auditados.
- 🟡 Editar um aluno anonimizado permite gravar um nome nele de novo. Bloquear, como já é feito no consentimento.

---

## 5. Implementações sugeridas (por valor)

1. **Correções de dados (itens 1.1 a 1.5)**: uma migração `006` e ajustes nas rotas e telas.
2. **Menu completo (2.1)**: rápido e destrava o uso real (criar curso, aulas e turmas).
3. **Professor**: aulas com chamada feita, "todos presentes", horário formatado.
4. **Migração para Next 15.5** e `npm audit fix`.
5. Roadmap já previsto: histórico de chamadas do professor, transferência de aluno entre turmas (hoje só por exclusão, que apaga presenças), paginação, zod, relatório por aluno.
