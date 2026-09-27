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

- **Next.js 15** - Framework React com App Router
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
        └── server.ts      # cliente do banco (somente servidor)
supabase/
├── migrations/            # alterações do banco, em ordem
├── seed.sql               # dados iniciais
└── check_rls.sql          # verificação do RLS
```

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Copie `.env.example` para `.env.local`
3. Preencha as variáveis de ambiente (as mesmas devem ser configuradas na hospedagem):

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key   # secreta, só no servidor
SESSION_SECRET=string_aleatoria_com_32+_caracteres
```

### 3. Criar tabelas no banco

Execute no SQL Editor do Supabase, em ordem, os arquivos de `supabase/migrations/` e depois `supabase/seed.sql`.
Detalhes em [`docs/BANCO_DE_DADOS.md`](docs/BANCO_DE_DADOS.md).

### 4. Rodar o projeto

```bash
npm run dev
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

O foco atual é na funcionalidade. Segurança e testes serão implementados em versões futuras.

## Documentação técnica

- [Back-end](docs/BACKEND.md) — organização da API, autenticação, permissões e padrões de rota
- [Banco de Dados](docs/BANCO_DE_DADOS.md) — modelo das tabelas, migrations, RLS e seed
