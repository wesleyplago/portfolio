import { z } from 'zod';
import {
  AddMercadoLivreInputSchema,
  AddShopeeInputSchema,
  ApiErrorSchema,
  ClickEventSchema,
  FunnelReportSchema,
  LoginRequestSchema,
  ProductPageSchema,
  ProductSchema,
  ReadySchema,
  SessionSchema,
  type AddMercadoLivreInput,
  type AddShopeeInput,
  type ClickEvent,
  type FunnelReport,
  type LoginRequest,
  type Product,
  type ProductPage,
  type ProductQuery,
  type ProductStatus,
  type Session,
} from './schemas';

export class VitrineApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'VitrineApiError';
  }
}

/** Operações do backoffice: todas exigem o token devolvido por `login`. */
export interface VitrineAdmin {
  listProducts(token: string): Promise<ProductPage>;
  setStatus(token: string, productId: string, status: ProductStatus): Promise<Product>;
  addShopee(token: string, input: AddShopeeInput): Promise<Product>;
  addMercadoLivre(token: string, input: AddMercadoLivreInput): Promise<Product>;
  funnel(token: string): Promise<FunnelReport>;
}

/**
 * Porta única do microfrontend para a vitrine-api. Há duas implementações com o
 * mesmo contrato: HTTP (createVitrineClient) e em memória (createMockVitrineClient).
 * A UI só lê `mode` para o selo.
 */
export interface VitrineClient {
  readonly mode: 'live' | 'mock';
  readonly source: string;
  ready(): Promise<boolean>;
  listProducts(query?: ProductQuery): Promise<ProductPage>;
  getProduct(slug: string): Promise<Product>;
  /** Registra o clique sem ficar entre o cliente e a loja (sendBeacon). Nunca lança. */
  trackClick(event: ClickEvent): void;
  /** Login do único usuário admin. As credenciais ficam no backend, nunca no bundle. */
  login(input: LoginRequest): Promise<Session>;
  readonly admin: VitrineAdmin;
}

export type VitrineClientConfig = { baseUrl: string; timeoutMs?: number };

async function parseJson<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const err = ApiErrorSchema.safeParse(body);
    throw err.success
      ? new VitrineApiError(err.data.error, err.data.message ?? err.data.error, response.status)
      : new VitrineApiError('HTTP_ERROR', `HTTP ${response.status}`, response.status);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new VitrineApiError('CONTRACT_MISMATCH', z.prettifyError(parsed.error), response.status);
  }
  return parsed.data;
}

export function createVitrineClient(config: VitrineClientConfig): VitrineClient {
  const base = config.baseUrl.replace(/\/$/, '');
  const timeoutMs = config.timeoutMs ?? 10_000;

  const request = async (path: string, init: RequestInit = {}, token?: string): Promise<Response> => {
    const headers = new Headers(init.headers);
    if (init.body) headers.set('content-type', 'application/json');
    if (token) headers.set('authorization', `Bearer ${token}`);
    try {
      return await fetch(`${base}${path}`, { ...init, headers, signal: AbortSignal.timeout(timeoutMs) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new VitrineApiError('NETWORK_ERROR', `API inacessível: ${message}`, 0);
    }
  };
  const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

  return {
    mode: 'live',
    source: `vitrine-api em ${base}`,

    async ready() {
      try {
        return (await parseJson(await request('/readyz'), ReadySchema)).ready;
      } catch {
        return false;
      }
    },

    async listProducts(query = {}) {
      const params = new URLSearchParams();
      if (query.q) params.set('q', query.q);
      if (query.store) params.set('store', query.store);
      const qs = params.size ? `?${params}` : '';
      return parseJson(await request(`/v1/products${qs}`), ProductPageSchema);
    },

    async getProduct(slug) {
      return parseJson(await request(`/v1/products/${encodeURIComponent(slug)}`), ProductSchema);
    },

    trackClick(event) {
      const body = JSON.stringify(ClickEventSchema.parse(event));
      try {
        navigator.sendBeacon(`${base}/v1/clicks`, new Blob([body], { type: 'application/json' }));
      } catch {
        // Perder um clique na contagem é aceitável; atrasar a ida à loja não é.
      }
    },

    async login(input) {
      const body = LoginRequestSchema.parse(input);
      return parseJson(await request('/admin/v1/login', json('POST', body)), SessionSchema);
    },

    admin: {
      async listProducts(token) {
        return parseJson(await request('/admin/v1/products', {}, token), ProductPageSchema);
      },
      async setStatus(token, productId, status) {
        const path = `/admin/v1/products/${encodeURIComponent(productId)}`;
        return parseJson(await request(path, json('PATCH', { status }), token), ProductSchema);
      },
      async addShopee(token, input) {
        const body = AddShopeeInputSchema.parse(input);
        return parseJson(await request('/admin/v1/products/shopee', json('POST', body), token), ProductSchema);
      },
      async addMercadoLivre(token, input) {
        const body = AddMercadoLivreInputSchema.parse(input);
        return parseJson(await request('/admin/v1/products/ml', json('POST', body), token), ProductSchema);
      },
      async funnel(token) {
        return parseJson(await request('/admin/v1/reports/funnel', {}, token), FunnelReportSchema);
      },
    },
  };
}
