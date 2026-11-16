import { BENCHMARK } from '../benchmark';

const pct = (v: number) => v.toFixed(3);

/** Barra horizontal simples para comparar recall@10 entre configs. */
function Bar({ value }: { value: number }) {
  return (
    <div className="rg-bar" aria-hidden>
      <span style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

export function Benchmark() {
  const measured = BENCHMARK.configs.filter((c) => c.status === 'ok');
  const skipped = BENCHMARK.configs.filter((c) => c.status === 'skipped');

  return (
    <div className="rg-col">
      <div className="rg-banner info">
        Snapshot estático da rodada <code>{BENCHMARK.runId}</code> ({BENCHMARK.corpus.documents} documentos,{' '}
        {BENCHMARK.corpus.chunks} chunks, {BENCHMARK.questions} perguntas, k={BENCHMARK.k}). Não depende da API: é o que
        o repositório mediu. Fonte:{' '}
        <a href={`${BENCHMARK.repo}/blob/main/${BENCHMARK.source}`} target="_blank" rel="noreferrer">
          {BENCHMARK.source}
        </a>
        .
      </div>

      <section className="rg-card">
        <h3 style={{ marginBottom: 12 }}>Visão geral (120 perguntas com resposta)</h3>
        <div className="rg-table-wrap">
          <table className="rg-table">
            <thead>
              <tr>
                <th>config</th>
                <th>recall@10</th>
                <th>IC 95%</th>
                <th>MRR@10</th>
                <th>nDCG@10</th>
                <th>$/1k</th>
                <th>p50</th>
                <th>p95</th>
              </tr>
            </thead>
            <tbody>
              {measured.map((c) => (
                <tr key={c.name}>
                  <td className="mono">{c.name}</td>
                  <td>
                    <div className="rg-cell-bar">
                      {pct(c.recall)}
                      <Bar value={c.recall} />
                    </div>
                  </td>
                  <td className="rg-sub">
                    [{pct(c.recallCI[0])}, {pct(c.recallCI[1])}]
                  </td>
                  <td>{pct(c.mrr)}</td>
                  <td>{pct(c.ndcg)}</td>
                  <td>${c.usdPer1k.toFixed(2)}</td>
                  <td>{c.p50Ms} ms</td>
                  <td>{c.p95Ms} ms</td>
                </tr>
              ))}
              {skipped.map((c) => (
                <tr key={c.name}>
                  <td className="mono">{c.name}</td>
                  <td colSpan={7} className="rg-sub">
                    não medido: {c.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rg-card">
        <h3 style={{ marginBottom: 12 }}>recall@10 por fatia</h3>
        <div className="rg-table-wrap">
          <table className="rg-table">
            <thead>
              <tr>
                <th>config</th>
                <th>semântica ({BENCHMARK.byCategory.semantic})</th>
                <th>identificador ({BENCHMARK.byCategory.identifier})</th>
                <th>temporal ({BENCHMARK.byCategory.temporal})</th>
              </tr>
            </thead>
            <tbody>
              {measured.map((c) => (
                <tr key={c.name}>
                  <td className="mono">{c.name}</td>
                  <td>{pct(c.slices.semantic.recall)}</td>
                  <td>{pct(c.slices.identifier.recall)}</td>
                  <td>{pct(c.slices.temporal.recall)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="rg-hint" style={{ margin: '12px 0 0' }}>
          Router de identificadores (hybrid, fatia identificador): {pct(BENCHMARK.router.without)} sem busca exata →{' '}
          {pct(BENCHMARK.router.with)} com ela (diferença {pct(BENCHMARK.router.diff)}, IC 95% [
          {pct(BENCHMARK.router.ci[0])}, {pct(BENCHMARK.router.ci[1])}]). As perguntas dessa fatia têm o identificador
          escrito no trecho esperado: o número mostra que o router dispara, não que a busca é perfeita.
        </p>
      </section>

      <section className="rg-card">
        <h3 style={{ marginBottom: 12 }}>Abstenção ({BENCHMARK.byCategory.unanswerable} perguntas sem resposta)</h3>
        <div className="rg-table-wrap">
          <table className="rg-table">
            <thead>
              <tr>
                <th>config</th>
                <th>precisão</th>
                <th>recall</th>
                <th>falsa abstenção</th>
              </tr>
            </thead>
            <tbody>
              {measured.map((c) => (
                <tr key={c.name}>
                  <td className="mono">{c.name}</td>
                  <td>{pct(c.abstention.precision)}</td>
                  <td>{pct(c.abstention.recall)}</td>
                  <td>{(c.abstention.falseRate * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="rg-hint" style={{ margin: '12px 0 0' }}>
          Limiares calibrados no mesmo golden set, então estes números são otimistas. A API usa a config hybrid.
        </p>
      </section>
    </div>
  );
}
