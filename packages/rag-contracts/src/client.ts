import { z } from 'zod';
import {
  ApiErrorSchema,
  HealthSchema,
  SearchRequestSchema,
  SearchResponseSchema,
  type Health,
  type SearchRequest,
  type SearchResponse,
} from './schemas';

export class RagApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'RagApiError';
  }
}

/**
 * Porta única do microfrontend para a API de busca. Há duas implementações:
 * HTTP real (createRagClient) e em memória (createMockRagClient), com o mesmo
 * contrato. A UI não sabe qual está usando, só lê `mode` para o selo.
 */
export interface RagClient {
  readonly mode: 'live' | 'mock';
  /** Descreve de onde vêm os resultados, para mostrar na UI. */
  readonly source: string;
  ready(): Promise<boolean>;
  health(): Promise<Health>;
  search(request: SearchRequest): Promise<SearchResponse>;
}

export type RagClientConfig = {
  baseUrl: string;
  /** A primeira busca carrega o modelo de embeddings; não espere para sempre. */
  timeoutMs?: number;
};

async function parseJson<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const err = ApiErrorSchema.safeParse(body);
    throw err.success
      ? new RagApiError(err.data.error, err.data.message ?? err.data.error, response.status)
      : new RagApiError('HTTP_ERROR', `HTTP ${response.status}`, response.status);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new RagApiError('CONTRACT_MISMATCH', z.prettifyError(parsed.error), response.status);
  }
  return parsed.data;
}

export function createRagClient(config: RagClientConfig): RagClient {
  const base = config.baseUrl.replace(/\/$/, '');
  const timeoutMs = config.timeoutMs ?? 30_000;

  const request = async (path: string, init?: RequestInit): Promise<Response> => {
    try {
      return await fetch(`${base}${path}`, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new RagApiError('NETWORK_ERROR', `API inacessível: ${message}`, 0);
    }
  };

  return {
    mode: 'live',
    source: `API rag-eval-harness em ${base} (hybrid + router + abstenção)`,

    async ready() {
      try {
        const health = await this.health();
        return health.ready;
      } catch {
        return false;
      }
    },

    async health() {
      return parseJson(await request('/health'), HealthSchema);
    },

    async search(input) {
      const body = SearchRequestSchema.parse(input);
      const response = await request('/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      return parseJson(response, SearchResponseSchema);
    },
  };
}
