import { useCallback, useEffect, useState } from 'react';
import {
  contextOf,
  lagoskiTokens,
  onBrowser,
  session,
  shortId,
  shortType,
  type Connection,
  type LagoskiClient,
  type ObservedEvent,
  type Simulator,
  type SubscriptionStats,
} from '@portfolio/lagoski-contracts';
import { useBusEvents, useLagoski } from './useLagoski';

const css =
  lagoskiTokens('.lgk-inspector') +
  `
.lgk-inspector .li-bar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 12px; font-size: 13px; }
.lgk-inspector .li-cols { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 16px; }
@media (max-width: 900px) { .lgk-inspector .li-cols { grid-template-columns: minmax(0, 1fr); } }
.lgk-inspector h4 { font-size: 13px; color: var(--lg-muted); font-weight: 600; margin-bottom: 8px; }
.lgk-inspector .li-events { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; max-height: 460px; overflow: auto; }
.lgk-inspector .li-event { border: 1px solid var(--lg-line); border-left: 3px solid var(--c); border-radius: 8px; background: var(--lg-bg); }
.lgk-inspector .li-event > button { width: 100%; text-align: left; border: 0; background: none; color: var(--lg-ink); padding: 6px 10px; display: grid; grid-template-columns: auto auto minmax(0, 1fr) auto; gap: 8px; align-items: center; font-size: 13px; }
.lgk-inspector .li-time { font: 11px var(--lg-mono); color: var(--lg-muted); font-variant-numeric: tabular-nums; }
.lgk-inspector .li-type { font-family: var(--lg-mono); font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lgk-inspector .li-corr { font: 11px var(--lg-mono); color: var(--lg-muted); }
.lgk-inspector .li-event pre { margin: 0; padding: 8px 10px; border-top: 1px solid var(--lg-line); font: 11.5px/1.45 var(--lg-mono); overflow: auto; max-height: 220px; color: var(--lg-ink); }
.lgk-inspector .li-table-wrap { overflow-x: auto; }
.lgk-inspector table { border-collapse: collapse; width: 100%; font-size: 12px; font-variant-numeric: tabular-nums; }
.lgk-inspector th, .lgk-inspector td { padding: 5px 6px; text-align: left; border-bottom: 1px solid var(--lg-line); white-space: nowrap; }
.lgk-inspector th { color: var(--lg-muted); font-weight: 600; }
.lgk-inspector td.num { text-align: right; }
.lgk-inspector td.hot { color: var(--lg-bad); font-weight: 700; }
.lgk-inspector td.wait { color: var(--lg-warn); font-weight: 700; }
.lgk-inspector .li-chaos { display: grid; gap: 6px; margin-top: 14px; }
.lgk-inspector .li-chaos .lg-btn { justify-content: flex-start; text-align: left; }
.lgk-inspector .li-note { font-size: 12px; color: var(--lg-muted); }
.lgk-inspector .li-log { font-size: 12px; min-height: 18px; }
`;

const CONSUMERS = ['ordering', 'inventory', 'payment', 'fulfillment', 'notification'];

export default function InspectorApp() {
  const connection = useLagoski();
  return (
    <div className="lgk-inspector">
      <style>{css}</style>
      <section className="lg-panel" aria-labelledby="li-title">
        <div className="lg-head">
          <h3 id="li-title">Event Inspector</h3>
          <span className="lg-owner">observer do barramento · sem filtro</span>
        </div>
        {connection ? <Inspector connection={connection} /> : <p className="lg-empty">Conectando…</p>}
      </section>
    </div>
  );
}

function Inspector({ connection }: { connection: Connection }) {
  const { client } = connection;
  const [events, setEvents] = useState<ObservedEvent[]>([]);
  const [focus, setFocus] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    client
      .recentEvents()
      .then((list) => setEvents((current) => (current.length ? current : list.slice(-150).reverse())))
      .catch(() => undefined);
    return onBrowser('lagoski:focus-order', ({ orderId }) => setFocus(orderId));
  }, [client]);

  useBusEvents(
    client,
    useCallback((e: ObservedEvent) => setEvents((list) => (list.some((x) => x.event.id === e.event.id) ? list : [e, ...list].slice(0, 150))), []),
  );

  const visible = focus ? events.filter((e) => e.event.correlationid === focus) : events.filter((e) => e.topic !== 'catalog.events');
  const live = client.mode === 'live';

  return (
    <>
      <div className="li-bar">
        <span className={`lg-pill ${live ? 'ok' : 'warn'}`}>{live ? 'microsserviços reais via BFF (SSE)' : 'modo demo · barramento simulado'}</span>
        {!live && connection.reason && <span className="li-note">{connection.reason}</span>}
        {focus ? (
          <>
            <span>
              Pedido <code>{shortId(focus)}</code>: {visible.length} eventos
            </span>
            <button type="button" className="lg-btn small" onClick={() => setFocus(null)}>
              Ver todos
            </button>
          </>
        ) : (
          <span className="li-note">Clique num pedido para ver só a saga dele. Eventos do catálogo ocultos.</span>
        )}
      </div>
      <div className="li-cols">
        <div>
          <h4>Eventos (mais recente primeiro)</h4>
          {visible.length === 0 ? (
            <p className="lg-empty">Adicione uma camiseta e feche um pedido para ver a saga.</p>
          ) : (
            <ol className="li-events" aria-label="Eventos do barramento">
              {visible.map((e) => {
                const ctx = contextOf(e.event.type);
                const isOpen = open === e.event.id;
                return (
                  <li key={e.event.id} className={`li-event ctx-${ctx}`} data-type={e.event.type}>
                    <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : e.event.id)}>
                      <span className="li-time">{e.receivedAt.slice(11, 23)}</span>
                      <span className="lg-ctx">{e.topic}</span>
                      <span className="li-type">{shortType(e.event.type)}</span>
                      <span className="li-corr">{shortId(e.event.correlationid)}</span>
                    </button>
                    {isOpen && <pre>{JSON.stringify(e.event, null, 2)}</pre>}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
        <div>
          <h4>Filas por assinatura</h4>
          {client.simulator ? (
            <Topology simulator={client.simulator} />
          ) : (
            <p className="li-note">
              Os contadores das filas vêm do broker simulado. No modo real, veja as filas e DLQs no LocalStack ou no console da nuvem.
            </p>
          )}
          <Chaos client={client} focus={focus} />
        </div>
      </div>
    </>
  );
}

function useTopology(simulator: Simulator) {
  const [stats, setStats] = useState<SubscriptionStats[]>(() => simulator.topology());
  useEffect(() => {
    let frame = 0;
    return simulator.onTopology(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setStats(simulator.topology()));
    });
  }, [simulator]);
  return stats;
}

function Topology({ simulator }: { simulator: Simulator }) {
  const stats = useTopology(simulator);
  return (
    <div className="li-table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Consumidor ← tópico</th>
            <th scope="col">Filtro</th>
            <th scope="col">Fila</th>
            <th scope="col">Ok</th>
            <th scope="col">Retry</th>
            <th scope="col">Dup.</th>
            <th scope="col">DLQ</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.name} title={s.name}>
              <td>
                <span className={`lg-ctx ctx-${s.consumer}`}>{s.consumer}</span> ← {s.topic.split('.')[0]}
                {s.paused && ' ⏸'}
              </td>
              <td title={s.eventTypes.join('\n')}>{s.eventTypes.length || 'todos'}</td>
              <td className={`num ${s.pending > 0 ? 'wait' : ''}`}>{s.pending}</td>
              <td className="num">{s.delivered}</td>
              <td className="num">{s.retries}</td>
              <td className="num">{s.duplicates}</td>
              <td className={`num ${s.dlq > 0 ? 'hot' : ''}`}>
                {s.dlq}
                {s.dlq > 0 && (
                  <>
                    {' '}
                    <button type="button" className="lg-btn small" onClick={() => simulator.redrive(s.name)}>
                      Reprocessar
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Chaos({ client, focus }: { client: LagoskiClient; focus: string | null }) {
  const sim = client.simulator;
  const [log, setLog] = useState<string | null>(null);
  const [paused, setPaused] = useState<Record<string, boolean>>({});

  async function zeroCartStock() {
    const { cartId } = session();
    if (!cartId) return setLog('Adicione algo ao carrinho primeiro.');
    try {
      const cart = await client.getCart(cartId);
      for (const i of cart.items) await client.setStock(i.sku, 0);
      setLog(`Estoque zerado para ${cart.items.length} SKU(s) do carrinho. Feche o pedido: o Inventory vai rejeitar a reserva.`);
    } catch (e) {
      setLog(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="li-chaos">
      <h4>Cenários</h4>
      <button type="button" className="lg-btn small" onClick={() => void zeroCartStock()}>
        Zerar o estoque dos itens do carrinho
      </button>
      {sim ? (
        <>
          {CONSUMERS.filter((c) => c === 'fulfillment' || c === 'notification').map((c) => (
            <button
              key={c}
              type="button"
              className="lg-btn small"
              aria-pressed={!!paused[c]}
              onClick={() => {
                const next = !paused[c];
                sim.setPaused(c, next);
                setPaused((p) => ({ ...p, [c]: next }));
                setLog(next ? `${c} parado: as mensagens acumulam na fila dele; os outros serviços seguem.` : `${c} voltou e processa o atraso.`);
              }}
            >
              {paused[c] ? `Religar o ${c}` : `Derrubar o ${c}`}
            </button>
          ))}
          <button
            type="button"
            className="lg-btn small"
            onClick={() => {
              sim.publishPoison();
              setLog('order.placed com corpo inválido publicado: Inventory e Payment tentam 5 vezes e mandam para a DLQ.');
            }}
          >
            Publicar uma mensagem envenenada
          </button>
          <button
            type="button"
            className="lg-btn small"
            onClick={() => setLog(sim.redeliverLast() ? 'Último evento entregue de novo: o inbox de cada consumidor ignora (coluna Dup.).' : 'Nenhum evento ainda.')}
          >
            Reentregar o último evento (duplicata)
          </button>
          <button
            type="button"
            className="lg-btn small"
            disabled={!focus}
            onClick={() => {
              if (!focus) return;
              sim.expireReservation(focus);
              setLog('Reserva vencida: reservation.expired → o Ordering cancela → o Payment expira o checkout.');
            }}
          >
            Vencer a reserva do pedido em foco
          </button>
        </>
      ) : (
        <p className="li-note">Derrubar consumidores, mensagem envenenada e duplicatas existem no modo demo.</p>
      )}
      <p className="li-log" role="status">
        {log}
      </p>
    </div>
  );
}
