import type { BrandId } from '@portfolio/brands';

export type Project = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  stack: string[];
  highlights: string[];
  /** Ausente quando o código não é público: o botão "Ver o código" não aparece. */
  repo?: string;
  /** Rota interna da demo ao vivo (microfrontend). */
  demoPath: string;
  /** Marca do app, aplicada na capa da página. */
  brand: BrandId;
  metric: { value: string; label: string };
  /** Os três passos de "como usar a demo". */
  guide: [string, string, string];
  /** Nome-base da captura de tela (assets/shots/{shot}-frame.jpg), usado a partir da Task 9. */
  shot: string;
};

export const projects: Project[] = [
  {
    slug: 'payops',
    name: 'payops-agent',
    tagline: 'Agente de pagamentos com raio de explosão controlado',
    description:
      'Um agente de IA que cobra, estorna e manda Pix, e a prova de que ele não cobra duas vezes, não quebra a contabilidade e não é manipulado por prompt injection, mesmo com falha injetada.',
    stack: ['Node 20', 'TypeScript', 'Hono', 'Postgres 16', 'Knex', 'Zod', 'Vitest', 'OpenTelemetry', 'Jaeger', 'Docker'],
    highlights: [
      '1.000 execuções de caos: 0 cobranças duplicadas, 0 violações do invariante',
      '0/120 ataques de prompt injection, inclusive com o modelo forçado a atacar',
      'Aprovação humana por token de uso único, amarrado à ação exata',
    ],
    repo: 'https://github.com/wesleyplago/payops-agent',
    demoPath: '/projetos/payops',
    brand: 'payops',
    metric: { value: '0/120', label: 'ataques de prompt injection que passaram' },
    guide: ['Peça ao agente um estorno de R$ 50', 'Aprove ou recuse como operador, à direita', 'Confira a operação no log de auditoria'],
    shot: 'payops',
  },
  {
    slug: 'rag-eval-harness',
    name: 'rag-eval-harness',
    tagline: 'Bancada de avaliação de RAG sobre regulação de pagamentos',
    description:
      'Mede quanto o retrieval melhora de BM25 para busca densa, híbrida e com rerank, com intervalo de confiança, custo e latência, sobre documentos públicos do Banco Central.',
    stack: ['TypeScript', 'Postgres', 'pgvector', 'bge-m3', 'Hono', 'Vitest', 'Docker'],
    highlights: [
      'recall@10: BM25 0,43 → dense 0,82',
      'Router de identificadores (CNPJ, TXID, linha digitável) com busca exata',
      'CI que falha se o recall cair mais de 2 pontos',
    ],
    repo: 'https://github.com/wesleyplago/rag-eval-harness',
    demoPath: '/projetos/rag',
    brand: 'rag',
    metric: { value: '0,43 → 0,82', label: 'recall@10 de BM25 para busca densa' },
    guide: ['Busque um termo da regulação do Pix', 'Compare os quatro métodos lado a lado', 'Abra o benchmark com intervalos de confiança'],
    shot: 'rag',
  },
  {
    slug: 'lagoski',
    name: 'Lagoski',
    tagline: 'Bounded contexts em microsserviços orientados a eventos, na AWS e no GCP',
    description:
      'Uma loja de camisetas dividida em seis bounded contexts que só conversam por eventos: SNS + SQS na AWS, Pub/Sub no GCP, com o mesmo código. Cada serviço tem repositório e Terraform próprios, e o pagamento usa o Stripe atrás de uma Anti-Corruption Layer.',
    stack: ['TypeScript', 'Fastify', 'Postgres', 'SNS/SQS', 'Pub/Sub', 'Terraform', 'Stripe', 'Module Federation'],
    highlights: [
      'Saga por coreografia com outbox, inbox idempotente, retry e DLQ',
      'Mesma imagem na AWS (pull) e no GCP (push), escolhida por configuração',
      'Quatro microfrontends, um por contexto, e um Event Inspector ao vivo',
    ],
    repo: 'https://github.com/wesleyplago/lagoski-platform',
    demoPath: '/projetos/lagoski',
    brand: 'lagoski',
    metric: { value: '6', label: 'bounded contexts que só conversam por eventos' },
    guide: ['Escolha uma camiseta e um tamanho', 'Feche o pedido e pague', 'Acompanhe os eventos no Event Inspector'],
    shot: 'lagoski',
  },
  {
    slug: 'vitrine',
    name: 'Vitrine de afiliados',
    tagline: 'Vitrine de ofertas da Shopee e do Mercado Livre, com backoffice',
    description:
      'Vitrine de ofertas da Shopee e do Mercado Livre com links de afiliado, e um backoffice para cadastrar produtos e acompanhar cliques e pedidos.',
    stack: ['TypeScript', 'React', 'Module Federation'],
    highlights: [
      'Ofertas de dois marketplaces na mesma vitrine',
      'Backoffice com login de admin para cadastrar produtos',
      'Cliques e pedidos acompanhados no painel',
    ],
    demoPath: '/projetos/vitrine',
    brand: 'vitrine',
    metric: { value: '2', label: 'marketplaces na mesma vitrine' },
    guide: ['Abra uma oferta da Shopee ou do Mercado Livre', 'Entre no backoffice como admin', 'Cadastre um produto e veja-o na vitrine'],
    shot: 'vitrine',
  },
];
