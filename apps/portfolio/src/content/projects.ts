export type Project = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  stack: string[];
  highlights: string[];
  repo: string;
  /** Rota interna com demo ao vivo (microfrontend), quando existir. */
  demoPath?: string;
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
  },
];
