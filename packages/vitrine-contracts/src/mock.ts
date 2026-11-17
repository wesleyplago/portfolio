/**
 * Cliente em memória com o mesmo contrato da vitrine-api.
 *
 * Usado quando a API não está declarada ou está fora do ar: a vitrine e o
 * backoffice continuam utilizáveis, com as mesmas regras observáveis:
 *
 * - um único usuário admin, com usuário e senha fixos (DEMO_ADMIN);
 * - toda operação do backoffice exige o token do login e expira em 8 h;
 * - só produtos publicados aparecem na vitrine;
 * - links que fogem do domínio da loja são recusados (link-rules.ts).
 *
 * Os produtos são exemplos, não ofertas reais: os links levam a buscas nas
 * lojas, sem ID de afiliado. O estado vive na aba e some ao recarregar.
 */
import { VitrineApiError, type VitrineClient } from './client';
import { checkAffiliateLink, LINK_PROBLEM_MESSAGE, mercadoLivreIdFromUrl } from './link-rules';
import {
  AddMercadoLivreInputSchema,
  AddShopeeInputSchema,
  LoginRequestSchema,
  ProductQuerySchema,
  type MercadoLivreItem,
  type Product,
  type ProductPage,
  type Session,
} from './schemas';

/** Credencial do modo demo. No modo real o login é validado pela vitrine-api. */
export const DEMO_ADMIN = { username: 'admin', password: 'vitrine@2026' } as const;

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

type Seed = Product & { exampleOrders: number };

const seed = (p: Omit<Seed, 'imageUrl' | 'status'> & { status?: Product['status'] }): Seed => ({
  imageUrl: null,
  status: 'published',
  ...p,
});

export const EXAMPLE_PRODUCTS: readonly Seed[] = [
  seed({
    id: 'p1', slug: 'fone-bluetooth-tws', store: 'shopee', title: 'Fone Bluetooth TWS com estojo de carga',
    category: 'Eletrônicos', priceFrom: 129.9, priceTo: 79.9, commissionRate: 0.08, exampleOrders: 6,
    links: [{ channel: 'site', url: 'https://shopee.com.br/search?keyword=fone%20bluetooth%20tws' }],
  }),
  seed({
    id: 'p2', slug: 'air-fryer-4l', store: 'mercadolivre', title: 'Air fryer 4 litros antiaderente',
    category: 'Casa', priceFrom: 399, priceTo: 299, commissionRate: 0.06, exampleOrders: 3,
    links: [{ channel: 'site', url: 'https://lista.mercadolivre.com.br/air-fryer-4-litros' }],
  }),
  seed({
    id: 'p3', slug: 'garrafa-termica-1l', store: 'shopee', title: 'Garrafa térmica inox 1 litro',
    category: 'Casa', priceFrom: null, priceTo: 54.9, commissionRate: 0.1, exampleOrders: 9,
    links: [{ channel: 'site', url: 'https://shopee.com.br/search?keyword=garrafa%20termica%201l' }],
  }),
  seed({
    id: 'p4', slug: 'tenis-corrida', store: 'mercadolivre', title: 'Tênis de corrida amortecido',
    category: 'Esporte', priceFrom: 349.9, priceTo: 249.9, commissionRate: 0.12, exampleOrders: 2,
    links: [{ channel: 'site', url: 'https://lista.mercadolivre.com.br/tenis-corrida' }],
  }),
  seed({
    id: 'p5', slug: 'luminaria-led-mesa', store: 'shopee', title: 'Luminária LED de mesa com 3 tons',
    category: 'Casa', priceFrom: 89.9, priceTo: 59.9, commissionRate: 0.07, exampleOrders: 0, status: 'draft',
    links: [{ channel: 'site', url: 'https://shopee.com.br/search?keyword=luminaria%20led%20mesa' }],
  }),
];

/** Coleta os dados do anúncio a partir do link de afiliado (já validado no domínio do ML). */
export type MercadoLivreLookup = (affiliateUrl: string) => Promise<MercadoLivreItem>;

export type MockVitrineOptions = {
  latencyMs?: number;
  /** Padrão: dados de exemplo. A vitrine-api injeta a busca real na API do ML. */
  mercadoLivre?: MercadoLivreLookup;
  /** Padrão: true. A vitrine-api começa sem os produtos de exemplo. */
  examples?: boolean;
  /** Padrão: DEMO_ADMIN. A vitrine-api lê do ambiente. */
  admin?: { username: string; password: string };
};

/**
 * Busca simulada do modo demo: não chama o ML. Tira o título do caminho da URL
 * quando ele está lá (produto.mercadolivre.com.br/MLB-123-mouse-sem-fio-_JM);
 * o link curto /sec/ não tem título, então vira um nome genérico.
 */
export const demoMercadoLivreLookup: MercadoLivreLookup = async (affiliateUrl) => {
  const ref = mercadoLivreIdFromUrl(affiliateUrl);
  const slug = new URL(affiliateUrl).pathname
    .replace(/^.*MLB-?\d+-?/i, '')
    .replace(/-_J[MP].*$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  const name = ref && slug.length >= 3 ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Produto do Mercado Livre (exemplo)';
  return {
    itemId: ref?.id ?? 'MLB1000000001',
    title: name,
    category: 'Sem categoria',
    imageUrl: null,
    priceFrom: 129.9,
    priceTo: 99.9,
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const strip = ({ exampleOrders: _orders, ...product }: Seed): Product => product;
const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const invalid = (message: string) => new VitrineApiError('VALIDATION_ERROR', message, 400);

export function createMockVitrineClient(options: MockVitrineOptions = {}): VitrineClient {
  const latency = options.latencyMs ?? 150;
  const lookupMercadoLivre = options.mercadoLivre ?? demoMercadoLivreLookup;
  const admin = options.admin ?? DEMO_ADMIN;
  const products: Seed[] =
    options.examples === false ? [] : EXAMPLE_PRODUCTS.map((p) => ({ ...p, links: [...p.links] }));
  const clicks = new Map<string, number>();
  const sessions = new Map<string, Session>();
  let nextId = products.length + 1;

  const auth = (token: string) => {
    const session = sessions.get(token);
    if (!session || Date.parse(session.expiresAt) <= Date.now()) {
      sessions.delete(token);
      throw new VitrineApiError('UNAUTHORIZED', 'Sessão expirada. Entre de novo.', 401);
    }
  };
  const page = (items: Seed[]): ProductPage => ({ items: items.map(strip), total: items.length });
  const add = (
    p: Omit<Seed, 'id' | 'slug' | 'status' | 'exampleOrders' | 'imageUrl'> & { imageUrl?: string | null },
  ): Product => {
    const id = `p${nextId++}`;
    const product: Seed = { imageUrl: null, ...p, id, slug: `${slugify(p.title)}-${id}`, status: 'draft', exampleOrders: 0 };
    products.unshift(product);
    return strip(product);
  };

  return {
    mode: 'mock',
    source: 'mock em memória com produtos de exemplo',

    async ready() {
      return true;
    },

    async listProducts(query = {}) {
      await sleep(latency);
      const { q, store } = ProductQuerySchema.parse(query);
      const term = q?.toLowerCase();
      return page(
        products.filter(
          (p) =>
            p.status === 'published' &&
            (!store || p.store === store) &&
            (!term || p.title.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)),
        ),
      );
    },

    async getProduct(slug) {
      await sleep(latency);
      const found = products.find((p) => p.slug === slug && p.status === 'published');
      if (!found) throw new VitrineApiError('NOT_FOUND', 'Produto não encontrado.', 404);
      return strip(found);
    },

    trackClick({ productId }) {
      clicks.set(productId, (clicks.get(productId) ?? 0) + 1);
    },

    async login(input) {
      await sleep(latency);
      const { username, password } = LoginRequestSchema.parse(input);
      if (username !== admin.username || password !== admin.password) {
        throw new VitrineApiError('INVALID_CREDENTIALS', 'Usuário ou senha incorretos.', 401);
      }
      const session: Session = {
        token: crypto.randomUUID(),
        username,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
      };
      sessions.set(session.token, session);
      return session;
    },

    admin: {
      async listProducts(token) {
        await sleep(latency);
        auth(token);
        return page(products);
      },

      async setStatus(token, productId, status) {
        await sleep(latency);
        auth(token);
        const found = products.find((p) => p.id === productId);
        if (!found) throw new VitrineApiError('NOT_FOUND', 'Produto não encontrado.', 404);
        found.status = status;
        return strip(found);
      },

      async addShopee(token, input) {
        await sleep(latency);
        auth(token);
        const { url } = AddShopeeInputSchema.parse(input);
        const problem = checkAffiliateLink('shopee', url);
        if (problem) throw invalid(LINK_PROBLEM_MESSAGE[problem]);
        // A API real busca título, preço e comissão em productOfferV2 e gera o
        // link com generateShortLink. O mock só deriva o título da URL.
        const name = decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '')
          .replace(/-i\.\d+\.\d+$/, '')
          .replace(/-/g, ' ')
          .trim();
        return add({
          store: 'shopee',
          title: name.length >= 3 ? name : 'Produto Shopee (exemplo)',
          category: 'Sem categoria',
          priceFrom: null,
          priceTo: 49.9,
          commissionRate: 0.08,
          links: [{ channel: 'site', url }],
        });
      },

      async addMercadoLivre(token, input) {
        await sleep(latency);
        auth(token);
        const { affiliateUrl } = AddMercadoLivreInputSchema.parse(input);
        const problem = checkAffiliateLink('mercadolivre', affiliateUrl);
        if (problem) throw invalid(LINK_PROBLEM_MESSAGE[problem]);
        const item = await lookupMercadoLivre(affiliateUrl);
        return add({
          store: 'mercadolivre',
          title: item.title,
          category: item.category,
          imageUrl: item.imageUrl,
          priceFrom: item.priceFrom,
          priceTo: item.priceTo,
          // O ML não expõe a taxa de comissão na API: é uma estimativa para o relatório.
          commissionRate: 0.06,
          // O botão Comprar usa o link de afiliado como veio, nunca a URL do anúncio.
          links: [{ channel: 'site', url: affiliateUrl }],
        });
      },

      async funnel(token) {
        await sleep(latency);
        auth(token);
        return {
          rows: products.map((p) => ({
            productId: p.id,
            title: p.title,
            store: p.store,
            clicks: clicks.get(p.id) ?? 0,
            orders: p.exampleOrders,
            commission: Math.round(p.exampleOrders * p.priceTo * p.commissionRate * 100) / 100,
          })),
        };
      },
    },
  };
}
