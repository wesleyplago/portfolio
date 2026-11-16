import { useEffect, useState } from 'react';
import { formatCents, type Approval } from '@portfolio/payops-contracts';
import type { usePayOps } from '../usePayOps';

type Api = ReturnType<typeof usePayOps>;

const TOOL_LABEL: Record<string, string> = {
  create_charge: 'Cobrança',
  refund: 'Estorno',
  send_pix: 'Pix',
};

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function amountOf(a: Approval): number | undefined {
  if (typeof a.amount_cents === 'number') return a.amount_cents;
  const v = a.arguments.amount_cents;
  return typeof v === 'number' ? v : undefined;
}

function ApprovalCard({ approval, api, now }: { approval: Approval; api: Api; now: number }) {
  const amount = amountOf(approval);
  const { amount_cents: _ignored, ...rest } = approval.arguments;
  const waitedS = Math.max(0, Math.floor((now - new Date(approval.requested_at).getTime()) / 1000));
  const leftS = approval.expires_at
    ? Math.max(0, Math.ceil((new Date(approval.expires_at).getTime() - now) / 1000))
    : undefined;
  return (
    <div className="po-approval">
      <div className="po-entry-head">
        <span className="po-pill warn">{TOOL_LABEL[approval.tool] ?? approval.tool}</span>
        <span className="po-countdown">
          aguardando há {waitedS}s{leftS !== undefined ? ` · expira em ${leftS}s` : ''}
        </span>
      </div>
      {amount !== undefined && <div className="po-approval-amount">{formatCents(amount)}</div>}
      <dl className="po-kv">
        {Object.entries(rest).map(([k, v]) => (
          <div key={k} style={{ display: 'contents' }}>
            <dt>{k}</dt>
            <dd className="mono">{String(v)}</dd>
          </div>
        ))}
        <dt>chave</dt>
        <dd className="mono">{approval.idempotency_key}</dd>
      </dl>
      <div className="po-actions">
        <button className="po-btn ok" onClick={() => void api.decide(approval, 'approved')}>
          Aprovar só esta ação
        </button>
        <button className="po-btn bad" onClick={() => void api.decide(approval, 'denied')}>
          Negar
        </button>
      </div>
    </div>
  );
}

/** Um pedido vencido não pode virar token; não faz sentido oferecê-lo ao humano. */
const isLive = (a: Approval, now: number) => !a.expires_at || new Date(a.expires_at).getTime() > now;

export function ApprovalInbox({ api }: { api: Api }) {
  const now = useNow(1000);
  const live = api.approvals.filter((a) => isLive(a, now));
  const expired = api.approvals.length - live.length;
  return (
    <section className="po-card human">
      <div className="po-card-head">
        <h3>Aprovador humano</h3>
        <span className="po-sub">canal separado · /internal/approvals</span>
      </div>
      <p className="po-hint" style={{ margin: '0 0 12px' }}>
        O agente pode <b>pedir</b> aprovação, nunca <b>conceder</b>. Ao aprovar, o servidor emite um token de 60 s, de uso
        único, amarrado a esta ferramenta, a estes argumentos e a esta chave.
      </p>
      {api.approvalsError && <div className="po-banner bad">{api.approvalsError}</div>}
      <div className="po-list">
        {live.length === 0 ? (
          <div className="po-empty">
            {api.waiting ? 'Aguardando o agente registrar o pedido…' : 'Nenhum pedido pendente.'}
          </div>
        ) : (
          live.map((a) => <ApprovalCard key={a.id} approval={a} api={api} now={now} />)
        )}
      </div>
      {expired > 0 && (
        <p className="po-hint" style={{ margin: '10px 0 0' }}>
          {expired} pedido(s) antigo(s) já expirado(s) ocultado(s).
        </p>
      )}
    </section>
  );
}
