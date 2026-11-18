import hankenUrl from '@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2?url';
import newsreaderUrl from '@fontsource/newsreader/files/newsreader-latin-600-normal.woff2?url';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  brl,
  CANCEL_LABEL,
  emitBrowser,
  registerLagoskiFonts,
  lagoskiTokens,
  onBrowser,
  session,
  shortId,
  STATUS_LABEL,
  type LagoskiClient,
  type Notification,
  type ObservedEvent,
  type Order,
} from '@portfolio/lagoski-contracts';
import { useBusEvents, useLagoski } from './useLagoski';

registerLagoskiFonts({ display: newsreaderUrl, text: hankenUrl });

const css =
  lagoskiTokens('.lgk-orders') +
  `
.lgk-orders .lo-cols { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 16px; }
@media (max-width: 760px) { .lgk-orders .lo-cols { grid-template-columns: minmax(0, 1fr); } }
.lgk-orders h4 { font-size: 13px; color: var(--lg-muted); font-weight: 600; margin-bottom: 8px; }
.lgk-orders .lo-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.lgk-orders .lo-order { border: 1px solid var(--lg-line); border-radius: var(--lg-radius-md); padding: 10px 12px; display: grid; gap: 6px; background: var(--lg-bg); }
.lgk-orders .lo-order.focus { border-color: var(--lg-lake); box-shadow: 0 0 0 1px var(--lg-lake); }
.lgk-orders .lo-top { display: flex; justify-content: space-between; gap: 8px; align-items: center; flex-wrap: wrap; }
.lgk-orders .lo-top button { border: 0; background: none; padding: 0; color: var(--lg-ink); font-weight: 600; }
.lgk-orders .lo-top button:hover { color: var(--lg-lake); }
.lgk-orders .lo-lines { font-size: 12px; color: var(--lg-muted); }
.lgk-orders .lo-track { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; }
.lgk-orders .lo-track span { height: 4px; border-radius: 2px; background: var(--lg-line); }
.lgk-orders .lo-track span.on { background: var(--lg-ok); }
.lgk-orders .lo-track.cancelled span.on { background: var(--lg-bad); }
.lgk-orders .lo-mail { border-left: 3px solid var(--lg-notification); padding: 4px 0 4px 10px; display: grid; gap: 2px; font-size: 13px; }
.lgk-orders .lo-mail time { font-size: 11px; color: var(--lg-muted); font-variant-numeric: tabular-nums; }
`;

const FLOW: Order['status'][] = ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

export default function OrdersApp() {
  const connection = useLagoski();
  return (
    <div className="lgk-orders">
      <style>{css}</style>
      <section className="lg-panel" aria-labelledby="lo-title">
        <div className="lg-head">
          <h3 id="lo-title">Meus pedidos</h3>
          <span className="lg-owner">Ordering · Fulfillment · Notification</span>
        </div>
        {connection ? <Orders client={connection.client} /> : <p className="lg-empty">Conectando…</p>}
      </section>
    </div>
  );
}

function Orders({ client }: { client: LagoskiClient }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [mails, setMails] = useState<Notification[]>([]);
  const [focus, setFocus] = useState<string | null>(null);
  const pending = useRef<number | null>(null);

  const load = useCallback(async () => {
    const { customerId } = session();
    const [o, n] = await Promise.all([client.listOrders(customerId), client.listNotifications(customerId)]);
    setOrders(o);
    setMails(n);
  }, [client]);

  useEffect(() => {
    void load();
    const offPlaced = onBrowser('lagoski:order-placed', () => void load());
    const offFocus = onBrowser('lagoski:focus-order', ({ orderId }) => setFocus(orderId));
    return () => {
      offPlaced();
      offFocus();
    };
  }, [load]);

  // Agrupa rajadas de eventos numa recarga só, depois que os consumidores tiveram
  // tempo de processar (o observer vê o evento antes deles).
  useBusEvents(
    client,
    useCallback(
      (e: ObservedEvent) => {
        if (e.topic === 'catalog.events') return;
        if (pending.current !== null) window.clearTimeout(pending.current);
        pending.current = window.setTimeout(() => {
          pending.current = null;
          void load();
        }, 900);
      },
      [load],
    ),
  );

  return (
    <div className="lo-cols">
      <div>
        <h4>Pedidos</h4>
        {orders.length === 0 ? (
          <p className="lg-empty">Nenhum pedido ainda.</p>
        ) : (
          <ul className="lo-list">
            {orders.map((o) => {
              const reached = new Set(o.history.map((h) => h.status));
              const cancelled = o.status === 'CANCELLED';
              return (
                <li key={o.id} className={`lo-order ${focus === o.id ? 'focus' : ''}`} data-order={o.id}>
                  <div className="lo-top">
                    <button type="button" title="Ver os eventos deste pedido no Event Inspector" onClick={() => emitBrowser('lagoski:focus-order', { orderId: o.id })}>
                      Pedido {shortId(o.id)} · {brl(o.totalCents)}
                    </button>
                    <span className={`lg-pill ${cancelled ? 'bad' : o.status === 'DELIVERED' ? 'ok' : 'info'}`}>
                      {STATUS_LABEL[o.status]}
                      {cancelled && o.cancelReason ? ` · ${CANCEL_LABEL[o.cancelReason]}` : ''}
                    </span>
                  </div>
                  <div className={`lo-track ${cancelled ? 'cancelled' : ''}`} aria-hidden="true">
                    {FLOW.map((s) => (
                      <span key={s} className={reached.has(s) ? 'on' : ''} />
                    ))}
                  </div>
                  <div className="lo-lines">
                    {o.lines.map((l) => `${l.quantity}× ${l.productName} ${l.size} ${l.color.toLowerCase()}`).join(' · ')}
                    {o.trackingCode && (
                      <>
                        {' '}
                        · rastreio <code>{o.trackingCode}</code>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div>
        <h4>E-mails enviados</h4>
        {mails.length === 0 ? (
          <p className="lg-empty">Nada por enquanto.</p>
        ) : (
          <div className="lo-list">
            {mails.map((m) => (
              <article key={`${m.orderId}-${m.template}-${m.sentAt}`} className="lo-mail">
                <strong>{m.subject}</strong>
                <span>{m.body}</span>
                <time dateTime={m.sentAt}>{new Date(m.sentAt).toLocaleTimeString('pt-BR')}</time>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
