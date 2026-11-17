/**
 * Eventos entre microfrontends no navegador. Mesma ideia do backend: cada MFE
 * publica fatos e quem se interessa reage; nenhum importa o outro.
 */
export type BrowserEvents = {
  /** O carrinho mudou (item adicionado ou removido). */
  'lagoski:cart-changed': { cartId: string; itemCount: number };
  /** Um pedido foi fechado. */
  'lagoski:order-placed': { orderId: string };
  /** Pede que o Event Inspector e a lista de pedidos destaquem um pedido. */
  'lagoski:focus-order': { orderId: string };
};

export function emitBrowser<K extends keyof BrowserEvents>(name: K, detail: BrowserEvents[K]): void {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function onBrowser<K extends keyof BrowserEvents>(name: K, handler: (detail: BrowserEvents[K]) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<BrowserEvents[K]>).detail);
  window.addEventListener(name, listener);
  return () => window.removeEventListener(name, listener);
}
