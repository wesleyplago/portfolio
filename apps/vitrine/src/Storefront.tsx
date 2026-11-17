import { useEffect, useState } from 'react';
import { STORE_LABEL, type Product, type Store, type VitrineClient } from '@portfolio/vitrine-contracts';
import { errorMessage, money } from './format';

export function Storefront({ client }: { client: VitrineClient }) {
  const [q, setQ] = useState('');
  const [store, setStore] = useState<Store | undefined>(undefined);
  const [items, setItems] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      client
        .listProducts({ q: q.trim() || undefined, store })
        .then((page) => alive && (setItems(page.items), setError(null)))
        .catch((e: unknown) => alive && setError(errorMessage(e)));
    }, 200);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [client, q, store]);

  return (
    <section className="vt-section">
      <div className="vt-filters">
        <input
          id="vt-search"
          type="search"
          placeholder="Buscar produto ou categoria"
          aria-label="Buscar produto ou categoria"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="vt-chips" role="group" aria-label="Loja">
          {([undefined, 'shopee', 'mercadolivre'] as const).map((s) => (
            <button key={s ?? 'all'} aria-pressed={store === s} onClick={() => setStore(s)}>
              {s ? STORE_LABEL[s] : 'Todas'}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="vt-error">{error}</p>}
      {!items && !error && <p className="vt-empty">Carregando ofertas…</p>}
      {items?.length === 0 && <p className="vt-empty">Nenhuma oferta encontrada.</p>}

      <ul className="vt-grid">
        {items?.map((p) => <ProductCard key={p.id} product={p} client={client} />)}
      </ul>

      <p className="vt-disclosure">
        Somos afiliados da Shopee e do Mercado Livre. Podemos receber comissão pelas compras feitas pelos links, sem
        custo extra para você. Preços podem mudar na loja.
      </p>
    </section>
  );
}

function ProductCard({ product: p, client }: { product: Product; client: VitrineClient }) {
  const link = p.links.find((l) => l.channel === 'site') ?? p.links[0]!;
  const off = p.priceFrom && p.priceFrom > p.priceTo ? Math.round((1 - p.priceTo / p.priceFrom) * 100) : null;

  return (
    <li className="vt-card">
      <div className={`vt-thumb ${p.store}`} aria-hidden="true">
        {p.imageUrl ? <img src={p.imageUrl} alt="" /> : <span>{p.category}</span>}
      </div>
      <div className="vt-card-body">
        <span className={`vt-store ${p.store}`}>{STORE_LABEL[p.store]}</span>
        <h3>{p.title}</h3>
        <div className="vt-price">
          {p.priceFrom && <s>{money(p.priceFrom)}</s>}
          <strong>{money(p.priceTo)}</strong>
          {off !== null && <em>{off}% off</em>}
        </div>
        {/*
          Comissão: o href é o link oficial, sem redirect pelo nosso domínio
          (o ML proíbe encurtador e link que esconda o domínio). O clique é
          contado em paralelo, por sendBeacon, e nunca atrasa a ida à loja.
        */}
        <a
          className="vt-buy"
          href={link.url}
          target="_blank"
          rel="sponsored nofollow noopener"
          onClick={() => client.trackClick({ productId: p.id, store: p.store, channel: link.channel })}
        >
          {p.store === 'shopee' ? 'Comprar na Shopee' : 'Comprar no Mercado Livre'}
        </a>
      </div>
    </li>
  );
}
