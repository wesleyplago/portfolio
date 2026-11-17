import hankenUrl from '@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2?url';
import newsreaderUrl from '@fontsource/newsreader/files/newsreader-latin-600-normal.woff2?url';
import { useCallback, useEffect, useState } from 'react';
import {
  brl,
  CANCEL_LABEL,
  emitBrowser,
  LagoskiApiError,
  lagoskiFonts,
  lagoskiTokens,
  onBrowser,
  session,
  shortId,
  STATUS_LABEL,
  TEST_CARDS,
  updateSession,
  type Cart,
  type LagoskiClient,
  type ObservedEvent,
  type Order,
  type Simulator,
} from '@portfolio/lagoski-contracts';
import { useBusEvents, useLagoski } from './useLagoski';

const abs = (url: string) => new URL(url, import.meta.url).href;
const fonts = lagoskiFonts({ display: abs(newsreaderUrl), text: abs(hankenUrl) });

const css =
  fonts +
  lagoskiTokens('.lgk-checkout') +
  `
.lgk-checkout .ck-items { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.lgk-checkout .ck-item { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: center; font-size: 13px; }
.lgk-checkout .ck-item small { display: block; color: var(--lg-muted); font-family: var(--lg-mono); font-size: 11px; }
.lgk-checkout .ck-qty { font-variant-numeric: tabular-nums; color: var(--lg-muted); }
.lgk-checkout .ck-remove { border: 0; background: none; color: var(--lg-muted); padding: 2px 6px; border-radius: var(--lg-radius-sm); }
.lgk-checkout .ck-remove:hover { color: var(--lg-bad); }
.lgk-checkout .ck-total { display: flex; justify-content: space-between; border-top: 1px solid var(--lg-line); margin-top: 12px; padding-top: 10px; font-weight: 600; font-variant-numeric: tabular-nums; }
.lgk-checkout .ck-actions { display: grid; gap: 8px; margin-top: 12px; }
.lgk-checkout .ck-order { margin-top: 16px; border-top: 1px dashed var(--lg-line); padding-top: 14px; display: grid; gap: 10px; }
.lgk-checkout .ck-steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; font-size: 13px; }
.lgk-checkout .ck-steps li { display: flex; gap: 8px; align-items: center; color: var(--lg-muted); }
.lgk-checkout .ck-steps li.done { color: var(--lg-ink); }
.lgk-checkout .ck-steps li::before { content: ""; width: 9px; height: 9px; border-radius: 50%; border: 2px solid var(--lg-line); flex: none; }
.lgk-checkout .ck-steps li.done::before { background: var(--lg-ok); border-color: var(--lg-ok); }
.lgk-checkout .ck-steps li.current::before { border-color: var(--lg-lake); }
.lgk-checkout .ck-pay { background: var(--lg-lake-soft); border-radius: var(--lg-radius-md); padding: 12px; display: grid; gap: 8px; }
.lgk-checkout .ck-pay label { font-size: 12px; color: var(--lg-muted); display: grid; gap: 4px; }
.lgk-checkout .ck-pay input { font: 14px var(--lg-mono); padding: 8px 10px; border-radius: var(--lg-radius-sm); border: 1px solid var(--lg-line); background: var(--lg-surface); color: var(--lg-ink); width: 100%; }
.lgk-checkout .ck-stripe { font-weight: 700; letter-spacing: -.01em; }
.lgk-checkout .ck-hint { font-size: 12px; color: var(--lg-muted); }
.lgk-checkout .ck-row { display: flex; gap: 8px; flex-wrap: wrap; }
`;

const FLOW: Order['status'][] = ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

export default function CheckoutApp() {
  const connection = useLagoski();
  return (
    <div className="lgk-checkout">
      <style>{css}</style>
      <section className="lg-panel" aria-labelledby="ck-title">
        <div className="lg-head">
          <h3 id="ck-title">Carrinho</h3>
          <span className="lg-owner">Ordering · Payment</span>
        </div>
        {connection ? <Checkout client={connection.client} /> : <p className="lg-empty">Conectando…</p>}
      </section>
    </div>
  );
}

/** Pedido que voltou do Stripe Checkout (?order=...&checkout=success|cancel). */
function returnedOrder(): { orderId: string; checkout: string } | null {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order');
  return orderId ? { orderId, checkout: params.get('checkout') ?? '' } : null;
}

function Checkout({ client }: { client: LagoskiClient }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
    const { cartId } = session();
    if (!cartId) return setCart(null);
    try {
      const c = await client.getCart(cartId);
      setCart(c.orderId ? null : c);
    } catch {
      setCart(null);
    }
  }, [client]);

  useEffect(() => {
    void loadCart();
    const back = returnedOrder();
    if (back) {
      client
        .getOrder(back.orderId)
        .then((o) => {
          setOrder(o);
          emitBrowser('lagoski:focus-order', { orderId: o.id });
        })
        .catch(() => undefined);
    }
    return onBrowser('lagoski:cart-changed', () => void loadCart());
  }, [client, loadCart]);

  // O status avança por eventos de outros contextos. O observer vê o evento no
  // instante da publicação, antes de o Ordering consumi-lo: por isso relê o
  // pedido logo após cada evento da saga e, enquanto ele não termina, a cada 1,5 s.
  const orderId = order?.id;
  const terminal = order?.status === 'CANCELLED' || order?.status === 'DELIVERED';
  const refresh = useCallback(() => {
    if (orderId) void client.getOrder(orderId).then(setOrder).catch(() => undefined);
  }, [client, orderId]);

  useBusEvents(
    client,
    useCallback(
      (e: ObservedEvent) => {
        if (e.event.correlationid === orderId) window.setTimeout(refresh, 700);
      },
      [orderId, refresh],
    ),
  );

  useEffect(() => {
    if (!orderId || terminal) return;
    const timer = window.setInterval(refresh, 1_500);
    return () => window.clearInterval(timer);
  }, [orderId, terminal, refresh]);

  async function remove(sku: string) {
    if (!cart) return;
    const c = await client.removeItem(cart.id, sku);
    setCart(c);
    emitBrowser('lagoski:cart-changed', { cartId: c.id, itemCount: c.items.reduce((n, i) => n + i.quantity, 0) });
  }

  async function place() {
    if (!cart) return;
    setBusy(true);
    setError(null);
    try {
      const placed = await client.placeOrder(cart.id);
      setOrder(placed);
      setCart(null);
      updateSession({ cartId: null });
      emitBrowser('lagoski:order-placed', { orderId: placed.id });
      emitBrowser('lagoski:focus-order', { orderId: placed.id });
    } catch (e) {
      setError(e instanceof LagoskiApiError ? e.message : 'falha ao fechar o pedido');
    } finally {
      setBusy(false);
    }
  }

  const count = cart?.items.reduce((n, i) => n + i.quantity, 0) ?? 0;

  return (
    <>
      {count === 0 ? (
        <p className="lg-empty">Seu carrinho está vazio. Escolha cor e tamanho na coleção.</p>
      ) : (
        <>
          <ul className="ck-items" aria-label="Itens do carrinho">
            {cart!.items.map((i) => (
              <li key={i.sku} className="ck-item">
                <span>
                  {i.productName} · {i.size} · {i.color}
                  <small>{i.sku}</small>
                </span>
                <span className="ck-qty">
                  {i.quantity} × {brl(i.unitPriceCents)}
                </span>
                <button type="button" className="ck-remove" aria-label={`Remover ${i.productName} ${i.size}`} onClick={() => void remove(i.sku)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="ck-total">
            <span>Subtotal</span>
            <span>{brl(cart!.subtotalCents)}</span>
          </div>
          <div className="ck-actions">
            <button type="button" className="lg-btn primary" disabled={busy} onClick={() => void place()}>
              {busy ? 'Fechando…' : 'Fechar pedido'}
            </button>
            {error && <p className="lg-error">{error}</p>}
          </div>
        </>
      )}
      {order && <OrderStatus order={order} client={client} onDismiss={() => setOrder(null)} />}
    </>
  );
}

function OrderStatus({ order, client, onDismiss }: { order: Order; client: LagoskiClient; onDismiss: () => void }) {
  const reached = new Set(order.history.map((h) => h.status));
  const cancelled = order.status === 'CANCELLED';
  const terminal = cancelled || order.status === 'DELIVERED';

  return (
    <div className="ck-order" aria-label={`Pedido ${shortId(order.id)}`}>
      <div className="lg-head" style={{ marginBottom: 0 }}>
        <h4>
          Pedido <code>{shortId(order.id)}</code> · {brl(order.totalCents)}
        </h4>
        <span className={`lg-pill ${cancelled ? 'bad' : order.status === 'DELIVERED' ? 'ok' : 'info'}`} data-status={order.status}>
          {STATUS_LABEL[order.status]}
          {cancelled && order.cancelReason ? ` · ${CANCEL_LABEL[order.cancelReason]}` : ''}
        </span>
      </div>
      {!cancelled && (
        <ol className="ck-steps">
          {FLOW.map((s) => (
            <li key={s} className={reached.has(s) ? 'done' : s === order.status ? 'current' : ''}>
              {STATUS_LABEL[s]}
            </li>
          ))}
        </ol>
      )}
      {order.status === 'AWAITING_PAYMENT' && order.payment && (
        client.simulator ? <SimulatedCheckout simulator={client.simulator} order={order} /> : <StripeRedirect url={order.payment.checkoutUrl} />
      )}
      {order.status === 'AWAITING_PAYMENT' && !order.payment && <p className="ck-hint">Abrindo o checkout no Payment…</p>}
      {order.trackingCode && (
        <p className="ck-hint">
          Rastreio: <code>{order.trackingCode}</code>
        </p>
      )}
      {terminal && (
        <button type="button" className="lg-btn small" onClick={onDismiss}>
          Fechar acompanhamento
        </button>
      )}
    </div>
  );
}

/** Modo real: o pagamento acontece na página hospedada do Stripe (sandbox). */
function StripeRedirect({ url }: { url: string }) {
  return (
    <div className="ck-pay">
      <span className="ck-stripe">Stripe Checkout · ambiente de testes</span>
      <p className="ck-hint">
        Use o cartão de teste <code>{TEST_CARDS.approved}</code>, qualquer validade futura e qualquer CVC. Depois de pagar, o Stripe
        devolve você para esta página e o webhook confirma o pedido.
      </p>
      <a className="lg-btn primary" href={url}>
        Pagar no Stripe
      </a>
    </div>
  );
}

/** Modo demo: reproduz o que o Stripe Checkout faz, com os mesmos cartões de teste. */
function SimulatedCheckout({ simulator, order }: { simulator: Simulator; order: Order }) {
  const [card, setCard] = useState<string>(TEST_CARDS.approved);
  const [message, setMessage] = useState<string | null>(null);
  const paymentId = order.payment!.paymentId;

  function pay() {
    const { outcome } = simulator.completeCheckout(paymentId, card);
    if (outcome === 'declined-card') setMessage('Cartão recusado. Tente outro cartão, como no Stripe Checkout.');
    else setMessage(null);
  }

  return (
    <form
      className="ck-pay"
      onSubmit={(e) => {
        e.preventDefault();
        pay();
      }}
    >
      <span className="ck-stripe">Stripe Checkout (simulado)</span>
      <label htmlFor="ck-card">
        Número do cartão
        <input id="ck-card" value={card} onChange={(e) => setCard(e.target.value)} inputMode="numeric" autoComplete="off" />
      </label>
      <p className="ck-hint">
        <code>{TEST_CARDS.approved}</code> aprova · <code>{TEST_CARDS.declined}</code> é recusado
      </p>
      <div className="ck-row">
        <button type="submit" className="lg-btn primary">
          Pagar {brl(order.totalCents)}
        </button>
        <button type="button" className="lg-btn" onClick={() => simulator.expireCheckout(paymentId)}>
          Deixar o checkout expirar
        </button>
      </div>
      {message && (
        <p className="lg-error" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
