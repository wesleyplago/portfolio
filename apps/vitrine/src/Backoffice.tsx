import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  DEMO_ADMIN,
  STORE_LABEL,
  VitrineApiError,
  type FunnelReport,
  type Product,
  type Session,
  type VitrineClient,
} from '@portfolio/vitrine-contracts';
import { errorMessage, money, percent } from './format';

type BackofficeProps = {
  client: VitrineClient;
  session: Session | null;
  onSession: (s: Session | null) => void;
};

/**
 * Backoffice do único usuário admin. A sessão vive em memória na raiz do
 * microfrontend: sobrevive à troca de aba, mas recarregar a página pede login.
 */
export function Backoffice({ client, session, onSession }: BackofficeProps) {
  const logout = useCallback(() => onSession(null), [onSession]);
  return session ? (
    <Dashboard client={client} session={session} onLogout={logout} />
  ) : (
    <Login client={client} onLogin={onSession} />
  );
}

function Login({ client, onLogin }: { client: VitrineClient; onLogin: (s: Session) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onLogin(await client.login({ username, password }));
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="vt-section vt-login vt-bo">
      <form onSubmit={submit} className="vt-panel">
        <h2>Entrar no backoffice</h2>
        <label htmlFor="vt-user">Usuário</label>
        <input id="vt-user" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <label htmlFor="vt-pass">Senha</label>
        <input
          id="vt-pass"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p className="vt-error" role="alert">
            {error}
          </p>
        )}
        <button className="vt-primary" type="submit" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        {client.mode === 'mock' && (
          <p className="vt-hint">
            Modo demo: usuário <code>{DEMO_ADMIN.username}</code>, senha <code>{DEMO_ADMIN.password}</code>.
          </p>
        )}
      </form>
    </section>
  );
}

function Dashboard({ client, session, onLogout }: { client: VitrineClient; session: Session; onLogout: () => void }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [funnel, setFunnel] = useState<FunnelReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sessão expirada em qualquer chamada volta para o login.
  const guard = useCallback(
    (err: unknown) => {
      if (err instanceof VitrineApiError && err.status === 401) onLogout();
      else setError(errorMessage(err));
    },
    [onLogout],
  );

  const reload = useCallback(async () => {
    try {
      const [page, report] = await Promise.all([
        client.admin.listProducts(session.token),
        client.admin.funnel(session.token),
      ]);
      setProducts(page.items);
      setFunnel(report);
      setError(null);
    } catch (err: unknown) {
      guard(err);
    }
  }, [client, session.token, guard]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggle = async (p: Product) => {
    try {
      await client.admin.setStatus(session.token, p.id, p.status === 'published' ? 'draft' : 'published');
      await reload();
    } catch (err: unknown) {
      guard(err);
    }
  };

  const totals = funnel?.rows.reduce(
    (acc, r) => ({ clicks: acc.clicks + r.clicks, orders: acc.orders + r.orders, commission: acc.commission + r.commission }),
    { clicks: 0, orders: 0, commission: 0 },
  );

  return (
    <section className="vt-section vt-bo">
      <div className="vt-bar">
        <span>
          Logado como <strong>{session.username}</strong>
        </span>
        <button className="vt-ghost" onClick={onLogout}>
          Sair
        </button>
      </div>
      {error && <p className="vt-error">{error}</p>}

      {totals && (
        <div className="vt-stats">
          <div>
            <span>Cliques</span>
            <strong>{totals.clicks}</strong>
          </div>
          <div>
            <span>Pedidos</span>
            <strong>{totals.orders}</strong>
          </div>
          <div>
            <span>Comissão estimada</span>
            <strong>{money(totals.commission)}</strong>
          </div>
        </div>
      )}

      <div className="vt-panel">
        <h2>Produtos</h2>
        {!products ? (
          <p className="vt-empty">Carregando…</p>
        ) : (
          <div className="vt-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Loja</th>
                  <th className="num">Preço</th>
                  <th className="num">Comissão</th>
                  <th className="num">Cliques</th>
                  <th className="num">Pedidos</th>
                  <th>Status</th>
                  <th>
                    <span className="vt-sr">Ação</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const row = funnel?.rows.find((r) => r.productId === p.id);
                  return (
                    <tr key={p.id}>
                      <td>{p.title}</td>
                      <td>
                        <span className={`vt-store ${p.store}`}>{STORE_LABEL[p.store]}</span>
                      </td>
                      <td className="num">{money(p.priceTo)}</td>
                      <td className="num">{percent(p.commissionRate)}</td>
                      <td className="num">{row?.clicks ?? 0}</td>
                      <td className="num">{row?.orders ?? 0}</td>
                      <td>
                        <span className={`vt-status ${p.status}`}>
                          {p.status === 'published' ? 'Publicado' : 'Rascunho'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="vt-ghost"
                          onClick={() => void toggle(p)}
                          aria-label={`${p.status === 'published' ? 'Despublicar' : 'Publicar'} ${p.title}`}
                        >
                          {p.status === 'published' ? 'Despublicar' : 'Publicar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="vt-forms">
        <AddShopee client={client} token={session.token} onAdded={reload} onError={guard} />
        <AddMercadoLivre client={client} token={session.token} onAdded={reload} onError={guard} />
      </div>
    </section>
  );
}

type FormProps = {
  client: VitrineClient;
  token: string;
  onAdded: () => Promise<void>;
  onError: (err: unknown) => void;
};

/** Erro de validação fica no próprio formulário; 401 sobe para o painel. */
function useSubmit({ onAdded, onError }: Pick<FormProps, 'onAdded' | 'onError'>) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<unknown>, reset: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      reset();
      await onAdded();
    } catch (err: unknown) {
      if (err instanceof VitrineApiError && err.status === 401) onError(err);
      else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return { error, busy, run };
}

function AddShopee({ client, token, ...rest }: FormProps) {
  const [url, setUrl] = useState('');
  const { error, busy, run } = useSubmit(rest);
  return (
    <form
      className="vt-panel"
      onSubmit={(e) => {
        e.preventDefault();
        void run(() => client.admin.addShopee(token, { url }), () => setUrl(''));
      }}
    >
      <h2>Adicionar da Shopee</h2>
      <p className="vt-hint">A API da Shopee preenche título, preço e comissão e gera o link de afiliado.</p>
      <label htmlFor="vt-shopee-url">URL do produto</label>
      <input
        id="vt-shopee-url"
        placeholder="https://shopee.com.br/…"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      {error && <p className="vt-error">{error}</p>}
      <button className="vt-primary" type="submit" disabled={busy || !url}>
        Importar como rascunho
      </button>
    </form>
  );
}

function AddMercadoLivre({ client, token, ...rest }: FormProps) {
  const [affiliateUrl, setAffiliateUrl] = useState('');
  const { error, busy, run } = useSubmit(rest);
  return (
    <form
      className="vt-panel"
      onSubmit={(e) => {
        e.preventDefault();
        void run(() => client.admin.addMercadoLivre(token, { affiliateUrl }), () => setAffiliateUrl(''));
      }}
    >
      <h2>Adicionar do Mercado Livre</h2>
      <p className="vt-hint">
        Gere o link no portal de afiliados do ML (Ferramentas → Gerador de link) e cole aqui. Título, preço, foto e
        categoria vêm do anúncio.
      </p>
      <label htmlFor="vt-ml-link">Link de afiliado</label>
      <input
        id="vt-ml-link"
        placeholder="https://mercadolivre.com/sec/…"
        value={affiliateUrl}
        onChange={(e) => setAffiliateUrl(e.target.value)}
      />
      {error && <p className="vt-error">{error}</p>}
      <button className="vt-primary" type="submit" disabled={busy || !affiliateUrl}>
        {busy ? 'Buscando dados do anúncio…' : 'Importar como rascunho'}
      </button>
    </form>
  );
}
