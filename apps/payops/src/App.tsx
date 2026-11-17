import { useEffect, useState } from 'react';
import { formatCents } from '@portfolio/payops-contracts';
import { ActivityLog } from './components/ActivityLog';
import { ApprovalInbox } from './components/ApprovalInbox';
import { OperatorPanel } from './components/OperatorPanel';
import { config } from './config';
import { connect, type Connection } from './connect';
import { fonts } from './fonts';
import { css } from './styles';
import { usePayOps } from './usePayOps';

/**
 * Raiz do microfrontend. É o módulo exposto como `payops/App` via Module
 * Federation: o portfólio importa este componente e o renderiza numa rota.
 *
 * Na subida decide entre a API real e o mock em memória (ver connect.ts), então
 * o microfrontend funciona mesmo sem backend.
 */
export default function PayOpsApp() {
  const [connection, setConnection] = useState<Connection | null>(null);

  useEffect(() => {
    let alive = true;
    void connect().then((c) => alive && setConnection(c));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="payops">
      <style>{fonts + css}</style>
      {connection ? (
        <Console connection={connection} />
      ) : (
        <div className="po-empty">
          <span className="po-spinner" /> Procurando a API do payops-agent…
        </div>
      )}
    </div>
  );
}

function Console({ connection }: { connection: Connection }) {
  const api = usePayOps(connection.client);
  const live = api.mode === 'live';
  const jaeger = live ? config.jaegerUrl : undefined;

  return (
    <>

      <header className="po-top">
        <div className="po-brand">
          <div className="po-logo">P</div>
          <div>
            <h2>PayOps Console</h2>
            <div className="po-sub">Agente de pagamentos com raio de explosão controlado</div>
          </div>
        </div>
        <div className="po-status">
          {live ? (
            <span className={`po-pill ${api.online ? 'ok' : api.online === false ? 'bad' : ''}`}>
              <span className="po-dot" />
              {api.online === null ? 'verificando API…' : api.online ? 'API real online' : 'API real offline'}
            </span>
          ) : (
            <span className="po-pill warn">
              <span className="po-dot" />
              modo demo · dados simulados
            </span>
          )}
          {jaeger && (
            <a className="po-pill" href={jaeger} target="_blank" rel="noreferrer">
              Jaeger ↗
            </a>
          )}
        </div>
      </header>

      {!live && (
        <div className="po-banner info" style={{ marginBottom: 16 }}>
          <b>Modo demo:</b> {connection.reason}. Estou usando um mock em memória com as mesmas regras do payops-agent
          (aprovação humana, idempotência, limite de estorno, allowlist de Pix, quarentena de documentos). Nada sai do
          navegador e o estado some ao recarregar. Para usar a API real, declare <code>VITE_PAYOPS_API_URL</code> e as
          chaves (veja <code>apps/payops/.env.example</code>).
        </div>
      )}

      {live && api.online === false && (
        <div className="po-banner bad" style={{ marginBottom: 16 }}>
          A API real <code>{config.apiUrl}</code> parou de responder. Suba o backend com{' '}
          <code>docker compose up -d</code> na pasta do payops-agent, ou recarregue para usar o modo demo.
        </div>
      )}

      <div className="po-grid">
        <div className="po-col">
          <OperatorPanel api={api} />
          <ActivityLog api={api} />
        </div>
        <div className="po-col">
          <ApprovalInbox api={api} />
          <section className="po-card">
            <div className="po-card-head">
              <h3>Saldos do ledger</h3>
              <button className="po-btn small" onClick={() => void api.refreshBalance()}>
                Atualizar
              </button>
            </div>
            {api.balance ? (
              <div className="po-balance">
                {api.balance.accounts.map((a) => (
                  <div key={a.name} className="po-balance-item">
                    <span className="po-sub">{a.name}</span>
                    <b>{formatCents(a.balance_cents)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <div className="po-empty">Sem dados.</div>
            )}
            <p className="po-hint" style={{ margin: '12px 0 0' }}>
              Partidas dobradas: todo lançamento tem débito e crédito do mesmo valor, conferidos antes do commit.
            </p>
          </section>
          <section className="po-card">
            <h4 style={{ marginBottom: 8 }}>O que testar</h4>
            <ul className="po-hint" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
              <li>Cobre, aprove e depois clique em “Repetir com a mesma chave”: volta a mesma transação.</li>
              <li>Estorne mais do que foi cobrado, mesmo aprovando: o ledger bloqueia.</li>
              <li>Mande Pix para <code>pix-atacante</code>: bloqueado antes de chegar em você.</li>
              <li>Negue uma aprovação: nada é gravado.</li>
              <li>Na aba “Prompt injection”, plante um ataque e veja a quarentena.</li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
