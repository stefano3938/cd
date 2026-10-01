# 30/09/2026 — Correção dos itens 🔴 da revisão geral

Referência: `2026-09-30-revisao-geral.md`, itens 1.1, 1.2, 1.3 e 2.1.

## ⚠️ Passo obrigatório: rodar a migração 006

No **SQL Editor do Supabase**, rode `lib/supabase/migrations/006_protege_exclusoes.sql`. Pode rodar antes ou depois do deploy, e pode rodar mais de uma vez.

- Sem ela, **excluir usuário/professor fica bloqueado**, com uma mensagem pedindo a migração. É de propósito: sem a migração, a exclusão apagaria as chamadas.
- As outras proteções (turma, curso, módulo, aula) já funcionam sem a migração, porque a API confere antes de excluir.
- No fim do arquivo há uma consulta de conferência (comentada).

## 1. Exclusões que apagavam dados

| Ação | Antes | Agora |
|---|---|---|
| Excluir usuário/professor | apagava **todas as chamadas** que ele marcou | chamadas ficam; "marcado por" fica vazio (a auditoria guarda quem foi) |
| Excluir turma | apagava todos os alunos e presenças | recusada se a turma tem alunos (mensagem com a quantidade) |
| Excluir curso | apagava turmas, alunos, aulas e presenças | recusada se tem turmas ou aulas com chamada |
| Excluir módulo/aula | apagava as presenças | recusada se tem chamada registrada |
| Excluir aluno | apaga o aluno e as presenças dele | igual (é o pedido de exclusão do titular), mas a confirmação agora diz isso |

Arquivos:
- `lib/supabase/migrations/006_protege_exclusoes.sql`: `attendance.marked_by` → `ON DELETE SET NULL`; `students.turma_id`, `turmas.course_id` e `attendance.class_id` → `ON DELETE RESTRICT`; função `excluir_usuario`.
- `app/api/admin/{turmas,courses,modules,classes}/[id]/route.ts`: conferem antes de excluir, respondem **409** com mensagem clara e registram a exclusão na auditoria (antes não registravam).
- `app/api/admin/{users,professors}/[id]/route.ts`: excluem pela função `excluir_usuario`. Sem a migração, respondem 409 pedindo para rodá-la.
- `lib/api/errors.ts`: `conflict`, `isForeignKeyViolation`, `isMissingFunction`, `MIGRACAO_006_PENDENTE`.
- `lib/security/audit.ts`: novas entidades `course`, `module`, `class`.
- Telas (turmas, cursos, professores, usuários, matrículas, alunos): a confirmação explica o que acontece e, se o servidor recusar, mostra o motivo (antes falhava em silêncio).
- `lib/supabase/types.ts`: `marked_by` pode ser `null`.

## 2. Corte de 1000 linhas do Supabase

O Supabase devolve no máximo 1000 linhas por consulta, e acima disso **corta sem erro**.

- `lib/supabase/fetch-all.ts` (novo): `fetchAll` busca página por página até acabar. Teste em `tests/fetch-all.test.ts`.
- **Frequência**: antes baixava todas as presenças do sistema e filtrava no navegador. Agora `GET /api/admin/attendance?turma_id=` filtra no servidor e pagina. De quebra, a coluna de data da aula, que aparecia sempre como "-", passou a vir preenchida.
- **Relatório por turma**: presenças filtradas pela turma via join (antes era uma lista de IDs na URL) e paginadas; alunos paginados.
- **Lista de alunos** e **lista de aulas**: paginadas.

## 3. Menu completo

`components/admin/AdminLayout.tsx` e `assets/css/admin.module.css`: o menu agora é dividido em grupos e inclui as telas que só abriam pelo endereço.

- **Curso**: Cursos e Aulas, Turmas
- **Cadastros**: Usuários, Matrículas, Alunos e Importação
- **Chamada**: Caderneta, Frequência, Relatórios
- **Consultas**: Cadastros, Turmas

`/admin/professores` ficou fora do menu porque "Usuários" já cobre os professores.

## Verificado

- `npm test`: 46 passaram (4 novos de paginação)
- `npm run lint`: só os 4 avisos antigos; `npm run build`: ok
- Consultas novas testadas no banco real (somente leitura): filtros aninhados de curso/módulo, frequência e relatório por turma. Função `excluir_usuario` ainda inexistente → API identifica `PGRST202` e bloqueia.

## Como testar

- [ ] Rodar a migração 006 e a consulta de conferência
- [ ] Menu mostra os grupos; Cursos e Aulas, Turmas, Relatórios e Alunos abrem
- [ ] Excluir turma com alunos → mensagem "A turma tem N aluno(s)..."
- [ ] Excluir aula com chamada → mensagem de bloqueio
- [ ] Criar um usuário de teste, fazer uma chamada com ele, excluí-lo → a chamada continua na Frequência
- [ ] Frequência mostra as datas das aulas
