import { createLagoskiClient, type LagoskiClient } from './client';
import { createMockLagoskiClient } from './mock/system';

export type Connection = {
  client: LagoskiClient;
  /** Por que estamos em modo demo (ausente no modo real). */
  reason?: string;
};

/**
 * Os quatro microfrontends são bundles separados (cada um com sua cópia deste
 * pacote), mas precisam falar com o MESMO backend: o mesmo BFF ou o mesmo
 * sistema simulado. A conexão e a sessão ficam num registro global da aba.
 */
type Registry = { connection?: Promise<Connection>; session?: Session };
const KEY = Symbol.for('lagoski.runtime');
const registry = (): Registry => {
  const g = globalThis as unknown as Record<symbol, Registry>;
  return (g[KEY] ??= {});
};

const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);

/**
 * Decide uma vez por aba: BFF declarado e respondendo → real; qualquer outra
 * coisa → sistema simulado. Não troca no meio da sessão.
 */
export function connect(apiUrl: string | undefined): Promise<Connection> {
  const r = registry();
  r.connection ??= (async () => {
    const url = clean(apiUrl);
    if (!url) return { client: createMockLagoskiClient(), reason: 'VITE_LAGOSKI_API_URL não declarada' };
    const live = createLagoskiClient({ baseUrl: url });
    if (await live.ready()) return { client: live };
    return { client: createMockLagoskiClient(), reason: `BFF ${url} fora do ar na subida` };
  })();
  return r.connection;
}

/** Só para testes: esquece a conexão e a sessão da aba. */
export function resetRuntime(): void {
  const r = registry();
  delete r.connection;
  delete r.session;
}

/* -------------------------------- sessão -------------------------------- */

export type Session = { customerId: string; cartId: string | null };

const STORAGE = 'lagoski.session';

function load(): Session {
  try {
    const raw = sessionStorage.getItem(STORAGE);
    if (raw) return JSON.parse(raw) as Session;
  } catch {
    // sessionStorage indisponível: sessão só em memória
  }
  return { customerId: `cus_guest_${Math.random().toString(36).slice(2, 10)}`, cartId: null };
}

/** Cliente "guest" desta aba e o carrinho aberto, compartilhados entre os microfrontends. */
export function session(): Session {
  const r = registry();
  r.session ??= load();
  return r.session;
}

export function updateSession(patch: Partial<Session>): Session {
  const r = registry();
  r.session = { ...session(), ...patch };
  try {
    sessionStorage.setItem(STORAGE, JSON.stringify(r.session));
  } catch {
    // ignore
  }
  return r.session;
}

/** Garante um carrinho aberto (recria se o anterior virou pedido ou não existe mais). */
export async function ensureCart(client: LagoskiClient): Promise<string> {
  const current = session();
  if (current.cartId) {
    try {
      const cart = await client.getCart(current.cartId);
      if (!cart.orderId) return cart.id;
    } catch {
      // carrinho de outro backend (mock ↔ real): cria outro
    }
  }
  const cart = await client.createCart(current.customerId);
  updateSession({ cartId: cart.id });
  return cart.id;
}
