import type { RagApi } from '../useRag';

export function History({ api }: { api: RagApi }) {
  return (
    <section className="rg-card">
      <div className="rg-card-head">
        <h3>Histórico da sessão</h3>
        <span className="rg-sub">{api.history.length} busca(s)</span>
      </div>
      {api.history.length === 0 ? (
        <div className="rg-empty">Nada ainda.</div>
      ) : (
        <ul className="rg-history">
          {api.history.map((item) => (
            <li key={item.id}>
              <button
                className="rg-history-item"
                title="Buscar de novo"
                onClick={() => void api.search(item.query, item.k)}
              >
                <span className="rg-history-q">{item.query}</span>
                <span className="rg-sub">
                  {item.abstained ? 'absteve' : `${item.hits} trecho(s)`} · {item.latencyMs} ms ·{' '}
                  {item.mode === 'live' ? 'API' : 'mock'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
