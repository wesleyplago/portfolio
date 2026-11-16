import { createMockPayOpsClient, createPayOpsClient, type PayOpsClient } from '@portfolio/payops-contracts';
import { config } from './config';

export type Connection = {
  client: PayOpsClient;
  /** Por que estamos em modo mock (ausente no modo real). */
  reason?: string;
};

async function probe(client: PayOpsClient, timeoutMs: number): Promise<boolean> {
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs));
  return Promise.race([client.ready(), timeout]);
}

/**
 * Decide uma vez, na subida, qual implementação usar:
 * API declarada + chaves + /readyz respondendo → real; qualquer outra coisa → mock.
 * Não troca no meio da sessão: misturar estado real e simulado confundiria o histórico.
 */
export async function connect(): Promise<Connection> {
  const { apiUrl, agentKey, approverKey } = config;
  if (!apiUrl) return { client: createMockPayOpsClient(), reason: 'VITE_PAYOPS_API_URL não declarada' };
  if (!agentKey || !approverKey) {
    return { client: createMockPayOpsClient(), reason: 'chaves da API não declaradas (VITE_PAYOPS_AGENT_KEY / VITE_PAYOPS_APPROVER_KEY)' };
  }
  const live = createPayOpsClient({ baseUrl: apiUrl, agentKey, approverKey });
  if (await probe(live, config.probeTimeoutMs)) return { client: live };
  return { client: createMockPayOpsClient(), reason: `API ${apiUrl} fora do ar na subida` };
}
