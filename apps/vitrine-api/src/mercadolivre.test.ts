import { describe, expect, it } from 'vitest';
import { createMercadoLivreLookup } from './mercadolivre';

const SHORT = 'https://mercadolivre.com/sec/1abcDE';
const PAGE = 'https://produto.mercadolivre.com.br/MLB-1234567890-mouse-sem-fio-_JM?matt_tool=1';
const ITEM = {
  id: 'MLB1234567890',
  title: 'Mouse Sem Fio Recarregável',
  price: 59.9,
  original_price: 89.9,
  category_id: 'MLB1714',
  status: 'active',
  pictures: [{ secure_url: 'https://http2.mlstatic.com/D_mouse.jpg' }],
};

type Route = (init: RequestInit | undefined) => Response;

/** fetch falso: responde por URL e anota as chamadas. */
function fakeFetch(routes: Record<string, Route>) {
  const calls: string[] = [];
  const fn = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    const route = routes[url];
    if (!route) return new Response('{}', { status: 404 });
    return route(init);
  }) as typeof fetch;
  return { fn, calls };
}

const json = (body: unknown, status = 200) => () => Response.json(body, { status });
const redirect = (to: string) => () => new Response(null, { status: 301, headers: { location: to } });
const token = json({ access_token: 'APP_USR-1', expires_in: 21600 });
const base = {
  'https://api.mercadolibre.com/oauth/token': token,
  'https://api.mercadolibre.com/items/MLB1234567890': json(ITEM),
  'https://api.mercadolibre.com/categories/MLB1714': json({ name: 'Mouses' }),
};
const creds = { clientId: 'id', clientSecret: 'secret' };

describe('coleta do anúncio do Mercado Livre', () => {
  it('segue o link curto até o anúncio e preenche os dados pela API', async () => {
    const http = fakeFetch({ ...base, [SHORT]: redirect(PAGE) });
    const lookup = createMercadoLivreLookup({ ...creds, fetch: http.fn });

    expect(await lookup(SHORT)).toEqual({
      itemId: 'MLB1234567890',
      title: 'Mouse Sem Fio Recarregável',
      category: 'Mouses',
      imageUrl: 'https://http2.mlstatic.com/D_mouse.jpg',
      priceFrom: 89.9,
      priceTo: 59.9,
    });
    // A página do anúncio nunca é baixada: o código já está na URL do redirecionamento.
    expect(http.calls).not.toContain(PAGE);
  });

  it('pega o token uma vez só e manda no cabeçalho', async () => {
    const auth: (string | null)[] = [];
    const http = fakeFetch({
      ...base,
      'https://api.mercadolibre.com/items/MLB1234567890': (init) => {
        auth.push(new Headers(init?.headers).get('authorization'));
        return Response.json(ITEM);
      },
    });
    const lookup = createMercadoLivreLookup({ ...creds, fetch: http.fn });
    await lookup(PAGE);
    await lookup(PAGE);
    expect(http.calls.filter((u) => u.endsWith('/oauth/token'))).toHaveLength(1);
    expect(auth).toEqual(['Bearer APP_USR-1', 'Bearer APP_USR-1']);
  });

  it('produto de catálogo usa o item que ganha a compra', async () => {
    const http = fakeFetch({
      ...base,
      'https://api.mercadolibre.com/products/MLB19876543': json({ buy_box_winner: { item_id: 'MLB1234567890' } }),
    });
    const lookup = createMercadoLivreLookup({ ...creds, fetch: http.fn });
    expect((await lookup('https://www.mercadolivre.com.br/mouse/p/MLB19876543')).itemId).toBe('MLB1234567890');
  });

  it('recusa redirecionamento para fora do ML sem segui-lo', async () => {
    const http = fakeFetch({ ...base, [SHORT]: redirect('https://golpe.example/MLB-1234567890') });
    const lookup = createMercadoLivreLookup({ ...creds, fetch: http.fn });
    await expect(lookup(SHORT)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(http.calls).toEqual([SHORT]);
  });

  it('recusa link que não leva a um anúncio', async () => {
    const http = fakeFetch({ ...base, [SHORT]: () => new Response('<html>', { status: 200 }) });
    const lookup = createMercadoLivreLookup({ ...creds, fetch: http.fn });
    await expect(lookup(SHORT)).rejects.toMatchObject({ message: expect.stringMatching(/anúncio específico/) });
  });

  it('recusa anúncio pausado ou encerrado', async () => {
    const http = fakeFetch({
      ...base,
      'https://api.mercadolibre.com/items/MLB1234567890': json({ ...ITEM, status: 'paused' }),
    });
    const lookup = createMercadoLivreLookup({ ...creds, fetch: http.fn });
    await expect(lookup(PAGE)).rejects.toMatchObject({ message: expect.stringMatching(/não está ativo/) });
  });

  it('sem credenciais explica o que configurar', async () => {
    const lookup = createMercadoLivreLookup({ fetch: fakeFetch(base).fn });
    await expect(lookup(PAGE)).rejects.toMatchObject({ code: 'ML_NOT_CONFIGURED', status: 503 });
  });

  it('sem preço original maior, não inventa desconto', async () => {
    const http = fakeFetch({
      ...base,
      'https://api.mercadolibre.com/items/MLB1234567890': json({ ...ITEM, original_price: null }),
    });
    const lookup = createMercadoLivreLookup({ ...creds, fetch: http.fn });
    expect((await lookup(PAGE)).priceFrom).toBeNull();
  });
});
