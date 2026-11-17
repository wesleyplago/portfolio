import type { Store } from './schemas';

/**
 * Regras dos programas de afiliados que o link precisa cumprir para gerar
 * comissão. Espelho do módulo `links` da vitrine-api; o painel usa para avisar
 * antes de salvar.
 *
 * - O link tem de ser o oficial, no domínio da loja. O ML proíbe encurtador e
 *   qualquer link que esconda o domínio (termos 1.8); a Shopee proíbe alterar o
 *   link (T&C 2.2). Por isso não há lista de encurtadores: só domínios da loja.
 * - No ML, o anúncio tem de ser um produto específico, não a home nem uma busca
 *   (termos 3.1.2 d).
 *
 * Os domínios abaixo cobrem as URLs de produto e os links curtos que cada
 * gerador oficial devolve hoje; confira com um link real gerado no portal.
 */
const STORE_HOSTS: Record<Store, readonly string[]> = {
  shopee: ['shopee.com.br', 's.shopee.com.br'],
  mercadolivre: ['mercadolivre.com', 'mercadolivre.com.br'],
};

export type LinkProblem =
  | 'NOT_HTTPS'
  | 'NOT_STORE_DOMAIN'
  | 'NOT_A_PRODUCT'
  | 'INVALID_URL';

export const LINK_PROBLEM_MESSAGE: Record<LinkProblem, string> = {
  INVALID_URL: 'Não é uma URL válida.',
  NOT_HTTPS: 'O link precisa começar com https://.',
  NOT_STORE_DOMAIN: 'O link precisa ser do domínio da loja. Encurtadores e redirecionadores não geram comissão.',
  NOT_A_PRODUCT: 'O link não leva a um anúncio específico. Gere o link na página do produto, não na home nem numa busca.',
};

const isStoreHost = (store: Store, host: string) =>
  STORE_HOSTS[store].some((h) => host === h || host.endsWith(`.${h}`));

/** Link de afiliado que vai no botão Comprar e nos textos de compartilhamento. */
export function checkAffiliateLink(store: Store, url: string): LinkProblem | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'INVALID_URL';
  }
  if (parsed.protocol !== 'https:') return 'NOT_HTTPS';
  if (!isStoreHost(store, parsed.hostname.toLowerCase())) return 'NOT_STORE_DOMAIN';
  return null;
}

export type MercadoLivreRef = { kind: 'item' | 'product'; id: string };

/**
 * Código do anúncio dentro de uma URL do ML, quando ele está nela. O link curto
 * do gerador (mercadolivre.com/sec/…) não traz o código: a vitrine-api segue o
 * redirecionamento até a página do anúncio e chama esta função de novo.
 *
 * - `?wid=MLB123` ou `item_id:MLB123` (filtro da página de catálogo) → item;
 * - `/p/MLB123` → produto de catálogo (a API diz qual item ganha a compra);
 * - `MLB-123` no caminho (produto.mercadolivre.com.br/MLB-123-titulo) → item.
 */
export function mercadoLivreIdFromUrl(url: string): MercadoLivreRef | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const raw = `${parsed.search}${parsed.hash}`;
  let extra = raw;
  try {
    extra = decodeURIComponent(raw);
  } catch {
    // %-escape inválido: procura o código no texto como veio.
  }
  const wid = /(?:[?&#]wid=|item_id:)MLB-?(\d{6,})/i.exec(extra);
  if (wid) return { kind: 'item', id: `MLB${wid[1]}` };
  const catalog = /\/p\/MLB-?(\d{6,})/i.exec(parsed.pathname);
  if (catalog) return { kind: 'product', id: `MLB${catalog[1]}` };
  const item = /MLB-?(\d{6,})/i.exec(parsed.pathname);
  return item ? { kind: 'item', id: `MLB${item[1]}` } : null;
}
