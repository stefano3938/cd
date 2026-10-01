# LGPD — Privacidade e proteção de dados

> Documento técnico de apoio. As decisões marcadas **[Decisão do controlador]** cabem à igreja (controladora) e, se houver, ao encarregado (DPO). Não substitui orientação jurídica.

## Contexto de uso

- **Somente coordenação (admin) e professores acessam o sistema.** Alunos, responsáveis e líderes não têm login.
- O consentimento é coletado **fora do sistema** (ficha de matrícula em papel ou formulário) e o admin registra no sistema que foi obtido, quem autorizou e em qual versão do aviso.
- Pedidos de titulares (acesso, cópia, correção, exclusão) chegam à coordenação, que confere a identidade e atende pelo painel.
- O aviso de privacidade fica público em `/privacidade` para ser enviado por link ou impresso na matrícula.

## Papéis

| Papel | Quem |
|-------|------|
| Controlador | A igreja |
| Operadores | Supabase (banco), Vercel (hospedagem) |
| Usuários internos | Coordenação (admin) e professores voluntários |
| Encarregado (DPO) | **[Decisão do controlador]** — agentes de pequeno porte podem ter dispensa (Resolução CD/ANPD nº 2/2022), mas precisam de um canal de contato com titulares |

Dados do controlador exibidos no aviso: `lib/lgpd/config.ts` (`CONTROLLER`) — **preencher antes de publicar**.

## Pontos de atenção

- **Dado sensível:** participar de um curso de igreja pode revelar convicção religiosa (art. 5º II). O tratamento precisa de uma base do art. 11. Diferente do GDPR europeu, a LGPD não tem hipótese específica para organizações religiosas, e o legítimo interesse não vale para dado sensível. Na prática, a base mais provável é o **consentimento específico e destacado** (art. 11, I). **[Decisão do controlador]**
- **Crianças e adolescentes:** art. 14 — consentimento específico de ao menos um dos pais/responsável; melhor interesse do menor. O sistema **exige** que o consentimento de aluno menor de 18 anos seja registrado como do responsável.
- **Terceiros:** nome/telefone do responsável e do líder direto são dados de pessoas que não se cadastraram.

## Inventário de dados

| Tabela | Titular | Dados pessoais | Finalidade | Quem acessa |
|--------|---------|----------------|------------|-------------|
| `students` | Aluno | nome, e-mail, telefone, data de nascimento, foto (`foto_url`), turma | Matrícula e contato | Admin (tudo); professor: só `id`, `nome` das próprias turmas |
| `students` | Responsável (terceiro) | nome, telefone | Contato sobre aluno menor | Admin |
| `students`, `users` | Líder direto (terceiro) | nome, telefone, geração | Acompanhamento pastoral | Admin |
| `students` | Aluno/responsável | data, versão do aviso e titular do consentimento; data de anonimização | Prova do consentimento (art. 8º §2º) | Admin |
| `attendance` | Aluno | presença/falta por aula, quem marcou, quando | Controle de frequência | Admin; professor da turma |
| `users` | Admin/professor/monitor | nome, e-mail, telefone, data de nascimento, foto, hash de senha, perfil, versão da sessão | Acesso ao sistema | Admin (sem hash de senha) |
| `audit_log` | Usuários internos; visitantes | quem, ação, registro afetado (ID), IP, data | Trilha de auditoria (art. 37) e segurança | Admin (Supabase, tabela no SQL Editor) |
| `ip_blocks` | Qualquer visitante | IP, motivo, horário | Segurança (bloqueio de abuso) | Admin (Supabase, tabela no SQL Editor) |
| `rate_limits` | Qualquer visitante | hash SHA-256 de IP (+ e-mail no login) | Segurança (rate limit) | Ninguém pela aplicação |
| Logs Vercel/Supabase | Visitantes/usuários | IP, rotas acessadas, erros | Operação e segurança | Mantenedores |

Ao adicionar campo/tabela/relatório/integração com dado pessoal, **atualize esta tabela** (skill `revisao-lgpd`).

## Consentimento

- **Matrícula** (`/admin/matriculas`): bloco de consentimento obrigatório — quem autorizou (aluno maior / responsável) + confirmação. Menor de idade trava a opção em "responsável".
- **Cadastro rápido e importação CSV** (`/admin/alunos`): criam o aluno com consentimento **Pendente**.
- **Consulta de Cadastros**: coluna com status (Registrado / Pendente / Anonimizado); na ficha, o admin registra o consentimento pendente.
- Cada registro guarda data, titular, versão do aviso (`PRIVACY_POLICY_VERSION`) e quem registrou; também entra na auditoria.
- **Revogação:** o titular pede à coordenação → excluir o aluno ou anonimizar. [Decisão do controlador: se presenças passadas devem ser mantidas anonimizadas]

## Retenção

| Dado | Prazo proposto | Status |
|------|----------------|--------|
| Alunos e presenças de turmas encerradas | **[Decisão do controlador]** — ex.: 2 anos após o fim do curso, depois anonimizar | ✅ Anonimização por turma: `SELECT anonimizar_turma('<id da turma>');` no SQL Editor (manual, irreversível) |
| Usuários inativos | Remover ao sair do voluntariado | Manual (admin exclui) |
| `audit_log` | **[Decisão do controlador]** — ex.: 24 meses | ✅ Função `SELECT purge_audit_log(24);` (rodar periodicamente) |
| `rate_limits` | 1 dia | ✅ Limpeza automática |
| `ip_blocks` | 30 dias após o fim do bloqueio | ✅ Limpeza automática |

## Direitos do titular (art. 18)

Como alunos não acessam o sistema, todos os pedidos passam pela coordenação.

| Direito | Como atender | Status |
|---------|--------------|--------|
| Confirmação e acesso | Consulta de Cadastros → Ver Ficha | ✅ |
| Portabilidade / cópia | Ficha → **Exportar dados (JSON)**: cadastro, turma, consentimento e presenças | ✅ |
| Correção | Admin edita o cadastro | ✅ |
| Eliminação | Admin exclui o aluno (apaga presenças em cascata) ou anonimiza a turma | ✅ |
| Informação sobre compartilhamento | Aviso de privacidade (`/privacidade`) | ✅ Modelo — preencher dados |
| Revogação do consentimento | Excluir/anonimizar | Manual |

Canal para o titular: `CONTROLLER.contato` em `lib/lgpd/config.ts` — **[Decisão do controlador]**.

## Auditoria (art. 37)

Registrado em `audit_log` (consultar no SQL Editor do Supabase):

- Alunos: listagem, visualização de ficha, criação, importação, alteração, exclusão, exportação, consentimento, anonimização de turma
- Usuários/professores: criação, alteração (quais campos), exclusão, troca de senha
- Chamadas: gravação (admin e professor)
- Acesso: login, login com falha, desbloqueio de IP

`details` contém apenas IDs, nomes de campos e contagens — nunca valores pessoais.

## Medidas de segurança (art. 46)

Resumo — detalhes em `docs/SEGURANCA.md`:
- Autenticação por sessão assinada e revogável (troca de senha/perfil ou exclusão derruba a sessão na hora); autorização por perfil e por turma em todas as rotas.
- Senhas com bcrypt; nenhuma resposta devolve hash.
- Banco com RLS e acesso apenas pelo servidor.
- Rate limit e bloqueio automático de IP; chaves de rate limit armazenadas como hash.
- Professores recebem apenas nome dos alunos (minimização).
- Erros sem detalhes internos; logs sem dados pessoais; trilha de auditoria.

## Transferência internacional (art. 33)

Supabase e Vercel podem armazenar/processar dados fora do Brasil. **[Decisão do controlador]**: verificar a região do projeto Supabase (Settings → General) e da Vercel; ajustar o aviso de privacidade.

## Pendências

- [ ] Preencher `CONTROLLER` em `lib/lgpd/config.ts` e revisar os trechos `[...]` de `app/privacidade/page.tsx`
- [ ] Definir prazos de retenção (alunos e auditoria) e colocar no aviso
- [ ] Regularizar consentimento dos alunos já cadastrados (status "Pendente")
- [ ] Incluir o link/QR code do aviso de privacidade na ficha de matrícula em papel
- [ ] Revisar necessidade de foto (`foto_url`), principalmente de menores
- [ ] Registro das operações de tratamento (ROPA) mantido pelo controlador
- [ ] Avaliar incidente do período em que a API esteve pública (ver `docs/SEGURANCA.md` → Histórico)
