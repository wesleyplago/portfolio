import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  brl,
  emitBrowser,
  ensureCart,
  LagoskiApiError,
  lagoskiTokens,
  type LagoskiClient,
  type ObservedEvent,
  type Product,
  type StockItem,
} from '@portfolio/lagoski-contracts';
import { TeeArt } from './TeeArt';
import { useBusEvents, useLagoski } from './useLagoski';

const css =
  lagoskiTokens('.lgk-catalog') +
  `
.lgk-catalog .lc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px; }
.lgk-catalog .lc-card { border: 1px solid var(--lg-line); border-radius: var(--lg-radius); background: var(--lg-bg); padding: 12px; display: grid; gap: 8px; align-content: start; }
.lgk-catalog .lc-art { width: 100%; max-width: 100%; aspect-ratio: 1; display: block; background: var(--lg-surface); border-radius: 10px; }
.lgk-catalog .lc-name { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
.lgk-catalog .lc-name h4 { font-size: 15px; }
.lgk-catalog .lc-price { font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
.lgk-catalog .lc-desc { color: var(--lg-muted); font-size: 13px; min-height: 2.6em; }
.lgk-catalog .lc-row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.lgk-catalog .lc-swatch { width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--lg-surface); box-shadow: 0 0 0 1px var(--lg-line); padding: 0; }
.lgk-catalog .lc-swatch[aria-pressed="true"] { box-shadow: 0 0 0 2px var(--lg-lake); }
.lgk-catalog .lc-size { min-width: 34px; padding: 3px 6px; border-radius: 7px; border: 1px solid var(--lg-line); background: var(--lg-surface); color: var(--lg-ink); font-size: 12px; font-weight: 600; }
.lgk-catalog .lc-size[aria-pressed="true"] { background: var(--lg-lake-strong); border-color: var(--lg-lake-strong); color: #fff; }
.lgk-catalog .lc-stock { font-size: 12px; color: var(--lg-muted); font-variant-numeric: tabular-nums; }
.lgk-catalog .lc-stock.low { color: var(--lg-warn); font-weight: 600; }
.lgk-catalog .lc-stock.out { color: var(--lg-bad); font-weight: 600; }
.lgk-catalog .lc-feedback { min-height: 18px; font-size: 12px; }
.lgk-catalog .lc-feedback.ok { color: var(--lg-ok); }
`;

export default function CatalogApp() {
  const connection = useLagoski();
  return (
    <div className="lgk-catalog">
      <style>{css}</style>
      <section className="lg-panel" aria-labelledby="lc-title">
        <div className="lg-head">
          <h3 id="lc-title">Coleção</h3>
          <span className="lg-owner">Catalog · estoque via Inventory</span>
        </div>
        {connection ? <Catalog client={connection.client} /> : <p className="lg-empty">Conectando…</p>}
      </section>
    </div>
  );
}

function Catalog({ client }: { client: LagoskiClient }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [stock, setStock] = useState<Map<string, StockItem>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const skus = useMemo(() => products?.flatMap((p) => p.variants.map((v) => v.sku)) ?? [], [products]);

  const refreshStock = useCallback(async () => {
    if (skus.length === 0) return;
    try {
      const items = await client.getStock(skus);
      setStock(new Map(items.map((i) => [i.sku, i])));
    } catch {
      // estoque é informativo; a reserva decide
    }
  }, [client, skus]);

  useEffect(() => {
    client
      .listProducts()
      .then(setProducts)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [client]);

  useEffect(() => {
    void refreshStock();
  }, [refreshStock]);

  // O estoque muda por eventos do Inventory (reserva, baixa, liberação).
  useBusEvents(
    client,
    useCallback(
      (e: ObservedEvent) => {
        if (e.topic === 'inventory.events') void refreshStock();
      },
      [refreshStock],
    ),
  );

  if (error) return <p className="lg-error">Não consegui carregar o catálogo: {error}</p>;
  if (!products) return <p className="lg-empty">Carregando a coleção…</p>;
  return (
    <div className="lc-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} stock={stock} client={client} onChanged={refreshStock} />
      ))}
    </div>
  );
}

function ProductCard({ product, stock, client, onChanged }: { product: Product; stock: Map<string, StockItem>; client: LagoskiClient; onChanged: () => void }) {
  const colors = useMemo(() => [...new Map(product.variants.map((v) => [v.color, v.colorHex])).entries()], [product]);
  const [color, setColor] = useState(colors[0]![0]);
  const [size, setSize] = useState<string>('M');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const sizes = product.variants.filter((v) => v.color === color).map((v) => v.size);
  const variant = product.variants.find((v) => v.color === color && v.size === size) ?? product.variants.find((v) => v.color === color)!;
  const item = stock.get(variant.sku);
  const available = item?.available;

  async function add() {
    setBusy(true);
    setFeedback(null);
    try {
      const cartId = await ensureCart(client);
      const cart = await client.addItem(cartId, variant.sku, 1);
      emitBrowser('lagoski:cart-changed', { cartId: cart.id, itemCount: cart.items.reduce((n, i) => n + i.quantity, 0) });
      setFeedback({ ok: true, text: `${variant.size} ${variant.color.toLowerCase()} no carrinho` });
      onChanged();
    } catch (e) {
      setFeedback({ ok: false, text: e instanceof LagoskiApiError ? e.message : 'falha ao adicionar' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="lc-card" aria-label={product.name}>
      <TeeArt color={variant.colorHex} artwork={product.artwork} label={`${product.name}, ${variant.color}`} />
      <div className="lc-name">
        <h4>{product.name}</h4>
        <span className="lc-price">{brl(variant.priceCents)}</span>
      </div>
      <p className="lc-desc">{product.description}</p>
      <div className="lc-row" role="group" aria-label="Cor">
        {colors.map(([name, hex]) => (
          <button
            key={name}
            type="button"
            className="lc-swatch"
            style={{ background: hex }}
            aria-label={name}
            aria-pressed={name === color}
            title={name}
            onClick={() => setColor(name)}
          />
        ))}
      </div>
      <div className="lc-row" role="group" aria-label="Tamanho">
        {sizes.map((s) => (
          <button key={s} type="button" className="lc-size" aria-pressed={s === variant.size} onClick={() => setSize(s)}>
            {s}
          </button>
        ))}
      </div>
      <div className={`lc-stock ${available === 0 ? 'out' : available !== undefined && available <= 3 ? 'low' : ''}`}>
        {available === undefined ? 'estoque…' : available === 0 ? 'Esgotado' : `${available} disponíveis`} · <code>{variant.sku}</code>
      </div>
      <button type="button" className="lg-btn primary" disabled={busy || available === 0} onClick={() => void add()}>
        {busy ? 'Adicionando…' : 'Adicionar ao carrinho'}
      </button>
      <div className={`lc-feedback ${feedback?.ok ? 'ok' : 'lg-error'}`} role="status">
        {feedback?.text}
      </div>
    </article>
  );
}
