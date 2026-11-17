/**
 * Adaptador HTTP do contrato da vitrine-api (rotas de createVitrineClient).
 *
 * Mínimo de propósito: o estado vive em memória (a mesma implementação do modo
 * demo, sem os produtos de exemplo) e some ao reiniciar. O que é real é a
 * coleta dos dados do anúncio no Mercado Livre, injetada em `mercadoLivre`.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { z } from 'zod';
import {
  AddMercadoLivreInputSchema,
  AddShopeeInputSchema,
  ClickEventSchema,
  createMockVitrineClient,
  LoginRequestSchema,
  ProductStatusSchema,
  StoreSchema,
  VitrineApiError,
  type MockVitrineOptions,
} from '@portfolio/vitrine-contracts';

export type ApiConfig = Pick<MockVitrineOptions, 'mercadoLivre' | 'admin'> & {
  corsOrigins: readonly string[];
};

const MAX_BODY_BYTES = 16 * 1024;
const StatusBodySchema = z.object({ status: ProductStatusSchema });

async function readJson(req: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new VitrineApiError('PAYLOAD_TOO_LARGE', 'Corpo da requisição grande demais.', 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null');
  } catch {
    throw new VitrineApiError('VALIDATION_ERROR', 'JSON inválido.', 400);
  }
}

export function createApi(config: ApiConfig): Server {
  const store = createMockVitrineClient({
    latencyMs: 0,
    examples: false,
    mercadoLivre: config.mercadoLivre,
    admin: config.admin,
  });

  const routes = async (req: IncomingMessage, url: URL): Promise<[number, unknown]> => {
    const method = req.method ?? 'GET';
    const path = url.pathname.replace(/\/$/, '') || '/';
    const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1] ?? '';
    const slug = /^\/v1\/products\/([^/]+)$/.exec(path)?.[1];
    const productId = /^\/admin\/v1\/products\/([^/]+)$/.exec(path)?.[1];

    if (method === 'GET' && path === '/readyz') return [200, { ready: true }];
    if (method === 'GET' && path === '/v1/products') {
      const q = url.searchParams.get('q') || undefined;
      const storeParam = url.searchParams.get('store');
      return [200, await store.listProducts({ q, store: storeParam ? StoreSchema.parse(storeParam) : undefined })];
    }
    if (method === 'GET' && slug) return [200, await store.getProduct(decodeURIComponent(slug))];
    if (method === 'POST' && path === '/v1/clicks') {
      // sendBeacon: o navegador não espera resposta. Clique inválido é ignorado.
      const body = await readJson(req).catch(() => null);
      const click = ClickEventSchema.safeParse(body);
      if (click.success) store.trackClick(click.data);
      return [204, null];
    }
    if (method === 'POST' && path === '/admin/v1/login') return [200, await store.login(LoginRequestSchema.parse(await readJson(req)))];
    if (method === 'GET' && path === '/admin/v1/products') return [200, await store.admin.listProducts(token)];
    if (method === 'PATCH' && productId) {
      const { status } = StatusBodySchema.parse(await readJson(req));
      return [200, await store.admin.setStatus(token, decodeURIComponent(productId), status)];
    }
    if (method === 'POST' && path === '/admin/v1/products/shopee') {
      return [201, await store.admin.addShopee(token, AddShopeeInputSchema.parse(await readJson(req)))];
    }
    if (method === 'POST' && path === '/admin/v1/products/ml') {
      return [201, await store.admin.addMercadoLivre(token, AddMercadoLivreInputSchema.parse(await readJson(req)))];
    }
    if (method === 'GET' && path === '/admin/v1/reports/funnel') return [200, await store.admin.funnel(token)];
    throw new VitrineApiError('NOT_FOUND', 'Rota não encontrada.', 404);
  };

  const send = (res: ServerResponse, status: number, body: unknown) => {
    if (status === 204) return void res.writeHead(204).end();
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }).end(JSON.stringify(body));
  };

  return createServer((req, res) => {
    const origin = req.headers.origin;
    if (origin && config.corsOrigins.includes(origin)) {
      res.setHeader('access-control-allow-origin', origin);
      res.setHeader('vary', 'origin');
      res.setHeader('access-control-allow-headers', 'content-type, authorization');
      res.setHeader('access-control-allow-methods', 'GET, POST, PATCH, OPTIONS');
    }
    if (req.method === 'OPTIONS') return void res.writeHead(204).end();

    const url = new URL(req.url ?? '/', 'http://localhost');
    routes(req, url)
      .then(([status, body]) => send(res, status, body))
      .catch((error: unknown) => {
        if (error instanceof VitrineApiError) {
          return send(res, error.status || 500, { error: error.code, message: error.message });
        }
        if (error instanceof z.ZodError) {
          return send(res, 400, { error: 'VALIDATION_ERROR', message: error.issues[0]?.message ?? 'Dados inválidos.' });
        }
        console.error(error);
        send(res, 500, { error: 'INTERNAL', message: 'Erro inesperado na vitrine-api.' });
      });
  });
}
