# Agenda de Publicações VOLUTA

ClickUp (lista "ciclo de produção") → webhook → recálculo de datas → dashboard HTML.
Arquitetura em [ARQUITETURA.md](ARQUITETURA.md). Passo a passo da estrutura no ClickUp: guia compartilhado no Claude.

## Testar localmente

```bash
npm test                         # 15 testes
npm run dev:mock                 # http://localhost:3000 com Casa Pla, Rohr e Zezinho e Turibio simulados
cp .env.example .env             # preencha o token e o ID da lista
npm run inspect -- <list_id>     # SÓ LEITURA: confere campos, marcos, posts e mostra a agenda
```

## Deploy (Vercel)

```bash
npm i -g vercel
vercel                                                        # anote a URL
npm run register-webhook -- <team_id> https://<app>.vercel.app/api/webhook <list_id>
```

Cadastre `CLICKUP_WEBHOOK_SECRET` e `CLICKUP_BOT_USER_ID` (impressos pelo script) e as demais variáveis do `.env.example` em *Settings → Environment Variables*, depois `vercel --prod`.

- Agenda interna: `https://<app>.vercel.app/`
- Link por cliente: `https://<app>.vercel.app/?cliente=csp` (sigla em minúsculas)

`team_id` = número logo após `app.clickup.com/` na URL; `list_id` = número da URL da lista "ciclo de produção".
