import { z } from 'zod';
import {
  ApiErrorSchema,
  CartSchema,
  NotificationListSchema,
  ObservedEventSchema,
  OrderListSchema,
  OrderSchema,
  ProductListSchema,
  RecentEventsSchema,
  StockItemSchema,
  StockListSchema,
  type Cart,
  type Notification,
  type ObservedEvent,
  type Order,
  type Product,
  type StockItem,
} from './schemas';
import type { Simulator } from './mock/simulator';

export class LagoskiApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'LagoskiApiError';
  }
}

/**
 * Porta única dos microfrontends para o backend Lagoski. Duas implementações:
 * HTTP + SSE no lagoski-bff (createLagoskiClient) e o sistema inteiro simulado
 * em memória (createMockLagoskiClient). A UI só lê `mode` para o selo.
 */
export interface LagoskiClient {
  readonly mode: 'live' | 'mock';
  readonly source: string;
  ready(): Promise<boolean>;
  listProducts(): Promise<Product[]>;
  createCart(customerId: string): Promise<Cart>;
  getCart(id: string): Promise<Cart>;
  addItem(cartId: string, sku: string, quantity: number): Promise<Cart>;
  removeItem(cartId: string, sku: string): Promise<Cart>;
  placeOrder(cartId: string): Promise<Order>;
  getOrder(id: string): Promise<Order>;
  listOrders(customerId: string): Promise<Order[]>;
  getStock(skus: string[]): Promise<StockItem[]>;
  setStock(sku: string, onHand: number): Promise<StockItem>;
  listNotifications(customerId: string): Promise<Notification[]>;
  recentEvents(): Promise<ObservedEvent[]>;
  /** Todo evento que passa pelo barramento (observer do BFF). Devolve a função de cancelar. */
  subscribe(listener: (event: ObservedEvent) => void): () => void;
  /** Só no modo demo: controles do barramento simulado e do checkout simulado. */
  readonly simulator?: Simulator;
}

async function parse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const err = ApiErrorSchema.safeParse(body);
    throw err.success
      ? new LagoskiApiError(err.data.error, err.data.message ?? err.data.error, response.status)
      : new LagoskiApiError('HTTP_ERROR', `HTTP ${response.status}`, response.status);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new LagoskiApiError('CONTRACT_MISMATCH', z.prettifyError(parsed.error), response.status);
  return parsed.data;
}

export function createLagoskiClient(config: { baseUrl: string; timeoutMs?: number }): LagoskiClient {
  const base = config.baseUrl.replace(/\/$/, '');
  const timeoutMs = config.timeoutMs ?? 10_000;
  const enc = encodeURIComponent;

  const call = async <T>(path: string, schema: z.ZodType<T>, init?: { method?: string; body?: unknown }): Promise<T> => {
    let response: Response;
    try {
      response = await fetch(`${base}/api${path}`, {
        method: init?.method ?? 'GET',
        headers: init?.body === undefined ? undefined : { 'content-type': 'application/json' },
        body: init?.body === undefined ? undefined : JSON.stringify(init.body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error: unknown) {
      throw new LagoskiApiError('NETWORK_ERROR', `BFF inacessível: ${error instanceof Error ? error.message : String(error)}`, 0);
    }
    return parse(response, schema);
  };

  // Uma conexão SSE compartilhada por todos os ouvintes desta aba.
  const listeners = new Set<(e: ObservedEvent) => void>();
  let source: EventSource | null = null;
  const ensureStream = () => {
    if (source) return;
    source = new EventSource(`${base}/api/stream`);
    source.addEventListener('bus', (message) => {
      const parsed = ObservedEventSchema.safeParse(JSON.parse((message as MessageEvent<string>).data));
      if (parsed.success) listeners.forEach((l) => l(parsed.data));
    });
  };

  return {
    mode: 'live',
    source: `lagoski-bff em ${base}`,
    async ready() {
      try {
        const r = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(2_500) });
        return r.ok;
      } catch {
        return false;
      }
    },
    listProducts: async () => (await call('/products', ProductListSchema)).products,
    createCart: (customerId) => call('/carts', CartSchema, { method: 'POST', body: { customerId } }),
    getCart: (id) => call(`/carts/${enc(id)}`, CartSchema),
    addItem: (cartId, sku, quantity) => call(`/carts/${enc(cartId)}/items`, CartSchema, { method: 'POST', body: { sku, quantity } }),
    removeItem: (cartId, sku) => call(`/carts/${enc(cartId)}/items/${enc(sku)}`, CartSchema, { method: 'DELETE' }),
    placeOrder: (cartId) => call('/orders', OrderSchema, { method: 'POST', body: { cartId } }),
    getOrder: (id) => call(`/orders/${enc(id)}`, OrderSchema),
    listOrders: async (customerId) => (await call(`/customers/${enc(customerId)}/orders`, OrderListSchema)).orders,
    getStock: async (skus) => (await call(`/stock?skus=${enc(skus.join(','))}`, StockListSchema)).items,
    setStock: (sku, onHand) => call(`/admin/stock/${enc(sku)}`, StockItemSchema, { method: 'PUT', body: { onHand } }),
    listNotifications: async (customerId) => (await call(`/notifications?customerId=${enc(customerId)}`, NotificationListSchema)).notifications,
    recentEvents: async () => (await call('/events/recent', RecentEventsSchema)).events,
    subscribe(listener) {
      listeners.add(listener);
      ensureStream();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          source?.close();
          source = null;
        }
      };
    },
  };
}
