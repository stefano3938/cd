# 30/09/2026 — Correção dos itens 🟠 da revisão geral

Referência: `2026-09-30-revisao-geral.md`, itens 1.4, 1.5 e 3.1.

## 1. Datas um dia antes (item 1.4)

**Causa:** `new Date('2026-10-05')` é lido como meia-noite UTC, que no Brasil (UTC−3) ainda é 04/10.

- `lib/datas.ts` (novo): `parseDataLocal` e `formatarData`, que montam a data no fuso local.
- Usado nas datas de aula (chamada do professor, caderneta, cursos, frequência) e na data de nascimento (consulta de cadastros).
- `calcularIdade` (`lib/lgpd/config.ts`) usa `parseDataLocal`: no dia em que o aluno faz 18 anos, ele já é tratado como maior.
- Datas com hora (consentimento, anonimização) não mudaram, porque nelas o fuso já estava correto.
- Teste: `tests/datas.test.ts`, que roda no fuso de São Paulo.

## 2. Correção dos dados do aluno (item 1.5, LGPD art. 18, III)

**API:** `PUT /api/admin/students/[id]`
- Aceita todos os campos do cadastro: nome, e-mail, telefone, turma, nascimento, responsável (nome e telefone), líder (nome, telefone e geração). Antes aceitava só nome, e-mail, telefone e turma.
- Altera só os campos enviados (lista em `STUDENT_EDITABLE_FIELDS`, `lib/lgpd/consent.ts`); valida tipos, nome e turma obrigatórios e formato da data.
- Aluno anonimizado não pode ser editado.
- **Consentimento:** se a correção o invalida, ele volta a "pendente" e a tela avisa. Isso acontece quando o aluno passa a ser menor e quem tinha consentido era ele próprio, ou quando o responsável que consentiu é apagado. Regra em `consentNeedsRenewal`, com testes em `tests/consent.test.ts`.
- A auditoria registra os nomes dos campos alterados (nunca os valores).

**Tela:** Matrículas ganhou o botão **Editar**, que abre o mesmo formulário preenchido ("Corrigir Dados do Aluno"). O consentimento de aluno já matriculado continua sendo registrado em Consulta de Cadastros.

Com isso, corrigir um dado não exige mais excluir e recadastrar, o que apagava as presenças.

## 3. Next.js 14 → 15.5.27 (item 3.1)

- `next` 14.2.35 → **15.5.27**, `react`/`react-dom` 18 → **19**, `eslint-config-next` 15.5.27, `@types/react*` 19.
- Ajustes exigidos pela nova versão:
  - `lib/auth/guard.ts`: `cookies()` agora é assíncrono (`await cookies()`).
  - `lib/security/rate-limit.ts`: `request.ip` foi removido. O IP vem de `x-real-ip`/`x-forwarded-for`, que a Vercel define e o cliente não consegue forjar.
  - `next.config.mjs`: `outputFileTracingRoot` fixo na pasta do projeto, porque existe um `package-lock.json` solto em `C:\Users\stefano` que confundia o build.
- `npm audit fix` (sem `--force`): corrigiu `ws` e `nanoid`.
- **`npm audit` agora:** o Next 15.5.27 não tem falhas próprias. Restam o `postcss` embutido no Next (só processa o CSS do próprio projeto durante o build) e o `vitest` (só testes). Nenhum dos dois roda no site publicado.
- Documentação e skill `revisao-seguranca` atualizadas para Next 15.5 / React 19.

## Verificado

- `npm test`: 54 passaram (8 novos: datas e regras de consentimento na correção)
- `npm run lint`: só os 4 avisos antigos de `useEffect`; `npm run build` com Next 15.5.27: ok
- Versão de produção sem login: páginas protegidas levam ao login, API responde 401, CSRF responde 403, cabeçalhos de segurança presentes, login errado ~0,8 s

## Como testar (logado)

- [ ] **Navegação geral com o Next 15**: abrir cada item do menu e fazer uma ação em cada tela
- [ ] Datas de aula e nascimento iguais às cadastradas
- [ ] Matrículas → Editar: corrigir o telefone do responsável e salvar
- [ ] Editar a data de nascimento de um aluno maior (que consentiu sozinho) para menor → aviso de consentimento pendente; em Consulta de Cadastros aparece "Pendente"
- [ ] Professor no celular: chamada completa (turma → aula → marcar → salvar)
- [ ] Trocar a própria senha; sair e entrar
