# Banco de Dados — Guia de Organização

Banco: **PostgreSQL no Supabase**. Este documento descreve o modelo atual, as
convenções e o que precisa ser ajustado.

> Regras da API e autenticação: veja [`BACKEND.md`](./BACKEND.md).

---

## 1. Diagrama das tabelas

```
courses ─┬─< modules ──< classes ──< attendance >── students >── turmas >── courses
         │                              │
         └─< turmas ──< turma_professors >── users
                                        │
                           attendance.marked_by ──> users
```

Leitura: `A ──< B` = "A tem vários B".

- Um **curso** (ex.: Capacitação Destino 2026) tem **módulos** e **turmas**.
- Cada **módulo** tem **aulas** (`classes`).
- Cada **turma** (horário de domingo) tem **alunos** e um ou mais
  **professores/monitores** (`turma_professors`).
- **Presença** (`attendance`) = um aluno × uma aula, com quem marcou.

---

## 2. Tabelas

### `users` — admins, professores e monitores
| Coluna | Tipo | Observação |
|--------|------|------------|
| id | uuid PK | `gen_random_uuid()` |
| email | text UNIQUE NOT NULL | login |
| password_hash | text NOT NULL | **sempre bcrypt**; nunca retornar pela API |
| nome | text NOT NULL | |
| telefone | text | |
| role | text NOT NULL | `admin` \| `professor` \| `monitor` |
| foto_url | text | caminho no Supabase Storage |
| data_nascimento | date | |
| nome_lider_direto, geracao, telefone_lider_direto | text | ficha do PLANEJAMENTO |
| created_at | timestamptz | |

### `courses` — edição anual do curso
`id`, `nome`, `ano`, `descricao`, `created_by → users`, `created_at`

### `modules` — módulos do curso
`id`, `course_id → courses (CASCADE)`, `nome`, `ordem`, `numero_de_aulas`,
`UNIQUE(course_id, ordem)`

### `classes` — aulas de um módulo
`id`, `module_id → modules (CASCADE)`, `titulo`, `ordem`, `data_aula`,
`UNIQUE(module_id, ordem)`

### `turmas` — horários (07:30, 10:30, 18:00)
`id`, `course_id → courses (CASCADE)`, `nome`, `horario_inicio`,
`horario_fim`, `dia_semana`

### `turma_professors` — vínculo N-N turma × usuário
`id`, `turma_id → turmas`, `professor_id → users`, `UNIQUE(turma_id, professor_id)`

### `students` — alunos matriculados
`id`, `nome`, `email`, `telefone`, `turma_id → turmas (CASCADE)`, `foto_url`,
`data_nascimento`, `nome_responsavel`, `telefone_responsavel`,
`nome_lider_direto`, `geracao`, `telefone_lider_direto`

### `attendance` — presença
`id`, `student_id → students`, `class_id → classes`,
`status` (`presente` \| `falta`), `marked_by → users`, `marked_at`,
`UNIQUE(student_id, class_id)` → permite `upsert` da chamada.

O schema completo está em [`lib/supabase/schema.sql`](../lib/supabase/schema.sql)
e os tipos TypeScript em [`lib/supabase/types.ts`](../lib/supabase/types.ts).
**Ao mudar uma tabela, atualize os dois.**

---

## 3. Convenções

- Nomes de tabela em **inglês, plural, snake_case** (`turmas` é exceção
  mantida por compatibilidade).
- Colunas em snake_case; campos de negócio podem ficar em português
  (`nome`, `data_aula`), mas seja consistente dentro da mesma tabela.
- Toda tabela tem `id uuid` e `created_at timestamptz default now()`.
- Chave estrangeira sempre com índice (`idx_<tabela>_<coluna>`).
- Valores fixos com `CHECK` (ex.: `role`, `status`).
- Exclusões em cascata só onde o filho não faz sentido sem o pai.

---

## 4. Migrations

Hoje o schema é um único `schema.sql` executado manualmente. Para organizar a
evolução do banco, usar o **Supabase CLI**:

```
supabase/
  migrations/
    20260101000000_initial_schema.sql   # conteúdo atual de schema.sql
    20260102000000_enable_rls.sql
    ...
  seed.sql
```

Comandos:

```bash
npx supabase init                              # uma vez
npx supabase link --project-ref <ref>          # liga ao projeto remoto
npx supabase migration new nome_da_mudanca     # cria arquivo novo
npx supabase db push                           # aplica no remoto
npx supabase gen types typescript --linked > lib/supabase/types.ts
```

Regras:
- **Nunca editar uma migration já aplicada**; crie outra.
- Uma migration por mudança lógica, com nome descritivo.
- Regenerar `types.ts` depois de cada migration.

---

## 5. Segurança: RLS (Row Level Security)

Atualmente **nenhuma tabela tem RLS**, e a chave `anon` é pública. Isso permite
que qualquer pessoa com a URL do projeto leia e altere todos os dados.

Como a aplicação acessa o banco **só pelo servidor com a service role key**
(ver `BACKEND.md`), a solução mais simples é ativar RLS **sem políticas** —
isso bloqueia totalmente a chave `anon`, e a service role continua funcionando:

```sql
-- supabase/migrations/<data>_enable_rls.sql
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules           ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE turmas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE turma_professors  ENABLE ROW LEVEL SECURITY;
ALTER TABLE students          ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance        ENABLE ROW LEVEL SECURITY;
```

> Importante: aplique isso **depois** de trocar as rotas para a service role
> key; caso contrário, a aplicação para de funcionar.

---

## 6. Seed (dados iniciais)

O hash em `lib/supabase/seed.sql` **não corresponde** à senha `admin` citada no
comentário — o login do admin inicial falha. Para gerar um hash correto:

```bash
node -e "console.log(require('bcryptjs').hashSync('SUA_SENHA_FORTE', 10))"
```

E use o resultado no seed:

```sql
INSERT INTO users (email, password_hash, nome, role)
VALUES ('admin@capacitacao.com', '<hash gerado>', 'Administrador', 'admin')
ON CONFLICT (email) DO NOTHING;
```

- Não versionar senhas reais; troque a senha no primeiro acesso.
- Dados de exemplo (cursos, turmas) podem ir no mesmo `seed.sql`, só para
  desenvolvimento.

---

## 7. Melhorias sugeridas no modelo

| Item | Motivo |
|------|--------|
| `students.turma_id` → tabela `enrollments(student_id, turma_id, status, created_at)` | Hoje um aluno fica preso a uma turma; a "consulta de turmas anteriores" fica mais simples se o histórico de matrícula for separado |
| `turmas.dia_semana` com `CHECK` | Evitar valores livres |
| `CHECK (horario_fim > horario_inicio)` em `turmas` | Consistência |
| `courses`: `UNIQUE(nome, ano)` | Evitar duplicar a edição do ano |
| Renomear `turma_professors.professor_id` → `user_id` | Monitores também usam a tabela |
| `updated_at` nas tabelas editáveis | Auditoria básica |
| Fotos no **Supabase Storage** (bucket privado), salvando só o caminho em `foto_url` | O PLANEJAMENTO exige foto |
| View `vw_frequencia_aluno` (total de aulas, presenças, %) | Centraliza o cálculo usado em relatórios e controle de frequência |

Exemplo de view de frequência:

```sql
CREATE VIEW vw_frequencia_aluno AS
SELECT
  s.id            AS student_id,
  s.nome,
  s.turma_id,
  COUNT(a.id)                                   AS aulas_registradas,
  COUNT(*) FILTER (WHERE a.status = 'presente') AS presencas,
  ROUND(100.0 * COUNT(*) FILTER (WHERE a.status = 'presente')
        / NULLIF(COUNT(a.id), 0), 1)            AS percentual
FROM students s
LEFT JOIN attendance a ON a.student_id = s.id
GROUP BY s.id;
```

---

## 8. Dados pessoais (LGPD)

O sistema guarda dados de menores (data de nascimento, responsável, telefone,
foto). Portanto:
- Acesso apenas por usuários autenticados e com papel adequado.
- Professor vê só alunos das próprias turmas.
- Não logar dados pessoais no servidor.
- Definir por quanto tempo manter dados de turmas antigas e como excluí-los.
