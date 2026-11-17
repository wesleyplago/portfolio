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
  NOT_A_PRODUCT: 'Use a URL de um anúncio específico (com o código MLB), não a home nem uma busca.',
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

/** URL do anúncio no ML: precisa ter o código MLB do item. */
export function checkMercadoLivreItemUrl(url: string): LinkProblem | null {
  const problem = checkAffiliateLink('mercadolivre', url);
  if (problem) return problem;
  return /MLB-?\d{6,}/i.test(url) ? null : 'NOT_A_PRODUCT';
}
