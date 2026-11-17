import { describe, expect, it } from 'vitest';
import { checkAffiliateLink, checkMercadoLivreItemUrl } from './link-rules';
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

  it('cadastra produto do ML como rascunho e recusa link encurtado', async () => {
    const c = client();
    const { token } = await c.login(DEMO_ADMIN);
    const base = {
      itemUrl: 'https://produto.mercadolivre.com.br/MLB-1234567890-mouse-sem-fio-_JM',
      title: 'Mouse sem fio',
      category: 'Informática',
      priceTo: 59.9,
    };
    await expect(
      c.admin.addMercadoLivre(token, { ...base, affiliateUrl: 'https://bit.ly/abc' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    const product = await c.admin.addMercadoLivre(token, { ...base, affiliateUrl: 'https://mercadolivre.com/sec/1abcDE' });
    expect(ProductSchema.safeParse(product).success).toBe(true);
    expect(product.status).toBe('draft');
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

  it('exige anúncio específico no ML', () => {
    expect(checkMercadoLivreItemUrl('https://www.mercadolivre.com.br/')).toBe('NOT_A_PRODUCT');
    expect(checkMercadoLivreItemUrl('https://produto.mercadolivre.com.br/MLB-1234567890-x')).toBeNull();
  });
});
