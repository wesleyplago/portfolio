import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRagClient, RagApiError } from './client';
import { FIXTURE_CHUNKS } from './fixture';
import { createMockRagClient, detectIdentifier } from './mock';
import { SearchRequestSchema, SearchResponseSchema } from './schemas';

/** Respostas reais de POST /search do rag-eval-harness (2026-11-16), conteúdo cortado. */
const LIVE_ANSWER = {
  query: 'Quais sao as modalidades de arranjos de pagamento?',
  abstained: false,
  reason: 'ok',
  topScore: 0.032266458495966696,
  results: [
    {
      chunkId: 2028611514,
      score: 0.032266458495966696,
      sectionPath: 'CAPÍTULO IV — DOS ARRANJOS DE PAGAMENTO > Seção I — Das Modalidades',
      documentSlug: 'arranjos-pagamento',
      documentTitle: 'Resolução BCB N° 150',
      content: 'CAPÍTULO IV — DOS ARRANJOS DE PAGAMENTO > Seção I — Das Modalidades\n\nArt. 8º',
      isTable: false,
    },
  ],
};
const LIVE_ABSTAIN = {
  query: 'bolo de cenoura',
  abstained: true,
  reason: 'below_threshold',
  topScore: 0.01639344262295082,
  results: [],
};

describe('schemas accept what the real API returns', () => {
  it.each([LIVE_ANSWER, LIVE_ABSTAIN])('parses a recorded response', (sample) => {
    expect(SearchResponseSchema.safeParse(sample).success).toBe(true);
  });

  it('mirrors the API body rules', () => {
    expect(SearchRequestSchema.safeParse({ query: 'x' }).success).toBe(false);
    expect(SearchRequestSchema.safeParse({ query: 'pix', k: 51 }).success).toBe(false);
    expect(SearchRequestSchema.parse({ query: '  pix  ' })).toEqual({ query: 'pix', k: 5 });
  });
});

describe('mock client keeps the contract and the observable behavior', () => {
  const mock = createMockRagClient({ latencyMs: 0 });

  it('returns schema-valid answers for a topic in the corpus', async () => {
    const response = await mock.search({ query: 'Como funciona o Mecanismo Especial de Devolução?' });
    expect(SearchResponseSchema.parse(response).abstained).toBe(false);
    expect(response.results[0]?.sectionPath).toContain('Mecanismo Especial de Devolução');
  });

  it('routes an alphanumeric CNPJ to exact lookup with score 1', async () => {
    const response = await mock.search({ query: 'O valor 12ABC34501DE35 é qual tipo de chave Pix?', k: 3 });
    expect(response.results[0]).toMatchObject({ chunkId: 126412780, score: 1 });
  });

  it('abstains on a question outside the corpus', async () => {
    const response = await mock.search({ query: 'Qual é a receita de bolo de cenoura?' });
    expect(response).toMatchObject({ abstained: true, results: [] });
  });

  it('only serves real chunk ids from the corpus fixture', () => {
    expect(FIXTURE_CHUNKS.length).toBeGreaterThan(10);
    expect(new Set(FIXTURE_CHUNKS.map((c) => c.chunkId)).size).toBe(FIXTURE_CHUNKS.length);
  });

  it('detects identifiers like the backend router', () => {
    expect(detectIdentifier('cnpj 12.abc.345/01de-35')).toEqual({ kind: 'cnpj', value: '12ABC34501DE35' });
    expect(detectIdentifier('código 12ABC34501DE99')).toBeNull();
    expect(detectIdentifier('Como funciona o bloqueio cautelar?')).toBeNull();
  });
});

describe('HTTP client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('turns a changed response shape into CONTRACT_MISMATCH', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ hits: [] }), { status: 200 }));
    const client = createRagClient({ baseUrl: 'http://api.test' });
    await expect(client.search({ query: 'pix' })).rejects.toMatchObject({ code: 'CONTRACT_MISMATCH' });
  });

  it('turns a refused connection into NETWORK_ERROR', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('fetch failed');
    });
    const client = createRagClient({ baseUrl: 'http://api.test' });
    const error = await client.search({ query: 'pix' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RagApiError);
    expect(error).toMatchObject({ code: 'NETWORK_ERROR' });
    expect(await client.ready()).toBe(false);
  });
});
