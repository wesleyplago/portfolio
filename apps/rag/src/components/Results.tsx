import { useState } from 'react';
import type { SearchHit } from '@portfolio/rag-contracts';
import type { RagApi } from '../useRag';

const REASONS: Record<string, string> = {
  below_threshold: 'o score do melhor trecho ficou abaixo do limiar calibrado',
  no_results: 'nenhum trecho casou com a pergunta',
};

const words = (query: string) =>
  [...new Set(query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 3))];

/** Destaca as palavras da pergunta no trecho, sem HTML injetado. */
function Highlight({ text, query }: { text: string; query: string }) {
  const terms = words(query);
  if (terms.length === 0) return <>{text}</>;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'giu'));
  return (
    <>
      {parts.map((part, i) =>
        terms.includes(part.toLowerCase()) ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>,
      )}
    </>
  );
}

function HitCard({ hit, rank, query }: { hit: SearchHit; rank: number; query: string }) {
  const [open, setOpen] = useState(false);
  // O conteúdo começa repetindo o caminho da seção; não precisa aparecer duas vezes.
  const body = hit.content.startsWith(hit.sectionPath) ? hit.content.slice(hit.sectionPath.length).trim() : hit.content;
  const preview = body.length > 420 && !open ? `${body.slice(0, 420)}…` : body;
  return (
    <article className="rg-hit">
      <div className="rg-hit-head">
        <span className="rg-rank">#{rank}</span>
        <div className="rg-hit-title">
          <b>{hit.documentTitle}</b>
          <span className="rg-sub">{hit.sectionPath}</span>
        </div>
        <span className={`rg-pill ${hit.score === 1 ? 'ok' : ''}`} title="score devolvido pelo retriever">
          {hit.score === 1 ? 'busca exata' : `score ${hit.score.toFixed(4)}`}
        </span>
      </div>
      <p className="rg-text">
        <Highlight text={preview} query={query} />
      </p>
      <div className="rg-hit-foot">
        <span className="rg-sub mono">
          chunk {hit.chunkId} · {hit.documentSlug}
          {hit.isTable ? ' · tabela' : ''}
        </span>
        {body.length > 420 && (
          <button className="rg-btn small" onClick={() => setOpen((v) => !v)}>
            {open ? 'Recolher' : 'Ver trecho inteiro'}
          </button>
        )}
      </div>
    </article>
  );
}

export function Results({ api, onUseMock }: { api: RagApi; onUseMock?: () => void }) {
  const { state } = api;

  if (state.status === 'idle') {
    return (
      <section className="rg-card">
        <div className="rg-empty">Faça uma pergunta ou clique num exemplo. Os trechos recuperados aparecem aqui.</div>
      </section>
    );
  }
  if (state.status === 'loading') {
    return (
      <section className="rg-card">
        <div className="rg-empty">
          <span className="rg-spinner" /> Recuperando trechos para “{state.query}”…
        </div>
      </section>
    );
  }
  if (state.status === 'error') {
    return (
      <section className="rg-card">
        <div className="rg-banner bad">
          <b>{state.code}</b>: {state.message}
          {state.code === 'NETWORK_ERROR' && onUseMock && (
            <div style={{ marginTop: 10 }}>
              <button className="rg-btn small" onClick={onUseMock}>
                Continuar em modo demo (mock)
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  const { response, latencyMs, mode } = state;
  return (
    <section className="rg-card">
      <div className="rg-card-head">
        <h3>Resultado</h3>
        <div className="rg-meta">
          <span className="rg-pill">{latencyMs} ms</span>
          <span className="rg-pill">top score {response.topScore === null ? '—' : response.topScore.toFixed(4)}</span>
          <span className={`rg-pill ${mode === 'live' ? 'ok' : 'warn'}`}>{mode === 'live' ? 'API real' : 'mock'}</span>
        </div>
      </div>
      {response.abstained ? (
        <div className="rg-abstain">
          <b>O sistema se absteve.</b> Em vez de devolver trechos aleatórios, respondeu “não sei”:{' '}
          {REASONS[response.reason] ?? response.reason}
          {response.topScore !== null && <> (top score {response.topScore.toFixed(4)})</>}. Isso é o comportamento
          esperado para perguntas fora do corpus; numa pergunta do corpus, é uma falsa abstenção.
        </div>
      ) : (
        <div className="rg-list">
          {response.results.map((hit, i) => (
            <HitCard key={hit.chunkId} hit={hit} rank={i + 1} query={response.query} />
          ))}
        </div>
      )}
    </section>
  );
}
