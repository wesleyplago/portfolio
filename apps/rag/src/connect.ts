import { createMockRagClient, createRagClient, type RagClient } from '@portfolio/rag-contracts';
import { config } from './config';

export type Connection = {
  client: RagClient;
  /** Por que estamos em modo mock (ausente no modo real). */
  reason?: string;
};

async function probe(client: RagClient, timeoutMs: number): Promise<boolean> {
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs));
  return Promise.race([client.ready(), timeout]);
}

/**
 * Decide na subida qual implementação usar:
 * API declarada + /health com `ready: true` → real; qualquer outra coisa → mock.
 * A busca não tem estado, então a UI pode trocar para o mock depois, se a API
 * cair no meio da sessão (ver `fallbackToMock`).
 */
export async function connect(): Promise<Connection> {
  const { apiUrl } = config;
  if (!apiUrl) return { client: createMockRagClient(), reason: 'VITE_RAG_API_URL não declarada' };
  const live = createRagClient({ baseUrl: apiUrl, timeoutMs: config.searchTimeoutMs });
  if (await probe(live, config.probeTimeoutMs)) return { client: live };
  return { client: createMockRagClient(), reason: `API ${apiUrl} fora do ar ou ainda carregando o modelo` };
}

export function fallbackToMock(why: string): Connection {
  return { client: createMockRagClient(), reason: why };
}
