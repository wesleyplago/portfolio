# portfolio

Meu portfólio pessoal, em React + TypeScript + Zod, organizado como **monorepo de
microfrontends**. O portfólio é o app **host**; cada projeto com demo ao vivo é um app
**remote**, buildado e servido separadamente e carregado em runtime via
**Module Federation**.

O primeiro microfrontend é o console do [payops-agent](https://github.com/wesleyplago/payops-agent):
uma interface para usar o agente de pagamentos sem terminal. Ele **não depende do backend**: sem API
declarada, ou com a API fora do ar na subida, roda com um mock em memória que segue o mesmo contrato.

```text
portfolio/                         monorepo pnpm
├── apps/
│   ├── portfolio/   (host)        :5180  páginas do portfólio + rotas /projetos/*
│   ├── payops/      (remote)      :5181  expõe `payops/App` em remoteEntry.js; também roda sozinho
│   ├── rag/         (remote)      :5182  busca do rag-eval-harness
│   ├── lagoski-catalog/   (remote) :5183  ┐
│   ├── lagoski-checkout/  (remote) :5184  │ Lagoski: um microfrontend por
│   ├── lagoski-orders/    (remote) :5185  │ bounded context com UI
│   └── lagoski-inspector/ (remote) :5186  ┘
└── packages/
    ├── payops-contracts/          schemas Zod, cliente HTTP e mock em memória (mesma interface)
    ├── rag-contracts/
    └── lagoski-contracts/         API do BFF (Zod), cliente HTTP + SSE, sistema simulado, eventos entre MFEs
```

```text
 navegador
 ┌────────────────────────── localhost:5180 (host) ───────────────────────────┐
 │  Portfólio (React Router)                                                  │
 │   /                    → Home, projetos                                    │
 │   /projetos/payops     → lazy(import('payops/App'))  ──┐                   │
 │                          dentro de RemoteBoundary      │ runtime           │
 └────────────────────────────────────────────────────────┼───────────────────┘
                                                          ▼
                         localhost:5181/remoteEntry.js  (remote payops)
                                                          │ PayOpsClient (escolhido na subida)
                                        ┌─────────────────┴──────────────────┐
                                        ▼                                    ▼
                         API real (fetch + Zod)                   mock em memória
                         payops-agent :3000                       mesmas regras e códigos
```

## Rodando

Pré-requisitos: Node 20+ e pnpm. O backend é opcional.



```bash
pnpm install
pnpm dev
```

Abra **http://localhost:5180**. O PayOps também roda sozinho em http://localhost:5181.

### Modo real ou modo demo

O microfrontend decide **uma vez, na subida** (`apps/payops/src/connect.ts`):

| Situação | Modo | O que a tela mostra |
| --- | --- | --- |
| `VITE_PAYOPS_API_URL` não declarada | demo (mock) | "modo demo · dados simulados" + o motivo |
| URL declarada, chaves não | demo (mock) | idem |
| URL e chaves declaradas, `/readyz` não responde em 2,5 s | demo (mock) | "API … fora do ar na subida" |
| URL e chaves declaradas, `/readyz` ok | real | "API real online" + links do Jaeger |

Ele não troca de modo no meio da sessão: misturar estado real e simulado deixaria o histórico
incoerente. Se a API real cair depois, a tela avisa e sugere recarregar.

Para usar a API real, suba o payops-agent e declare as variáveis:

```bash
cd ../deepseek-harness/default-workspace/payops-agent && docker compose up -d
```

```bash
cp apps/payops/.env.example apps/payops/.env.local
```

O mock (`createMockPayOpsClient`) implementa a mesma interface `PayOpsClient` do cliente HTTP e
reproduz o que é observável no backend: aprovação humana bloqueante com expiração, replay e
`IDEMPOTENCY_CONFLICT`, `REFUND_EXCEEDS_CAPTURE` mesmo com aprovação, `POLICY_VIOLATION` para Pix
fora da allowlist antes de chegar ao humano, partidas dobradas e o scanner de prompt injection.
Toda resposta dele é validada pelo **mesmo schema Zod** da API real nos testes. Não há Postgres,
outbox, trace nem persistência: o estado vive na aba e some ao recarregar.

Build de produção servido localmente:

```bash
pnpm build && pnpm preview
```

> **Por que 5180/5181 e não 5000/5001?** No macOS, a porta 5000 é do AirPlay Receiver
> (ControlCenter escuta em `*:5000`). Em `127.0.0.1:5000` você cairia nele.

## O console do PayOps

Você faz os dois papéis do fluxo:

| Painel | Papel | Endpoint |
| --- | --- | --- |
| Operador → agente | pede cobrança, estorno, Pix, consultas, ou planta um prompt injection | `POST /v1/agent/execute` |
| Aprovador humano | vê o pedido pendente e aprova ou nega | `/internal/approvals` (canal separado) |
| Atividade | resultado, cadeia de tools, quarentena de documentos, link do trace no Jaeger, botão de **repetir com a mesma chave** | |
| Saldos do ledger | atualiza depois de cada mutação | |

Coisas para testar: cobrar e repetir com a mesma chave (volta a mesma transação), estornar mais
do que foi cobrado mesmo aprovando (o ledger bloqueia), Pix para `pix-atacante` (bloqueado antes
de chegar ao humano), negar uma aprovação, e os cinco ataques da aba "Prompt injection".

## A busca do RAG (rag-eval-harness)

Rota `/projetos/rag`, remote `apps/rag` em `:5182`, contrato em `packages/rag-contracts`. Você faz
perguntas sobre regulação de pagamentos e vê os trechos que o retrieval devolve, com documento, seção,
score, latência e um histórico da sessão. A aba "Resultados do eval" mostra o snapshot publicado do
benchmark (BM25 × dense × hybrid), que não depende da API.

Para usar a API real, suba o rag-eval-harness (`docker compose up -d`, API em `API_PORT`, padrão 3000)
e declare a URL em `apps/rag/.env.local` (modelo em `apps/rag/.env.example`):

```bash
echo 'VITE_RAG_API_URL=http://localhost:3001' > apps/rag/.env.local
```

**Desacoplamento:** o microfrontend funciona com o backend fora do ar.

| Situação | O que acontece |
| --- | --- |
| `VITE_RAG_API_URL` não declarada | mock em memória desde a subida, com selo "modo demo" |
| API declarada mas fora do ar (ou carregando o modelo) na subida | `/health` não responde em 2,5 s → mock |
| API cai no meio da sessão | a busca mostra `NETWORK_ERROR` e oferece "Continuar em modo demo" |
| Remote `:5182` fora do ar | só a área dele mostra erro (`RemoteBoundary`); o portfólio continua navegável e "Tentar de novo" recupera |
| API muda o formato da resposta | Zod rejeita e a UI mostra `CONTRACT_MISMATCH` |

O mock usa 15 trechos **reais** do corpus (mesmos ids de chunk), o mesmo router de identificadores
(inclusive CNPJ alfanumérico) e abstenção, mas sem embeddings: os scores não são comparáveis com os da
API, e a UI diz isso. A API precisa liberar CORS para as origens do portfólio (`CORS_ORIGINS` do
rag-eval-harness; padrão 5180 e 5182).

Testes de ponta a ponta (Playwright, contra o dev em 5180/5182; os testes que precisam da API se pulam
sozinhos se ela estiver fora do ar):

```bash
pnpm --filter @portfolio/rag test:e2e
```

Cobrem navegação no portfólio, CSS isolado, busca semântica, CNPJ por busca exata, abstenção, top-k,
validação, histórico, aba de resultados, layout no celular e os quatro cenários de desacoplamento.

## Lagoski (microsserviços orientados a eventos)

Rota `/projetos/lagoski`. É o front de um sistema de **seis bounded contexts** em repositórios
separados ([lagoski-platform](https://github.com/wesleyplago/lagoski-platform) tem a lista, a spec e
os ADRs), integrados só por eventos na AWS (SNS + SQS) e no GCP (Pub/Sub). A página de arquitetura
fica em [`apps/portfolio/public/lagoski/arquitetura.html`](apps/portfolio/public/lagoski/arquitetura.html)
(servida em `/lagoski/arquitetura.html`).

Diferente do PayOps e do RAG, o Lagoski não é um remote só: são **quatro**, um por contexto com UI,
compostos pelo host na mesma página, cada um com build próprio e falha isolada.

| Remote | Contexto dono | O que faz |
| --- | --- | --- |
| `lagoski-catalog` | Catalog (+ estoque do Inventory) | coleção, cor, tamanho, disponível |
| `lagoski-checkout` | Ordering + Payment | carrinho, fechar pedido, pagamento no **Stripe Checkout** |
| `lagoski-orders` | Ordering + Fulfillment + Notification | pedidos, rastreio, e-mails |
| `lagoski-inspector` | plataforma | eventos do barramento ao vivo, filas por assinatura, cenários de falha |

Os remotes **não se importam**: conversam por eventos no navegador (`lagoski:cart-changed`,
`lagoski:order-placed`, `lagoski:focus-order`), como os serviços no backend. Como cada um é um bundle
separado, a conexão e a sessão (cliente guest + carrinho) ficam num registro global da aba
(`Symbol.for('lagoski.runtime')`): os quatro falam com o mesmo backend.

**Modo real ou demo** (decidido uma vez por aba, como no PayOps):

| Situação | O que acontece |
| --- | --- |
| `VITE_LAGOSKI_API_URL` não declarada | sistema simulado no navegador desde a subida |
| BFF declarado, `/api/health` não responde | sistema simulado ("BFF … fora do ar na subida") |
| BFF no ar | microsserviços de verdade; o Inspector recebe os eventos por **SSE**; o pagamento abre o **Stripe Checkout em modo de testes** e volta para a página |

O sistema simulado (`packages/lagoski-contracts/src/mock`) não é um stub de respostas: são os seis
serviços com as mesmas regras, **integrados só por um broker em memória** com tópicos, assinaturas com
filtro por tipo, fila por consumidor, latência aleatória (eventos fora de ordem), retry com backoff,
DLQ após 5 tentativas e inbox idempotente. O Inspector mostra os contadores de cada fila e tem os
cenários: zerar estoque, derrubar e religar um consumidor, mensagem envenenada (→ DLQ → reprocessar),
entrega duplicada e reserva vencida. O Stripe Checkout é simulado com os mesmos cartões de teste
(`4242…` aprova, `4000 0000 0000 0002` é recusado).

Para usar os serviços de verdade, suba o compose do `lagoski-platform` (inclui o `stripe listen`
descrito lá) e declare o BFF nos quatro remotes:

```bash
for app in catalog checkout orders inspector; do cp apps/lagoski-$app/.env.example apps/lagoski-$app/.env.local; done
```

Verificado localmente nos dois modos: no real, compra paga no Stripe sandbox com o cartão 4242 volta
para a página com o pedido confirmado, e o Inspector mostra a saga até `shipment.dispatched`; no demo,
as jornadas E2E abaixo.

## Decisões de microfrontend

| Decisão | Por quê |
| --- | --- |
| **Module Federation** (`@module-federation/vite`) | o remote é buildado e servido sozinho; o host só conhece a URL do `remoteEntry.js` (configurável em `VITE_PAYOPS_REMOTE_URL`) |
| **React e React DOM como `singleton`** | duas cópias de React quebram hooks; host e remote compartilham uma |
| **CSS isolado no remote** | tudo sob `.payops`, injetado pelo próprio componente; o host não carrega CSS do remote e nada vaza para o portfólio |
| **`RemoteBoundary` + `Suspense`** | se o remote cair, só a área dele mostra erro; o resto do portfólio continua. "Tentar de novo" recria o `lazy` (o React guarda a falha) |
| **`shareStrategy: 'loaded-first'` no host** | com o padrão, o build pré-carrega (`modulepreload` + `import()`) o `remoteEntry` de **todos** os remotes em **toda** página: a home baixava PayOps e RAG sem precisar e, com um remote fora do ar, qualquer página registrava erros. Agora cada remote só é buscado quando a rota dele abre |
| **Estilos do remote não herdam os do host** | o host tem regras globais (ex.: `code`); o remote redefine o que usa sob `.payops`, porque o tema dele é outro |
| **Contrato em pacote próprio** | `@portfolio/payops-contracts` valida toda resposta da API com Zod; se o backend mudar o formato, a UI mostra `CONTRACT_MISMATCH` em vez de quebrar silenciosamente |
| **Regras de formulário espelhadas, não duplicadas como autoridade** | o Zod do front dá feedback imediato (teto de R$ 100 mil, `cus_xxx`, UUID); o backend continua decidindo. A allowlist de Pix fica **só** no servidor, de propósito |

## Credenciais e limites

Não há URL nem chave padrão no código: sem variáveis, o front nem tenta falar com um backend.
No modo real, as duas chaves (`AGENT_API_KEY` e `APPROVER_SECRET`) ficam no browser **só porque
esta é uma demo local** em que você faz os dois papéis. Em produção, o canal humano seria outra
aplicação, atrás de SSO/MFA, e o agente nunca teria a chave do aprovador. O `.env.example` traz os
valores de demo do `docker-compose.yml` do payops-agent.

O backend libera CORS só para as origens do `CORS_ORIGINS` (padrão: 5180/5181).

## Verificação

| O quê | Como | Resultado |
| --- | --- | --- |
| Tipos | `pnpm typecheck` | limpo nos 3 pacotes |
| Contrato e mock | `pnpm test` (Vitest no `payops-contracts`) | 18/18: formulários, dinheiro e 8 testes do mock contra o schema da API |
| Build | `pnpm build` | host e remote buildam; `remoteEntry.js` ~25 kB |
| Fluxo em dev | cobrar → aprovar → repetir; ataque | concluído; replay devolve a mesma transação sem nova aprovação; documento em quarentena |
| Fluxo em produção (`vite preview`) | remote desligado, depois ligado + "Tentar de novo"; cobrar → negar | fallback isolado; remote carrega no retry; `APPROVAL_DENIED` |
| Seleção de modo | sem env; env + API no ar; env + API parada | mock ("não declarada"); real ("API real online"); mock ("fora do ar na subida") |
| Fluxo no mock | cobrar → aprovar → repetir | mesma transação, saldo não duplica, sem links de trace |
| Contrato e mock do Lagoski | `pnpm test` (Vitest no `lagoski-contracts`) | 8/8: caminho feliz até a entrega, cartão recusado + expiração, sem estoque, idempotência, DLQ + redrive, duplicata, consumidor parado |
| Jornadas E2E | `pnpm e2e` (Playwright, build de produção) | 43/43 (33 do PayOps/portfólio + 10 do Lagoski) |

## Testes E2E (Playwright)

```bash
pnpm --filter @portfolio/e2e exec playwright install chromium   # uma vez
pnpm e2e
```

A suíte em `e2e/` builda e serve o **build de produção** do host e dos remotes em portas próprias
(5280/5281/5282, sem conflito com o `pnpm dev`), com PayOps e RAG em **modo mock**: determinística
e sem backend. Também roda no CI, com o relatório anexado quando falha.

Todo teste falha se a página registrar **qualquer erro de console ou exceção não tratada**, salvo
no teste que derruba o remote de propósito.

| Área | Jornadas |
| --- | --- |
| Navegação | home e projetos; menu com item ativo; CTA e card levam à demo; voltar/avançar; deep link; 404 com volta; rota do RAG monta outro remote; páginas sem microfrontend não buscam nenhum remote |
| Cobrança | validação do formulário (valor, teto, `cus_xxx`) sem chamar o agente; espera o humano; aprovar lança no ledger; negar não move dinheiro; dois pedidos simultâneos |
| Idempotência | repetir com a mesma chave devolve a mesma transação, sem nova aprovação nem nova cobrança |
| Estorno | parcial passa; acima do capturado é bloqueado mesmo aprovado; ID inválido |
| Pix | destino permitido passa pelo humano; fora da allowlist é barrado antes |
| Consultas | saldos e faturas filtradas, sem aprovação |
| Prompt injection | os 5 ataques: documento em quarentena e só a ação pedida |
| Isolamento | remote fora do ar só afeta a área dele e "Tentar de novo" recupera; remote roda sozinho; estado do mock não vaza entre carregamentos |
| Acessibilidade | axe (WCAG 2 A/AA) sem violações sérias na home e na demo, temas claro e escuro |
| Mobile (Pixel 7) | sem rolagem horizontal; jornada de cobrança completa; compra no Lagoski |
| Lagoski | caminho feliz até `DELIVERED` com a saga no Inspector e e-mails; cartão recusado + checkout expirado libera estoque; sem estoque não aciona o Payment; mensagem envenenada → DLQ → reprocessar; consumidor parado acumula e recupera; duplicata ignorada pelo inbox; remote fora do ar isolado; axe nos dois temas |

Bugs que a suíte encontrou e foram corrigidos:

1. **O host buscava todos os remotes em toda página** (11 requisições por remote, repetidas, com
   erro de console se um estivesse fora do ar). Corrigido com `shareStrategy: 'loaded-first'`.
2. **CSS do host vazando no remote:** o `code` global do portfólio pintava o banner do PayOps com
   texto cinza sobre azul-claro (contraste insuficiente).
3. **Contraste abaixo de WCAG AA:** o azul de destaque com texto branco (3,2:1 no PayOps; 2,9:1 nos
   botões do portfólio no tema escuro; 4,25:1 no texto de destaque claro). Novos tokens de botão
   com 5,2–5,9:1.

## Adicionando outro microfrontend

1. Crie `apps/<nome>` com `federation({ name: '<nome>', filename: 'remoteEntry.js', exposes: { './App': './src/App.tsx' }, shared: { react, 'react-dom' } })`.
2. No host, adicione o remote em `apps/portfolio/vite.config.ts`, o tipo em `src/remotes.d.ts` e uma rota com `lazy(() => import('<nome>/App'))` dentro de `RemoteBoundary`.
3. Adicione o projeto em `apps/portfolio/src/content/projects.ts`.
