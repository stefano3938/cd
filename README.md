# Sistema de Controle de Curso - Capacitação Destino

Sistema de gerenciamento para o curso Capacitação Destino da igreja.

## Funcionalidades v1.0

### Administrador
- Criar e gerenciar cursos
- Definir módulos e aulas
- Criar turmas (horários)
- Cadastrar professores e alunos
- Importar alunos de planilha
- Visualizar relatórios de presença

### Professor
- Fazer chamada dos alunos
- Visualizar histórico de presenças
- Interface otimizada para mobile

## Stack Tecnológica

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Supabase** - Banco de dados e autenticação
- **CSS Modules** - Estilização
- **Tailwind CSS** - Utilitários CSS básicos

## Estrutura do Projeto

```
curso-igreja/
├── app/                    # Rotas Next.js
│   ├── (auth)/
│   │   └── login/         # Página de login
│   ├── admin/             # Área administrativa
│   │   ├── dashboard/
│   │   ├── cursos/
│   │   ├── turmas/
│   │   ├── professores/
│   │   ├── alunos/
│   │   └── relatorios/
│   └── professor/         # Área do professor
│       ├── chamada/
│       └── historico/
├── components/            # Componentes React
│   ├── ui/               # Componentes reutilizáveis
│   ├── admin/            # Componentes do admin
│   └── professor/        # Componentes do professor
├── assets/
│   └── css/              # Arquivos CSS
│       ├── globals.css
│       ├── variables.css
│       └── *.module.css
└── lib/
    └── supabase/         # Configuração Supabase
        ├── client.ts
        ├── types.ts
        └── schema.sql
```

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Copie `.env.example` para `.env.local`
3. Preencha as variáveis de ambiente:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key   # secreta, só no servidor
SESSION_SECRET=string_aleatoria_de_32+_caracteres
```

### 3. Criar tabelas no banco

No SQL Editor do Supabase, execute em ordem:

1. `lib/supabase/schema.sql`
2. `lib/supabase/migrations/001_enable_rls.sql` (bloqueia acesso direto pelas chaves públicas)
3. `lib/supabase/migrations/002_rate_limit_ip_block.sql` (rate limit e bloqueio de IP)
4. `lib/supabase/migrations/003_lgpd_auditoria.sql` (auditoria, consentimento, anonimização, revogação de sessão) — **obrigatória**
5. `lib/supabase/migrations/004_turma_transacional.sql` (turma + professores em transação) — **obrigatória**

### 4. Criar o primeiro administrador

```bash
node --env-file=.env.local scripts/create-admin.mjs
```

## Segurança

- Login gera um cookie de sessão `httpOnly` assinado (HMAC). Cada rota de API valida a sessão e o perfil (`requireRole`), além do `middleware.ts`.
- Professores só acessam as turmas atribuídas a eles; quem marcou a presença é registrado a partir da sessão.
- Senhas com bcrypt. Contas antigas criadas com Base64 são migradas automaticamente no próximo login.
- O cliente Supabase (`lib/supabase/client.ts`) usa a service role key e deve ser importado apenas em código de servidor.
- Rate limit em todas as rotas `/api` e bloqueio automático de IPs abusivos.
- Sessões revogáveis (troca de senha/perfil ou exclusão derruba a sessão na hora).
- LGPD: aviso de privacidade (`/privacidade`), consentimento, auditoria, exportação e anonimização (sem tela própria; operação pelo Supabase — ver `docs/SEGURANCA.md` e `docs/LGPD.md`).

Detalhes em [docs/SEGURANCA.md](docs/SEGURANCA.md) e [docs/LGPD.md](docs/LGPD.md). Planejamento em [PLANEJAMENTO.md](PLANEJAMENTO.md).

### 5. Rodar o projeto

```bash
npm run dev
npm test        # testes de segurança/LGPD (não precisam de banco)
```

Acesse [http://localhost:3000](http://localhost:3000)

## Paleta de Cores

- **Azul Primário**: `#2563eb`
- **Azul Secundário**: `#3b82f6`
- **Branco**: `#ffffff`
- **Cinza Claro**: `#f3f4f6`

## Próximos Passos (após v1.0)

- Página do aluno
- Sistema de testes
- Melhorias de segurança
- Notificações
- Relatórios avançados

## Desenvolvimento

Regras de código, segurança e LGPD para contribuir estão em [CLAUDE.md](CLAUDE.md).
