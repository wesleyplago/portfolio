# portfolio

Meu portfólio pessoal, em React + TypeScript + Zod, organizado como **monorepo de
microfrontends**. O portfólio é o app **host**; cada projeto com demo ao vivo é um app
**remote**, buildado e servido separadamente e carregado em runtime via
**Module Federation**.

O primeiro microfrontend é o console do [payops-agent](https://github.com/wesleyplago/payops-agent):
uma interface para usar o agente de pagamentos sem terminal.

```text
portfolio/                         monorepo pnpm
├── apps/
│   ├── portfolio/   (host)        :5180  páginas do portfólio + rota /projetos/payops
│   └── payops/      (remote)      :5181  expõe `payops/App` em remoteEntry.js; também roda sozinho
└── packages/
    └── payops-contracts/          schemas Zod + cliente tipado da API do payops-agent
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
                                                          │ fetch + Zod
                                                          ▼
                         payops-agent API  localhost:3000  (docker compose)
```

## Rodando

Pré-requisitos: Node 20+, pnpm, e o backend do payops-agent no ar:

```bash
cd ../deepseek-harness/default-workspace/payops-agent && docker compose up -d
```

No monorepo:

```bash
pnpm install
pnpm dev
```

Abra **http://localhost:5180**. O PayOps também roda sozinho em http://localhost:5181.

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

## Decisões de microfrontend

| Decisão | Por quê |
| --- | --- |
| **Module Federation** (`@module-federation/vite`) | o remote é buildado e servido sozinho; o host só conhece a URL do `remoteEntry.js` (configurável em `VITE_PAYOPS_REMOTE_URL`) |
| **React e React DOM como `singleton`** | duas cópias de React quebram hooks; host e remote compartilham uma |
| **CSS isolado no remote** | tudo sob `.payops`, injetado pelo próprio componente; o host não carrega CSS do remote e nada vaza para o portfólio |
| **`RemoteBoundary` + `Suspense`** | se o remote cair, só a área dele mostra erro; o resto do portfólio continua. "Tentar de novo" recria o `lazy` (o React guarda a falha) |
| **Contrato em pacote próprio** | `@portfolio/payops-contracts` valida toda resposta da API com Zod; se o backend mudar o formato, a UI mostra `CONTRACT_MISMATCH` em vez de quebrar silenciosamente |
| **Regras de formulário espelhadas, não duplicadas como autoridade** | o Zod do front dá feedback imediato (teto de R$ 100 mil, `cus_xxx`, UUID); o backend continua decidindo. A allowlist de Pix fica **só** no servidor, de propósito |

## Credenciais e limites

As duas chaves (`AGENT_API_KEY` e `APPROVER_SECRET`) ficam no browser **só porque esta é uma demo
local** em que você faz os dois papéis. Em produção, o canal humano seria outra aplicação, atrás
de SSO/MFA, e o agente nunca teria a chave do aprovador. Os valores padrão são os de demo do
`docker-compose.yml` do payops-agent; para outros, copie `apps/payops/.env.example` para `.env`.

O backend libera CORS só para as origens do `CORS_ORIGINS` (padrão: 5180/5181).

## Verificação

| O quê | Como | Resultado |
| --- | --- | --- |
| Tipos | `pnpm typecheck` | limpo nos 3 pacotes |
| Contrato | `pnpm test` (Vitest no `payops-contracts`) | 10/10 |
| Build | `pnpm build` | host e remote buildam; `remoteEntry.js` ~25 kB |
| Fluxo em dev | cobrar → aprovar → repetir; ataque | concluído; replay devolve a mesma transação sem nova aprovação; documento em quarentena |
| Fluxo em produção (`vite preview`) | remote desligado, depois ligado + "Tentar de novo"; cobrar → negar | fallback isolado; remote carrega no retry; `APPROVAL_DENIED` |

## Adicionando outro microfrontend

1. Crie `apps/<nome>` com `federation({ name: '<nome>', filename: 'remoteEntry.js', exposes: { './App': './src/App.tsx' }, shared: { react, 'react-dom' } })`.
2. No host, adicione o remote em `apps/portfolio/vite.config.ts`, o tipo em `src/remotes.d.ts` e uma rota com `lazy(() => import('<nome>/App'))` dentro de `RemoteBoundary`.
3. Adicione o projeto em `apps/portfolio/src/content/projects.ts`.
