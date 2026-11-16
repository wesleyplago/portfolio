import { useState, type FormEvent } from 'react';
import { SearchRequestSchema } from '@portfolio/rag-contracts';
import type { RagApi } from '../useRag';

export const EXAMPLES: Array<{ label: string; query: string; hint: string }> = [
  { label: 'Semântica', query: 'Como funciona o Mecanismo Especial de Devolução do Pix?', hint: 'busca por significado' },
  { label: 'Arranjos', query: 'Quais são as modalidades de arranjos de pagamento?', hint: 'resposta direta numa seção' },
  { label: 'CNPJ alfanumérico', query: 'O valor 12ABC34501DE35 corresponde a qual tipo de chave Pix?', hint: 'router → busca exata' },
  { label: 'Open Finance', query: 'Quais são os requisitos de experiência do cliente no consentimento do Open Finance?', hint: 'outro documento' },
  { label: 'Fora do corpus', query: 'Qual é a receita de bolo de cenoura?', hint: 'deve se abster' },
];

export function SearchPanel({ api }: { api: RagApi }) {
  const [query, setQuery] = useState('');
  const [k, setK] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const loading = api.state.status === 'loading';

  const run = (text: string) => {
    const parsed = SearchRequestSchema.safeParse({ query: text, k });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Pergunta inválida');
      return;
    }
    setError(null);
    void api.search(parsed.data.query, parsed.data.k);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    run(query);
  };

  return (
    <section className="rg-card">
      <form onSubmit={onSubmit}>
        <label>
          Pergunta sobre regulação de pagamentos (Pix, boleto, Open Finance, arranjos, PLD-FT)
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                run(query);
              }
            }}
            placeholder="Ex.: Como funciona o bloqueio cautelar no Pix?"
            rows={3}
          />
        </label>
        {error && <div className="rg-err">{error}</div>}
        <div className="rg-actions">
          <label className="rg-inline">
            top-k
            <select value={k} onChange={(e) => setK(Number(e.target.value))}>
              {[3, 5, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button className="rg-btn primary" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="rg-spinner" /> Buscando…
              </>
            ) : (
              'Buscar'
            )}
          </button>
        </div>
      </form>
      <div className="rg-examples">
        <span className="rg-hint">Exemplos:</span>
        {EXAMPLES.map((example) => (
          <button
            key={example.label}
            type="button"
            className="rg-chip"
            title={`${example.query} (${example.hint})`}
            disabled={loading}
            onClick={() => {
              setQuery(example.query);
              run(example.query);
            }}
          >
            {example.label}
          </button>
        ))}
      </div>
    </section>
  );
}
