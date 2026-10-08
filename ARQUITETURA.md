# Agenda de Publicações VOLUTA — Arquitetura

**O ClickUp é a única fonte da verdade.** O backend não tem banco: reage a webhooks, corrige datas *no próprio ClickUp* e, quando o dashboard pede, lê a lista e devolve um JSON filtrado.

## Estrutura lida no ClickUp (lista "ciclo de produção")

```
CSP · Casa Pla                                   cliente (1º nível) · campos ciclo, cliente, mês
├─ CSP · Briefing / Captação de conteúdo / Produção
├─ CSP · Enviar para aprovação do cliente        ← APPROVAL GATE: concluída (✓) = projeto aprovado
└─ CSP · Programar posts
   ├─ CSP · Início das publicações do mês        marco: data do Post 01 (mover = move o mês)
   ├─ CSP · Fim das publicações do plano         marco: escrito pela automação (= último post)
   ├─ CSP · Último post do plano do mês passado  marco: reserva quando o Início está vazio
   ├─ CSP · Post 01   Link_Canva · Intervalo_Dias · Formato · Editoria
   └─ CSP · Post 02 … (ordem das subtarefas = ordem de publicação)
```

Etapas e marcos são reconhecidos por **trecho do nome** (sem sigla, acento ou maiúscula), então o template pode ser duplicado todo mês sem configurar IDs.

## Fluxo

```
ClickUp ──webhook (HMAC)──▶ POST /api/webhook
                              1. valida X-Signature
                              2. ignora eventos do usuário-robô (anti-loop)
                              3. lê a lista → árvore cliente/etapas/marcos/posts
                              4. Approval Gate: etapa de aprovação concluída?
                              5. decide o recálculo pelo papel da tarefa
                              6. PUT due_date nos posts + marcos Início/Fim
Navegador ──▶ / (public/index.html) ──fetch──▶ GET /api/agenda (cache CDN 60 s)
```

| Tarefa alterada | Evento | Recálculo |
|---|---|---|
| Enviar para aprovação → ✓ | status | Mês inteiro a partir do Início (ou Último + intervalo) |
| Início | data | Mês inteiro a partir da nova data |
| Último post do mês passado | data | Mês inteiro, só se o Início estiver vazio |
| Post | data / Intervalo_Dias | Só os posts seguintes |
| Post | criado / status / etiqueta | Revisão da cadeia (preenche datas vazias, fecha buracos) |
| Fim | — | Somente leitura (a automação reescreve) |

Regra da cadeia: `data(seguinte) = data(anterior) + Intervalo_Dias(anterior)`. Post concluído (✓) ou "publicado" não se move e vira âncora. Etiqueta `fora da agenda` tira o post da cadeia e da agenda.

## Decisões técnicas

- **Anti-loop:** eventos do `CLICKUP_BOT_USER_ID` são ignorados, e o cálculo é idempotente (só grava o que difere).
- **Segurança:** HMAC-SHA256 do corpo cru com comparação em tempo constante; `DASHBOARD_TOKEN` opcional.
- **Rate limit:** cache CDN no GET; escritas em série com retry em 429/5xx.
- **Retentativas:** erro → 500 → o ClickUp reenvia; reprocessar é seguro.
- **Fuso:** soma de 24 h (Brasília sem horário de verão), o horário 18:00 é preservado.
- **Sem dependências:** Node 20+, funções no formato Web (`export function POST(request)`).

## Código

```
api/webhook.js      POST: assinatura → handleWebhookEvent
api/agenda.js       GET: buildAgenda (+ ?cliente=csp, token, cache)
lib/structure.js    árvore cliente → etapas → marcos/posts + Approval Gate
lib/schedule.js     regras puras: sequência, planChain, anchorDate, planMilestones
lib/service.js      decisão por papel da tarefa + JSON da agenda
lib/normalize.js    campos (url/number/dropdown/labels, "mês" duplicado), sigla do cliente
lib/clickup.js      API v2 (paginação, retry)
public/index.html   dashboard
scripts/            registrar webhook · inspecionar a lista (só leitura)
mock/, test/        ClickUp simulado com Casa Pla, Rohr, Zezinho e Turibio · 15 testes
```
