# Planejamento do Projeto - Sistema de Controle de Curso

## Informações do Curso

**Curso:** Capacitação Destino
**Periodicidade:** Uma vez por ano
**Módulos:** 6 módulos (quantidade de aulas definida pelo admin)
**Horários:** Domingos em 3 horários:
- 07:30 - 09:30
- 10:30 - 12:30
- 18:00 - 20:00

---

## Estrutura de Abas do Sistema

### ABA 1 - CADASTRO DE USUÁRIOS
- **Visibilidade:** Somente para Admins
- **Descrição:** Local para inserção de novos usuários (admins, professores e monitores)

### ABA 2 - MATRÍCULAS
- **Visibilidade:** Somente para Admins
- **Descrição:** Local para inserção de novos cadastros de alunos nas turmas

### ABA 3 - CADERNETA DE CHAMADAS
- **Visibilidade:** Admins e Professores
- **Descrição:** Local para inserção das presenças semanalmente

### ABA 4 - CONTROLE DE FREQUÊNCIA
- **Visibilidade:** Somente para Admins
- **Descrição:** Armazenamento dos dados das frequências

### ABA 5 - CONSULTA DE CADASTROS
- **Visibilidade:** Admins e Professores
- **Descrição:** Consulta das informações da ficha de matrícula dos alunos

### ABA 6 - CONSULTA DE TURMAS
- **Visibilidade:** Somente para Admins
- **Descrição:** Armazenamento dos dados das turmas anteriores

---

## Formulários do Sistema

### Formulário de Matrícula do Aluno

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Foto | Upload de imagem | Sim |
| Nome Completo | Texto | Sim |
| Data de Nascimento | Data | Sim |
| Idade | Número (calculado) | Automático |
| Nome do Responsável | Texto | Sim |
| Telefone do Responsável | Telefone | Sim |
| E-mail | Email | Sim |
| Nome do Líder Direto | Texto | Sim |
| Geração | Texto | Sim |
| Telefone do Líder Direto | Telefone | Sim |
| Turma | Seleção (07h30, 10h30, 18h00) | Sim |

### Formulário de Cadastro do Professor/Monitor

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Foto | Upload de imagem | Sim |
| Nome Completo | Texto | Sim |
| Data de Nascimento | Data | Sim |
| E-mail | Email | Sim |
| Nome do Líder Direto | Texto | Sim |
| Geração | Texto | Sim |
| Telefone do Líder Direto | Telefone | Sim |

---

## Permissões por Tipo de Usuário

| Funcionalidade | Admin | Professor | Monitor |
|----------------|-------|-----------|---------|
| Cadastro de Usuários | ✅ | ❌ | ❌ |
| Matrículas | ✅ | ❌ | ❌ |
| Caderneta de Chamadas | ✅ | ✅ | ❌ |
| Controle de Frequência | ✅ | ❌ | ❌ |
| Consulta de Cadastros | ✅ | ✅ | ❌ |
| Consulta de Turmas | ✅ | ❌ | ❌ |

---

## O que foi implementado

### ✅ Estrutura Base do Projeto

1. **Projeto Next.js 15** com TypeScript
2. **Estrutura de pastas** organizada:
   - `/app` - Rotas (admin, professor, auth)
   - `/components` - Componentes React
   - `/assets/css` - Arquivos CSS separados
   - `/lib/supabase` - Configuração do banco

3. **Sistema de estilos**:
   - CSS Modules para componentes específicos
   - Tailwind apenas para utilitários básicos
   - Variáveis CSS com paleta azul e branco

4. **Supabase configurado**:
   - Client configurado
   - Schema SQL pronto para uso
   - Tipos TypeScript definidos

5. **Página de login** funcional (interface pronta)

## Próximos Passos de Desenvolvimento

### 1. Autenticação (Prioridade Alta)

- [ ] Implementar autenticação com Supabase
- [ ] Sistema de criação de usuários pelo admin
- [ ] Middleware de proteção de rotas
- [ ] Verificação de roles (admin/professor)

### 2. Área do Administrador

#### 2.1 Dashboard
- [ ] Visão geral do sistema
- [ ] Estatísticas rápidas
- [ ] Atalhos para ações principais

#### 2.2 Gestão de Cursos
- [ ] Criar novo curso
- [ ] Listar cursos existentes
- [ ] Editar informações do curso
- [ ] Definir módulos do curso
  - Nome do módulo
  - Ordem
  - Quantidade de aulas
- [ ] Definir aulas de cada módulo
  - Título da aula
  - Data (opcional)
  - Ordem

#### 2.3 Gestão de Turmas
- [ ] Criar turma com horário
- [ ] Associar turma a um curso
- [ ] Atribuir professores à turma
- [ ] Visualizar turmas ativas

#### 2.4 Gestão de Professores
- [ ] Cadastrar professor manualmente
- [ ] Listar professores
- [ ] Editar dados do professor
- [ ] Criar login para professor

#### 2.5 Gestão de Alunos
- [ ] Cadastrar aluno manualmente
- [ ] Importar alunos de planilha Excel/CSV
  - Parser de arquivo
  - Validação de dados
  - Preview antes de importar
- [ ] Atribuir aluno a uma turma
- [ ] Listar alunos por turma
- [ ] Editar dados do aluno
- [ ] Transferir aluno de turma

#### 2.6 Relatórios
- [ ] Relatório de presença por turma
- [ ] Relatório de presença por aluno
- [ ] Relatório geral do curso
- [ ] Exportar relatórios (PDF/Excel)

### 3. Área do Professor (Mobile-First)

#### 3.1 Chamada
- [ ] Listar próximas aulas da turma
- [ ] Selecionar aula para fazer chamada
- [ ] Interface mobile de chamada
  - Lista de alunos
  - Botões grandes Presente/Falta
  - Cores visuais (verde/vermelho)
  - Contador de presentes/faltas
- [ ] Salvar chamada no banco
- [ ] Editar chamada já feita

#### 3.2 Histórico
- [ ] Ver histórico de chamadas
- [ ] Filtrar por data
- [ ] Ver estatísticas da turma

### 4. Componentes Reutilizáveis

- [ ] Button (primário, secundário, danger)
- [ ] Input (text, email, password, date)
- [ ] Select
- [ ] Table
- [ ] Modal
- [ ] Loading states
- [ ] Toast notifications
- [ ] Card
- [ ] FileUpload (para importar planilhas)

## Modelo de Dados (Relacionamentos)

```
Course (1) -> (*) Modules
Module (1) -> (*) Classes
Course (1) -> (*) Turmas
Turma (*) <-> (*) Professor
Turma (1) -> (*) Students
Student (1) -> (*) Attendance
Class (1) -> (*) Attendance
Professor (1) -> (*) Attendance (marked_by)
```

## Fluxo de Uso do Sistema

### Fluxo do Admin (Configuração Inicial)

1. Login no sistema
2. Criar curso "Capacitação Destino 2026"
3. Definir 6 módulos com suas aulas
4. Criar 3 turmas (horários do domingo)
5. Cadastrar/importar professores
6. Atribuir professores às turmas
7. Cadastrar/importar alunos
8. Atribuir alunos às turmas

### Fluxo do Professor (Uso Diário)

1. Login no sistema (mobile)
2. Ver lista de aulas programadas
3. Selecionar aula do dia
4. Marcar presença/falta dos alunos
5. Salvar chamada

### Fluxo do Admin (Acompanhamento)

1. Acessar relatórios
2. Ver estatísticas de presença
3. Identificar alunos com muitas faltas
4. Exportar dados

## Considerações Técnicas

### Banco de Dados
- Usar RLS (Row Level Security) quando implementar segurança
- Índices já criados para performance
- Constraints para integridade dos dados

### Interface
- Mobile-first para área do professor
- Desktop-first para área do admin
- Design responsivo em ambas

### Performance
- Lazy loading de componentes
- Paginação em listas grandes
- Cache de dados do Supabase

### Importação de Planilhas
Formato esperado:
```
Nome | Email | Telefone
João Silva | joao@email.com | (11) 99999-9999
Maria Santos | maria@email.com | (11) 88888-8888
```

## Versões Futuras (pós v1.0)

- [ ] Página do aluno (ver própria frequência)
- [ ] Sistema de notificações (email/SMS)
- [ ] App mobile nativo
- [ ] Testes automatizados
- [ ] Segurança avançada
- [ ] Auditoria de ações
- [ ] Backup automático
- [ ] Multi-tenancy (várias igrejas)
