# 30/09/2026 — Login com senha errada mais lento: índices resolvem?

## Pedido

O login só parece demorar quando a senha está errada. Dá para melhorar com índices?

## Análise

**Índices não ajudam.** Todas as consultas do login já usam chave única ou primária, e as tabelas são pequenas:

| Consulta | Busca por | Índice |
|---|---|---|
| usuário | `users.email` | UNIQUE (já tem índice) |
| limite de tentativas | `rate_limits.key_hash` | chave primária |
| bloqueio de IP | `ip_blocks.ip` | chave primária |
| auditoria | insert em `audit_log` | — |

A migração `005_indices.sql` (ainda não rodada) melhora as listas de alunos e chamadas, não o login.

O tempo do login vem de:

| Etapa | Tempo aproximado |
|---|---|
| Middleware: bloqueio de IP / limite (1 ida ao banco) | ~150 ms |
| Limite por e-mail + busca do usuário (em paralelo) | ~150 ms |
| Verificação da senha (bcrypt, custo 12) | ~315 ms |
| Registrar falha + auditoria (em paralelo) | ~150 ms |

O bcrypt é lento **de propósito**: é o que impede alguém de testar milhares de senhas. Ele não foi alterado.

## Feito

`lib/auth/password.ts`: quando o e-mail não existe, o sistema compara a senha com um hash "falso", para o tempo de resposta não revelar quais e-mails estão cadastrados. Esse hash era **gerado na hora**, o que custava ~300 ms a mais na primeira tentativa errada de cada instância nova (na Vercel isso acontece com frequência). Agora ele é fixo no código (custo 12, gerado a partir de um segredo aleatório descartado).

Resultado no servidor de desenvolvimento: login errado em ~0,76 s, o mesmo tempo de um login certo. `npm test`: 42 passaram.

## Recomendação: região da Vercel x região do Supabase

Não há `vercel.json` no projeto, então as funções da Vercel rodam na região padrão (Washington, EUA). Se o Supabase estiver em São Paulo (`sa-east-1`), **cada** consulta atravessa o continente, e isso pesa mais que tudo acima.

Como conferir:

1. Supabase → Project Settings → General → **Region**.
2. Vercel → Project → Settings → Functions → **Function Region**.

Se forem diferentes, ajuste a região da Vercel para a mesma do Supabase (ex.: São Paulo = `gru1`) e faça um novo deploy.

**Feito:** o usuário colocou a região de funções da Vercel em São Paulo, e o projeto ganhou um `vercel.json` com `"regions": ["gru1"]`, que fixa a região no código (vale mais que o painel). Se o Supabase mudar de região um dia, troque esse valor também.

## Como testar

- [ ] Login com e-mail inexistente, com senha errada e com senha certa: tempos parecidos
- [ ] Errar a senha várias vezes: continua bloqueando ("Muitas tentativas")
- [ ] Depois do deploy, na Vercel → Deployments → (deploy) → Functions: a região aparece como `gru1`
- [ ] Login no site publicado: deve ficar bem mais rápido que antes
