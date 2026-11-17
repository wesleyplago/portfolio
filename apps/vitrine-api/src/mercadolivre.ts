/**
 * Coleta os dados de um anúncio do Mercado Livre a partir do link de afiliado.
 *
 * 1. O link curto do gerador (mercadolivre.com/sec/…) não traz o código do
 *    anúncio: seguimos os redirecionamentos (sem abrir a página) até achar um
 *    código MLB na URL. Cada salto precisa continuar no domínio do ML.
 * 2. Com o código, consultamos a API oficial com um token de aplicativo
 *    (client_credentials). Desde 2025 a API não responde sem token.
 *    - item (MLB-123): GET /items/{id};
 *    - produto de catálogo (/p/MLB123): GET /products/{id} diz qual item ganha
 *      a compra (buy_box_winner) e buscamos esse item.
 * 3. O nome da categoria vem de GET /categories/{id}.
 *
 * Nada aqui raspa HTML: só cabeçalhos de redirecionamento e a API oficial.
 */
import { z } from 'zod';
import {
  checkAffiliateLink,
  LINK_PROBLEM_MESSAGE,
  mercadoLivreIdFromUrl,
  VitrineApiError,
  type MercadoLivreItem,
  type MercadoLivreLookup,
  type MercadoLivreRef,
} from '@portfolio/vitrine-contracts';

const API = 'https://api.mercadolibre.com';
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 8_000;

export type MercadoLivreConfig = {
  clientId?: string;
  clientSecret?: string;
  fetch?: typeof fetch;
};

const TokenSchema = z.object({ access_token: z.string().min(1), expires_in: z.number().positive() });
const ItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.number().positive(),
  original_price: z.number().nullish(),
  category_id: z.string(),
  status: z.string(),
  pictures: z.array(z.object({ secure_url: z.string().nullish(), url: z.string().nullish() })).default([]),
});
const ProductSchema = z.object({
  buy_box_winner: z.object({ item_id: z.string() }).nullish(),
});
const CategorySchema = z.object({ name: z.string() });

const problem = (code: string, message: string, status: number) => new VitrineApiError(code, message, status);
const notAProduct = () => problem('VALIDATION_ERROR', LINK_PROBLEM_MESSAGE.NOT_A_PRODUCT, 400);
const unavailable = (detail: string) =>
  problem('ML_UNAVAILABLE', `Não foi possível consultar o Mercado Livre (${detail}). Tente de novo.`, 502);

export function createMercadoLivreLookup(config: MercadoLivreConfig): MercadoLivreLookup {
  const http = config.fetch ?? fetch;
  let token: { value: string; expiresAt: number } | null = null;

  const call = (url: string, init: RequestInit = {}) =>
    http(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) }).catch((error: unknown) => {
      throw unavailable(error instanceof Error ? error.message : String(error));
    });

  /** Segue o link até uma URL com código MLB, sem sair do domínio do ML. */
  async function resolve(affiliateUrl: string): Promise<MercadoLivreRef> {
    let url = affiliateUrl;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      if (checkAffiliateLink('mercadolivre', url)) throw notAProduct();
      const ref = mercadoLivreIdFromUrl(url);
      if (ref) return ref;
      const response = await call(url, { method: 'GET', redirect: 'manual' });
      await response.body?.cancel();
      const location = response.headers.get('location');
      if (response.status < 300 || response.status >= 400 || !location) throw notAProduct();
      url = new URL(location, url).toString();
    }
    throw notAProduct();
  }

  async function accessToken(): Promise<string> {
    if (token && token.expiresAt > Date.now()) return token.value;
    if (!config.clientId || !config.clientSecret) {
      throw problem(
        'ML_NOT_CONFIGURED',
        'Configure ML_CLIENT_ID e ML_CLIENT_SECRET na vitrine-api para coletar os dados do anúncio.',
        503,
      );
    }
    const response = await call(`${API}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    });
    const parsed = TokenSchema.safeParse(await response.json().catch(() => null));
    if (!response.ok || !parsed.success) {
      throw problem('ML_NOT_CONFIGURED', 'O Mercado Livre recusou ML_CLIENT_ID/ML_CLIENT_SECRET.', 503);
    }
    // Renova um minuto antes de expirar.
    token = { value: parsed.data.access_token, expiresAt: Date.now() + (parsed.data.expires_in - 60) * 1000 };
    return token.value;
  }

  async function get<T>(path: string, schema: z.ZodType<T>): Promise<T | null> {
    const response = await call(`${API}${path}`, {
      headers: { authorization: `Bearer ${await accessToken()}`, accept: 'application/json' },
    });
    if (response.status === 404) return null;
    if (response.status === 401) token = null;
    if (!response.ok) throw unavailable(`HTTP ${response.status} em ${path.split('?')[0]}`);
    const parsed = schema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) throw unavailable(`resposta inesperada em ${path.split('?')[0]}`);
    return parsed.data;
  }

  return async (affiliateUrl): Promise<MercadoLivreItem> => {
    const ref = await resolve(affiliateUrl);
    let itemId = ref.id;
    if (ref.kind === 'product') {
      const product = await get(`/products/${ref.id}`, ProductSchema);
      if (!product?.buy_box_winner) {
        throw problem('VALIDATION_ERROR', 'Este produto de catálogo está sem vendedor no momento.', 422);
      }
      itemId = product.buy_box_winner.item_id;
    }
    const item = await get(`/items/${itemId}`, ItemSchema);
    if (!item) throw problem('VALIDATION_ERROR', 'Anúncio não encontrado no Mercado Livre.', 422);
    if (item.status !== 'active') {
      throw problem('VALIDATION_ERROR', 'O anúncio não está ativo no Mercado Livre (pausado ou encerrado).', 422);
    }
    const category = await get(`/categories/${item.category_id}`, CategorySchema).catch(() => null);
    const picture = item.pictures[0];
    const image = picture?.secure_url ?? picture?.url?.replace(/^http:/, 'https:') ?? null;
    return {
      itemId: item.id,
      title: item.title,
      category: category?.name ?? 'Sem categoria',
      imageUrl: image,
      priceFrom: item.original_price && item.original_price > item.price ? item.original_price : null,
      priceTo: item.price,
    };
  };
}
