import {
  BalanceDataSchema,
  InvoicesDataSchema,
  MUTATION_TOOLS,
  formatCents,
  type AgentResult,
} from '@portfolio/payops-contracts';
import { config } from '../config';
import type { ActivityEntry, usePayOps } from '../usePayOps';

type Api = ReturnType<typeof usePayOps>;

const STATUS: Record<AgentResult['status'], { label: string; cls: string }> = {
  completed: { label: 'concluído', cls: 'ok' },
  failed: { label: 'bloqueado', cls: 'bad' },
  denied: { label: 'negado', cls: 'bad' },
};

const CODE_HELP: Record<string, string> = {
  APPROVAL_DENIED: 'o humano negou',
  APPROVAL_REQUIRED: 'sem token de aprovação válido',
  APPROVAL_EXPIRED: 'a aprovação expirou',
  REFUND_EXCEEDS_CAPTURE: 'estorno acima do valor capturado',
  POLICY_VIOLATION: 'violou a política do servidor',
  VALIDATION_ERROR: 'argumento inválido',
  IDEMPOTENCY_CONFLICT: 'mesma chave com argumentos diferentes',
};

function ResultDetails({ result }: { result: AgentResult }) {
  const balance = BalanceDataSchema.safeParse(result.data);
  if (balance.success) {
    return (
      <div className="po-balance">
        {balance.data.accounts.map((a) => (
          <div key={a.name} className="po-balance-item">
            <span className="po-sub">{a.name}</span>
            <b>{formatCents(a.balance_cents)}</b>
          </div>
        ))}
      </div>
    );
  }
  const invoices = InvoicesDataSchema.safeParse(result.data);
  if (invoices.success) {
    return (
      <div className="po-list" style={{ gap: 4 }}>
        {invoices.data.invoices.map((inv, i) => (
          <div key={`${inv.id}-${i}`} className="po-chain" style={{ justifyContent: 'space-between' }}>
            <span className="mono">{inv.customer_id}</span>
            <span>{formatCents(inv.amount_cents)}</span>
            <span className="po-pill">{inv.status}</span>
            <span>{new Date(inv.due_date).toLocaleDateString('pt-BR')}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function Entry({ entry, api }: { entry: ActivityEntry; api: Api }) {
  const r = entry.result;
  const isMutation = (MUTATION_TOOLS as readonly string[]).includes(entry.intent.tool);
  const quarantined = r?.documents.quarantined ?? 0;
  const firstError = r?.tool_calls.find((t) => !t.ok)?.error_code;

  return (
    <article className="po-entry">
      <div className="po-entry-head">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {entry.kind === 'replay' && <span className="po-pill warn">retry · mesma chave</span>}
          {entry.kind === 'attack' && <span className="po-pill bad">ataque</span>}
          <b>{entry.label}</b>
        </div>
        <span className="po-sub">{entry.at.toLocaleTimeString('pt-BR')}</span>
      </div>

      {entry.state === 'waiting' && (
        <div className="po-chain" style={{ color: 'var(--po-warn)' }}>
          <span className="po-spinner" />
          {isMutation ? 'Agente aguardando a decisão do aprovador humano…' : 'Processando…'}
        </div>
      )}

      {entry.state === 'error' && <div className="po-banner bad">{entry.error}</div>}

      {r && (
        <>
          <div className="po-chain">
            <span className={`po-pill ${STATUS[r.status].cls}`}>
              <span className="po-dot" />
              {STATUS[r.status].label}
            </span>
            {r.tool_calls.map((t, i) => (
              <span key={i} style={{ display: 'contents' }}>
                {i > 0 && <span>→</span>}
                <span className={`po-pill ${t.ok ? '' : 'bad'}`}>
                  {t.tool}
                  {t.replayed ? ' · replay' : ''}
                  {t.error_code ? ` · ${t.error_code}` : ''}
                </span>
              </span>
            ))}
          </div>
          <div className="po-answer">
            {r.answer}
            {firstError && CODE_HELP[firstError] && <span className="po-sub"> ({CODE_HELP[firstError]})</span>}
          </div>
          {r.documents.scanned > 0 && (
            <div className="po-chain">
              <span className={`po-pill ${quarantined ? 'warn' : ''}`}>
                {r.documents.scanned} documento(s) lido(s) · {quarantined} em quarentena
              </span>
              {Object.keys(r.documents.categories).map((c) => (
                <span key={c} className="po-pill">{c}</span>
              ))}
            </div>
          )}
          <ResultDetails result={r} />
          <div className="po-actions" style={{ alignItems: 'center' }}>
            {r.trace_id && (
              <a href={`${config.jaegerUrl}/trace/${r.trace_id}`} target="_blank" rel="noreferrer" className="po-sub">
                Ver trace no Jaeger ↗
              </a>
            )}
            {isMutation && r.status === 'completed' && (
              <button
                className="po-btn small"
                aria-description="Simula o agente repetindo depois de um timeout"
                onClick={() =>
                  void api.run(entry.intent, { label: `Repetir: ${entry.label.replace(/^Repetir: /, '')}`, kind: 'replay' })
                }
              >
                Repetir com a mesma chave
              </button>
            )}
            <details>
              <summary>JSON</summary>
              <pre>{JSON.stringify({ intent: entry.intent, result: r }, null, 2)}</pre>
            </details>
          </div>
        </>
      )}
    </article>
  );
}

export function ActivityLog({ api }: { api: Api }) {
  return (
    <section className="po-card">
      <div className="po-card-head">
        <h3>Atividade</h3>
        <span className="po-sub">{api.activity.length} chamada(s) nesta sessão</span>
      </div>
      <div className="po-list">
        {api.activity.length === 0 ? (
          <div className="po-empty">Faça um pedido ao agente para ver o resultado aqui.</div>
        ) : (
          api.activity.map((e) => <Entry key={e.id} entry={e} api={api} />)
        )}
      </div>
    </section>
  );
}
