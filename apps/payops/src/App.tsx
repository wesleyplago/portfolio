import { formatCents } from '@portfolio/payops-contracts';
import { ActivityLog } from './components/ActivityLog';
import { ApprovalInbox } from './components/ApprovalInbox';
import { OperatorPanel } from './components/OperatorPanel';
import { config } from './config';
import { css } from './styles';
import { usePayOps } from './usePayOps';

/**
 * Raiz do microfrontend. É o módulo exposto como `payops/App` via Module
 * Federation: o portfólio importa este componente e o renderiza numa rota.
 */
export default function PayOpsApp() {
  const api = usePayOps();

  return (
    <div className="payops">
      <style>{css}</style>

      <header className="po-top">
        <div className="po-brand">
          <div className="po-logo">P</div>
          <div>
            <h2>PayOps Console</h2>
            <div className="po-sub">Agente de pagamentos com raio de explosão controlado</div>
          </div>
        </div>
        <div className="po-status">
          <span className={`po-pill ${api.online ? 'ok' : api.online === false ? 'bad' : ''}`}>
            <span className="po-dot" />
            {api.online === null ? 'verificando API…' : api.online ? 'API online' : 'API offline'}
          </span>
          <a className="po-pill" href={config.jaegerUrl} target="_blank" rel="noreferrer">
            Jaeger ↗
          </a>
        </div>
      </header>

      {api.online === false && (
        <div className="po-banner bad" style={{ marginBottom: 16 }}>
          Não consegui falar com <code>{config.apiUrl}</code>. Suba o backend com <code>docker compose up -d</code> na
          pasta do payops-agent.
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
    </div>
  );
}
