import { createMockVitrineClient, createVitrineClient, type VitrineClient } from '@portfolio/vitrine-contracts';

const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);
const API_URL = clean(import.meta.env.VITE_VITRINE_API_URL);
const PROBE_TIMEOUT_MS = 2_500;

export type Connection = {
  client: VitrineClient;
  /** Por que estamos em modo mock (ausente no modo real). */
  reason?: string;
};

/**
 * Decide uma vez, na subida: API declarada + /readyz ok → real; qualquer outra
 * coisa → mock. Não troca no meio da sessão porque o backoffice tem estado
 * (sessão de login, produtos recém-cadastrados).
 */
export async function connect(): Promise<Connection> {
  if (!API_URL) return { client: createMockVitrineClient(), reason: 'VITE_VITRINE_API_URL não declarada' };
  const live = createVitrineClient({ baseUrl: API_URL });
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), PROBE_TIMEOUT_MS));
  if (await Promise.race([live.ready(), timeout])) return { client: live };
  return { client: createMockVitrineClient(), reason: `API ${API_URL} fora do ar na subida` };
}
