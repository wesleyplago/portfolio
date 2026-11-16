import { useEffect, useState } from 'react';
import { Benchmark } from './components/Benchmark';
import { History } from './components/History';
import { Results } from './components/Results';
import { SearchPanel } from './components/SearchPanel';
import { FIXTURE_CHUNKS } from '@portfolio/rag-contracts';
import { connect, fallbackToMock, type Connection } from './connect';
import { css } from './styles';
import { useRag } from './useRag';

/**
 * Raiz do microfrontend. É o módulo exposto como `rag/App` via Module
 * Federation: o portfólio importa este componente e o renderiza numa rota.
 *
 * Na subida decide entre a API real e o mock em memória (ver connect.ts), então
 * funciona mesmo com o backend fora do ar.
 */
export default function RagApp() {
  const [connection, setConnection] = useState<Connection | null>(null);

  useEffect(() => {
    let alive = true;
    void connect().then((c) => alive && setConnection(c));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="rag">
      <style>{css}</style>
      {connection ? (
        // A key recria o estado quando a conexão troca (API → mock).
        <Console
          key={connection.client.mode}
          connection={connection}
          onUseMock={() => setConnection(fallbackToMock('a API parou de responder durante a sessão'))}
        />
      ) : (
        <div className="rg-empty">
          <span className="rg-spinner" /> Procurando a API do rag-eval-harness…
        </div>
      )}
    </div>
  );
}

function Console({ connection, onUseMock }: { connection: Connection; onUseMock: () => void }) {
  const api = useRag(connection.client);
  const [tab, setTab] = useState<'search' | 'benchmark'>('search');
  const live = api.mode === 'live';

  return (
    <>
      <header className="rg-top">
        <div className="rg-brand">
          <div className="rg-logo">R</div>
          <div>
            <h2>RAG sobre regulação de pagamentos</h2>
            <div className="rg-sub">Busca híbrida (BM25 + dense + RRF) com router de identificadores e abstenção</div>
          </div>
        </div>
        <div className="rg-status">
          <span className={`rg-pill ${live ? 'ok' : 'warn'}`}>
            <span className="rg-dot" />
            {live ? 'API real online' : 'modo demo · dados simulados'}
          </span>
        </div>
      </header>

      {!live && (
        <div className="rg-banner info" style={{ marginBottom: 16 }}>
          <b>Modo demo:</b> {connection.reason}. Estou usando um mock em memória com o mesmo contrato da API: busca em{' '}
          {FIXTURE_CHUNKS.length} trechos reais do corpus, com o mesmo router de identificadores e abstenção, mas
          sem embeddings. Os scores não são comparáveis com os da API. Para usar a API real, suba o rag-eval-harness e
          declare <code>VITE_RAG_API_URL</code> (veja <code>apps/rag/.env.example</code>).
        </div>
      )}

      <div className="rg-tabs" role="tablist">
        <button className="rg-tab" role="tab" aria-selected={tab === 'search'} onClick={() => setTab('search')}>
          Buscar
        </button>
        <button className="rg-tab" role="tab" aria-selected={tab === 'benchmark'} onClick={() => setTab('benchmark')}>
          Resultados do eval
        </button>
      </div>

      {tab === 'search' ? (
        <div className="rg-grid">
          <div className="rg-col">
            <SearchPanel api={api} />
            <Results api={api} onUseMock={live ? onUseMock : undefined} />
          </div>
          <div className="rg-col">
            <History api={api} />
            <section className="rg-card">
              <h4 style={{ marginBottom: 8 }}>O que testar</h4>
              <ul className="rg-hint rg-steps">
                <li>Uma pergunta semântica: veja a seção e o documento de cada trecho.</li>
                <li>
                  O CNPJ alfanumérico <code>12ABC34501DE35</code>: o router faz busca exata e o trecho vem com “busca
                  exata”.
                </li>
                <li>Uma pergunta fora do corpus: o sistema se abstém em vez de inventar.</li>
                <li>Troque o top-k e compare a ordem dos trechos.</li>
                <li>Abra “Resultados do eval” para ver o que cada config mede no golden set.</li>
              </ul>
            </section>
            <section className="rg-card">
              <h4 style={{ marginBottom: 8 }}>Fonte dos resultados</h4>
              <p className="rg-hint" style={{ margin: 0 }}>
                {api.source}.
              </p>
            </section>
          </div>
        </div>
      ) : (
        <Benchmark />
      )}
    </>
  );
}
