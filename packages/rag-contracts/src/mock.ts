/**
 * Cliente em memória que reproduz o contrato de POST /search do rag-eval-harness.
 *
 * Usado quando a API não está declarada ou está fora do ar: o microfrontend
 * continua utilizável, com o mesmo formato de resposta e os mesmos
 * comportamentos observáveis:
 *
 * - router de identificadores: CNPJ (numérico ou alfanumérico, com dígito
 *   verificador), TXID e linha digitável vão para busca exata (score 1);
 * - abstenção: abaixo do limiar, `abstained: true` e nenhum resultado;
 * - validação do corpo igual à da API (2–500 caracteres, k entre 1 e 50).
 *
 * Não é o backend: busca só em ~15 trechos reais do corpus (fixture.ts) com um
 * BM25 simplificado, sem embeddings nem RRF. Os scores não são comparáveis com
 * os da API real; a UI deixa isso explícito.
 */
import type { RagClient } from './client';
import { FIXTURE_CHUNKS, type FixtureChunk } from './fixture';
import { SearchRequestSchema, type SearchHit, type SearchResponse } from './schemas';

export type MockRagOptions = {
  /** Latência artificial, para a UI se comportar como na rede. */
  latencyMs?: number;
  /** Limiar de abstenção na escala do mock (BM25 normalizado em 0–1). */
  threshold?: number;
  chunks?: FixtureChunk[];
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/* --------------------------- router (espelho) --------------------------- */

export const cnpjCheckDigits = (base: string): string => {
  const weights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const digit = (value: string, w: number[]): number => {
    let total = 0;
    for (let i = 0; i < value.length; i += 1) total += (value.charCodeAt(i) - 48) * (w[i] ?? 0);
    const rest = total % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const first = digit(base, weights);
  return `${first}${digit(`${base}${first}`, [6, ...weights])}`;
};

export type Identifier = { kind: 'cnpj' | 'txid' | 'linha-digitavel'; value: string };

/** Mesma ordem e regras de src/retrieval/router.ts do backend. */
export function detectIdentifier(query: string): Identifier | null {
  for (const candidate of query.match(/(?:\d[\s.-]?){47,48}/g) ?? []) {
    const digits = candidate.replace(/\D/g, '');
    if (digits.length === 47 || digits.length === 48) return { kind: 'linha-digitavel', value: digits };
  }
  const masked = query.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
  if (masked) return { kind: 'cnpj', value: masked[0].replace(/\D/g, '') };
  const bare = query.match(/(?<!\d)\d{14}(?!\d)/);
  if (bare) return { kind: 'cnpj', value: bare[0] };
  const alnum =
    /(?<![A-Za-z0-9])([A-Za-z0-9]{2})\.?([A-Za-z0-9]{3})\.?([A-Za-z0-9]{3})\/?([A-Za-z0-9]{4})-?(\d{2})(?![A-Za-z0-9])/g;
  for (const match of query.matchAll(alnum)) {
    const base = `${match[1]}${match[2]}${match[3]}${match[4]}`.toUpperCase();
    if (/[A-Z]/.test(base) && cnpjCheckDigits(base) === match[5]) return { kind: 'cnpj', value: `${base}${match[5]}` };
  }
  for (const candidate of query.match(/\b[A-Za-z0-9]{26,35}\b/g) ?? []) {
    if (/[A-Za-z]/.test(candidate) && /\d/.test(candidate)) return { kind: 'txid', value: candidate.toUpperCase() };
  }
  return null;
}

/* ----------------------------- BM25 simples ----------------------------- */

const STOPWORDS = new Set(
  'a o as os de da do das dos e em no na nos nas um uma uns umas para por com sem que qual quais como quando onde se ao aos à às é são foi ser ou mais menos sobre entre seu sua seus suas pelo pela pelos pelas este esta isso este essa esse'.split(
    ' ',
  ),
);

export const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token))
    // Radical grosseiro: "devoluções" e "devolução" contam como o mesmo termo.
    .map((token) => token.slice(0, 7));

type Indexed = { chunk: FixtureChunk; tf: Map<string, number>; length: number };

function buildIndex(chunks: FixtureChunk[]) {
  const docs: Indexed[] = chunks.map((chunk) => {
    const tokens = tokenize(`${chunk.sectionPath} ${chunk.content}`);
    const tf = new Map<string, number>();
    for (const token of tokens) tf.set(token, (tf.get(token) ?? 0) + 1);
    return { chunk, tf, length: tokens.length };
  });
  const avgLength = docs.reduce((sum, doc) => sum + doc.length, 0) / Math.max(1, docs.length);
  const df = new Map<string, number>();
  for (const doc of docs) for (const token of doc.tf.keys()) df.set(token, (df.get(token) ?? 0) + 1);
  const idf = (token: string) => {
    const n = df.get(token) ?? 0;
    return Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
  };
  return { docs, avgLength, idf };
}

/* -------------------------------- cliente ------------------------------- */

export function createMockRagClient(options: MockRagOptions = {}): RagClient {
  const latencyMs = options.latencyMs ?? 250;
  const threshold = options.threshold ?? 0.3;
  const chunks = options.chunks ?? FIXTURE_CHUNKS;
  const index = buildIndex(chunks);
  const compact = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const lexical = (query: string): SearchHit[] => {
    const terms = [...new Set(tokenize(query))];
    if (terms.length === 0) return [];
    const k1 = 1.2;
    const b = 0.75;
    // Normaliza pela melhor pontuação possível da própria pergunta, para ficar em 0–1.
    const ceiling = terms.reduce((sum, term) => sum + index.idf(term) * (k1 + 1), 0);
    return index.docs
      .map((doc) => {
        let score = 0;
        for (const term of terms) {
          const tf = doc.tf.get(term) ?? 0;
          if (tf === 0) continue;
          score += (index.idf(term) * tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * doc.length) / index.avgLength));
        }
        return { ...doc.chunk, score: ceiling > 0 ? score / ceiling : 0 };
      })
      .filter((hit) => hit.score > 0)
      .sort((x, y) => y.score - x.score || x.chunkId - y.chunkId);
  };

  return {
    mode: 'mock',
    source: `mock em memória: ${chunks.length} trechos reais do corpus, BM25 simplificado, sem embeddings`,

    async ready() {
      return true;
    },

    async health() {
      return { status: 'ok', ready: true, model: 'mock:bm25-lite', uptimeSeconds: 0 };
    },

    async search(input): Promise<SearchResponse> {
      const { query, k } = SearchRequestSchema.parse(input);
      await sleep(latencyMs);

      const identifier = detectIdentifier(query);
      const exact = identifier
        ? chunks
            .filter((chunk) => compact(chunk.content).includes(compact(identifier.value)))
            .map((chunk): SearchHit => ({ ...chunk, score: 1 }))
        : [];
      const seen = new Set(exact.map((hit) => hit.chunkId));
      const hits = [...exact, ...lexical(query).filter((hit) => !seen.has(hit.chunkId))].slice(0, k);

      const top = hits[0];
      if (!top) return { query, abstained: true, reason: 'no_results', topScore: null, results: [] };
      if (top.score < threshold) {
        return { query, abstained: true, reason: 'below_threshold', topScore: top.score, results: [] };
      }
      return { query, abstained: false, reason: 'ok', topScore: top.score, results: hits };
    },
  };
}
