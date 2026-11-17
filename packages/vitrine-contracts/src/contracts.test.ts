import { describe, expect, it } from 'vitest';
import { checkAffiliateLink, mercadoLivreIdFromUrl } from './link-rules';
import { createMockVitrineClient, DEMO_ADMIN } from './mock';
import { FunnelReportSchema, ProductPageSchema, ProductSchema, SessionSchema } from './schemas';

const client = () => createMockVitrineClient({ latencyMs: 0 });

describe('vitrine pública (mock)', () => {
  it('lista só produtos publicados, no formato da API', async () => {
    const page = await client().listProducts();
    expect(ProductPageSchema.safeParse(page).success).toBe(true);
    expect(page.items.every((p) => p.status === 'published')).toBe(true);
    expect(page.items.some((p) => p.slug === 'luminaria-led-mesa')).toBe(false);
  });

  it('filtra por loja e por texto', async () => {
    const c = client();
    expect((await c.listProducts({ store: 'mercadolivre' })).items.every((p) => p.store === 'mercadolivre')).toBe(true);
    expect((await c.listProducts({ q: 'air fryer' })).items.map((p) => p.slug)).toEqual(['air-fryer-4l']);
  });

  it('não expõe rascunho pelo slug', async () => {
    await expect(client().getProduct('luminaria-led-mesa')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('backoffice (mock)', () => {
  it('aceita só o admin fixo', async () => {
    const c = client();
    await expect(c.login({ username: 'admin', password: 'errada' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    await expect(c.login({ username: 'outro', password: DEMO_ADMIN.password })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    expect(SessionSchema.safeParse(await c.login(DEMO_ADMIN)).success).toBe(true);
  });

  it('recusa operação sem token válido', async () => {
    await expect(client().admin.listProducts('token-falso')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('publica um rascunho e ele aparece na vitrine', async () => {
    const c = client();
    const { token } = await c.login(DEMO_ADMIN);
    await c.admin.setStatus(token, 'p5', 'published');
    expect((await c.getProduct('luminaria-led-mesa')).status).toBe('published');
  });

  it('cadastra produto do ML só com o link, coletando os dados, e recusa link encurtado', async () => {
    const affiliateUrl = 'https://mercadolivre.com/sec/1abcDE';
    const c = createMockVitrineClient({
      latencyMs: 0,
      mercadoLivre: async (url) => {
        expect(url).toBe(affiliateUrl);
        return {
          itemId: 'MLB1234567890',
          title: 'Mouse sem fio',
          category: 'Informática',
          imageUrl: 'https://http2.mlstatic.com/D_mouse.jpg',
          priceFrom: 89.9,
          priceTo: 59.9,
        };
      },
    });
    const { token } = await c.login(DEMO_ADMIN);
    await expect(c.admin.addMercadoLivre(token, { affiliateUrl: 'https://bit.ly/abc' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    const product = await c.admin.addMercadoLivre(token, { affiliateUrl });
    expect(ProductSchema.safeParse(product).success).toBe(true);
    expect(product).toMatchObject({
      store: 'mercadolivre',
      status: 'draft',
      title: 'Mouse sem fio',
      category: 'Informática',
      imageUrl: 'https://http2.mlstatic.com/D_mouse.jpg',
      priceFrom: 89.9,
      priceTo: 59.9,
      links: [{ channel: 'site', url: affiliateUrl }],
    });
  });

  it('modo demo tira o título da URL do anúncio', async () => {
    const c = client();
    const { token } = await c.login(DEMO_ADMIN);
    const product = await c.admin.addMercadoLivre(token, {
      affiliateUrl: 'https://produto.mercadolivre.com.br/MLB-1234567890-mouse-sem-fio-_JM',
    });
    expect(product.title).toBe('Mouse sem fio');
  });

  it('admin e produtos de exemplo são configuráveis (vitrine-api)', async () => {
    const c = createMockVitrineClient({ latencyMs: 0, examples: false, admin: { username: 'eu', password: 'segredo' } });
    await expect(c.login(DEMO_ADMIN)).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    const { token } = await c.login({ username: 'eu', password: 'segredo' });
    expect((await c.admin.listProducts(token)).total).toBe(0);
  });

  it('conta cliques no relatório', async () => {
    const c = client();
    c.trackClick({ productId: 'p1', store: 'shopee', channel: 'site' });
    c.trackClick({ productId: 'p1', store: 'shopee', channel: 'site' });
    const { token } = await c.login(DEMO_ADMIN);
    const report = await c.admin.funnel(token);
    expect(FunnelReportSchema.safeParse(report).success).toBe(true);
    expect(report.rows.find((r) => r.productId === 'p1')?.clicks).toBe(2);
  });
});

describe('regras de link', () => {
  it.each([
    ['shopee', 'https://s.shopee.com.br/AbC123', null],
    ['shopee', 'https://shopee.com.br/Fone-i.1.2', null],
    ['shopee', 'http://shopee.com.br/x', 'NOT_HTTPS'],
    ['shopee', 'https://bit.ly/x', 'NOT_STORE_DOMAIN'],
    ['shopee', 'https://shopee.com.br.golpe.com/x', 'NOT_STORE_DOMAIN'],
    ['mercadolivre', 'https://mercadolivre.com/sec/1abcDE', null],
    ['mercadolivre', 'https://meusite.com/ir/123', 'NOT_STORE_DOMAIN'],
  ] as const)('%s %s → %s', (store, url, expected) => {
    expect(checkAffiliateLink(store, url)).toBe(expected);
  });

  it.each([
    ['https://produto.mercadolivre.com.br/MLB-1234567890-mouse-_JM', { kind: 'item', id: 'MLB1234567890' }],
    ['https://www.mercadolivre.com.br/air-fryer/p/MLB19876543', { kind: 'product', id: 'MLB19876543' }],
    ['https://www.mercadolivre.com.br/air-fryer/p/MLB19876543?pdp_filters=item_id%3AMLB3334445556', { kind: 'item', id: 'MLB3334445556' }],
    ['https://www.mercadolivre.com.br/x/p/MLB19876543#wid=MLB3334445556&sid=1', { kind: 'item', id: 'MLB3334445556' }],
    ['https://mercadolivre.com/sec/1abcDE', null],
    ['https://www.mercadolivre.com.br/', null],
    ['não é url', null],
  ] as const)('código do ML em %s', (url, expected) => {
    expect(mercadoLivreIdFromUrl(url)).toEqual(expected);
  });
});
