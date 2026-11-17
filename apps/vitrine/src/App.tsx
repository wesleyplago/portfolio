import { useEffect, useState } from 'react';
import type { Session } from '@portfolio/vitrine-contracts';
import { Backoffice } from './Backoffice';
import { connect, type Connection } from './connect';
import { Storefront } from './Storefront';
import { css } from './styles';

type View = 'vitrine' | 'backoffice';

/**
 * Raiz do microfrontend, exposta como `vitrine/App` via Module Federation.
 * Duas visões no mesmo remote: a vitrine pública e o backoffice do admin.
 */
export default function VitrineApp() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [view, setView] = useState<View>('vitrine');
  // A sessão fica aqui, e não no Backoffice, para sobreviver à troca de aba.
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let alive = true;
    void connect().then((c) => alive && setConnection(c));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="vt">
      <style>{css}</style>
      <header className="vt-top">
        <div className="vt-tabs" role="tablist" aria-label="Visão">
          <button role="tab" aria-selected={view === 'vitrine'} onClick={() => setView('vitrine')}>
            Vitrine
          </button>
          <button role="tab" aria-selected={view === 'backoffice'} onClick={() => setView('backoffice')}>
            Backoffice
          </button>
        </div>
        {connection && (
          <span className={`vt-mode ${connection.client.mode}`} title={connection.reason ?? connection.client.source}>
            {connection.client.mode === 'live' ? 'API real online' : 'modo demo · produtos de exemplo'}
          </span>
        )}
      </header>
      {!connection ? (
        <p className="vt-empty">Procurando a vitrine-api…</p>
      ) : view === 'vitrine' ? (
        <Storefront client={connection.client} />
      ) : (
        <Backoffice client={connection.client} session={session} onSession={setSession} />
      )}
    </div>
  );
}
