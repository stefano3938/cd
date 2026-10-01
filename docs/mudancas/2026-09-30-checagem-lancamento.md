# 30/09/2026 — Checagem antes de lançar a nova versão

## Resultado: pode lançar

| Verificação | Resultado |
|---|---|
| `npm test` | ✅ 42 passaram |
| `npm run lint` | ✅ sem erros (4 avisos antigos de `useEffect`, sem impacto) |
| `npm run build` | ✅ ok |
| `.env.local` fora do git | ✅ ignorado; só `.env.example` é versionado |
| Versão de produção (`next start`) sem login | ✅ `/login` e `/privacidade` abrem; `/admin/*` e `/professor/*` levam ao login; `/admin/lgpd` não existe mais; `/api/admin/stats` responde 401 |
| Login errado | ✅ 401 em ~0,8 s |

## O que entra nesta versão

- Login mais rápido (consultas em paralelo; hash falso fixo para e-mail inexistente)
- Dashboard com uma só chamada (`/api/admin/stats`, só contagens)
- Menu do admin fixo: só o conteúdo troca (`app/admin/layout.tsx`)
- Tela "LGPD e Segurança" removida; bloqueio de IP, auditoria e anonimização continuam no backend
- `vercel.json` fixando a região em São Paulo (`gru1`)

Detalhes em `2026-09-30-login-dashboard-lgpd.md` e `2026-09-30-login-errado-indices.md`.

## Não bloqueia, mas falta

- **Aviso de privacidade (`/privacidade`) com textos entre colchetes, visíveis ao público.** Já estava assim na versão atual; esta versão não piora. Falta preencher `lib/lgpd/config.ts` (nome da igreja, CNPJ, contato, encarregado) e os trechos `[PRAZO]`, `[PRAZO DA AUDITORIA]`, `[Revisar com o controlador]` e `[Confirmar região dos servidores]` em `app/privacidade/page.tsx`. A região agora pode ser preenchida: Vercel e Supabase em São Paulo, Brasil. Ao mudar o texto, incrementar `PRIVACY_POLICY_VERSION`.
- Migração `005_indices.sql`: opcional (desempenho das listas).

## Depois do deploy

- [ ] Vercel → deploy → Functions: região `gru1`
- [ ] Login certo e errado no site publicado
- [ ] Menu do admin: só o conteúdo troca
- [ ] Dashboard mostra os totais
- [ ] Chamada pelo celular (professor)
