import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createVitrineClient, DEMO_ADMIN, type VitrineClient } from '@portfolio/vitrine-contracts';
import { createApi } from './server';

/** O cliente HTTP do microfrontend contra o servidor de verdade: prova que o contrato bate. */
describe('vitrine-api (HTTP)', () => {
  const api = createApi({
    corsOrigins: ['http://localhost:5180'],
    mercadoLivre: async () => ({
      itemId: 'MLB1234567890',
      title: 'Mouse sem fio',
      category: 'Mouses',
      imageUrl: 'https://http2.mlstatic.com/D_mouse.jpg',
      priceFrom: null,
      priceTo: 59.9,
    }),
  });
  let base = '';
  let client: VitrineClient;

  beforeAll(async () => {
    await new Promise<void>((resolve) => api.listen(0, resolve));
    base = `http://localhost:${(api.address() as AddressInfo).port}`;
    client = createVitrineClient({ baseUrl: base });
  });
  afterAll(() => new Promise<void>((resolve) => api.close(() => resolve())));

  it('responde ao /readyz e começa sem produtos de exemplo', async () => {
    expect(await client.ready()).toBe(true);
    expect((await client.listProducts()).total).toBe(0);
  });

  it('cadastra pelo link do ML, publica e o produto aparece na vitrine', async () => {
    const { token } = await client.login(DEMO_ADMIN);
    const draft = await client.admin.addMercadoLivre(token, { affiliateUrl: 'https://mercadolivre.com/sec/1abcDE' });
    expect(draft).toMatchObject({ title: 'Mouse sem fio', category: 'Mouses', priceTo: 59.9, status: 'draft' });
    expect((await client.listProducts()).total).toBe(0);

    await client.admin.setStatus(token, draft.id, 'published');
    const page = await client.listProducts({ store: 'mercadolivre' });
    expect(page.items.map((p) => p.links[0]?.url)).toEqual(['https://mercadolivre.com/sec/1abcDE']);
  });

  it('erros chegam com código e mensagem em português', async () => {
    await expect(client.login({ username: 'admin', password: 'errada' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      status: 401,
    });
    await expect(client.admin.funnel('falso')).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
    const { token } = await client.login(DEMO_ADMIN);
    await expect(client.admin.addMercadoLivre(token, { affiliateUrl: 'https://bit.ly/x' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: expect.stringMatching(/domínio da loja/),
    });
  });

  it('libera CORS só para as origens configuradas', async () => {
    const allowed = await fetch(`${base}/readyz`, { headers: { origin: 'http://localhost:5180' } });
    expect(allowed.headers.get('access-control-allow-origin')).toBe('http://localhost:5180');
    const other = await fetch(`${base}/readyz`, { headers: { origin: 'https://outro.site' } });
    expect(other.headers.get('access-control-allow-origin')).toBeNull();
  });
});
