import { useCallback, useRef, useState } from 'react';
import { RagApiError, type RagClient, type SearchResponse } from '@portfolio/rag-contracts';

export type HistoryItem = {
  id: number;
  query: string;
  k: number;
  mode: RagClient['mode'];
  latencyMs: number;
  abstained: boolean;
  topScore: number | null;
  hits: number;
};

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; query: string }
  | { status: 'done'; response: SearchResponse; latencyMs: number; mode: RagClient['mode'] }
  | { status: 'error'; query: string; code: string; message: string };

/** Estado da tela de busca. Não conhece HTTP nem mock: só a porta RagClient. */
export function useRag(client: RagClient) {
  const [state, setState] = useState<SearchState>({ status: 'idle' });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const seq = useRef(0);

  const search = useCallback(
    async (query: string, k: number) => {
      const id = ++seq.current;
      setState({ status: 'loading', query });
      const started = performance.now();
      try {
        const response = await client.search({ query, k });
        if (id !== seq.current) return; // uma busca mais nova já tomou o lugar desta
        const latencyMs = Math.round(performance.now() - started);
        setState({ status: 'done', response, latencyMs, mode: client.mode });
        setHistory((items) =>
          [
            {
              id,
              query: response.query,
              k,
              mode: client.mode,
              latencyMs,
              abstained: response.abstained,
              topScore: response.topScore,
              hits: response.results.length,
            },
            ...items,
          ].slice(0, 12),
        );
      } catch (error: unknown) {
        if (id !== seq.current) return;
        const code = error instanceof RagApiError ? error.code : 'UNEXPECTED';
        const message = error instanceof Error ? error.message : String(error);
        setState({ status: 'error', query, code, message });
      }
    },
    [client],
  );

  return { state, history, search, mode: client.mode, source: client.source };
}

export type RagApi = ReturnType<typeof useRag>;
