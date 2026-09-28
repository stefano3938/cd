---
name: revisao-lgpd
description: Checklist de LGPD para mudanças que criam, exibem, exportam, registram ou apagam dados pessoais (alunos, responsáveis, líderes, professores). Use ao adicionar campos/telas/relatórios com dados pessoais ou quando o usuário pedir revisão de privacidade.
---

# Revisão LGPD

Contexto fixo do projeto (detalhes em `docs/LGPD.md`):
- Controlador: a igreja. O sistema é operado por admins e professores voluntários.
- Há **menores** (campo `nome_responsavel`) → art. 14: melhor interesse e consentimento específico de um dos pais/responsável.
- Participação em curso de igreja pode revelar **convicção religiosa** → dado sensível (art. 5º II, art. 11).
- Há dados de **terceiros** (líder direto, responsável).

## Para cada mudança, responda

1. **Quais dados pessoais** a mudança cria, lê, exibe, exporta ou registra em log?
2. **Finalidade**: o dado é necessário para o curso (cadastro, chamada, contato)? Se não, não colete (art. 6º III).
3. **Quem vê**: o perfil mínimo necessário tem acesso? Professor só deve ver alunos das turmas dele e só os campos necessários.
4. **Onde sai do sistema**: exportação CSV, logs, serviços de terceiros (e-mail, IA, analytics)? Terceiros exigem avaliação e menção no aviso de privacidade; transferência internacional exige base no art. 33.
5. **Retenção**: por quanto tempo o dado fica? Segue a política de `docs/LGPD.md`?
6. **Direitos do titular**: o dado novo entra na exportação/exclusão do titular?

## Itens bloqueantes

- Log (`console.*`) com nome, e-mail, telefone, data de nascimento ou IP em claro.
- Endpoint que devolve mais campos pessoais do que a tela usa.
- Novo campo sensível (saúde, religião explícita, foto de menor, documento) sem base legal registrada em `docs/LGPD.md`.
- Envio de dados pessoais a serviço externo sem registro no inventário.
- Dados de menor coletados sem vínculo com o consentimento do responsável.

## Ao final

- Atualize o **inventário de dados** em `docs/LGPD.md` se surgiu campo, tabela, relatório ou integração nova.
- Liste para o usuário o que precisa de decisão do controlador (igreja/encarregado) — não decida base legal por ele.
