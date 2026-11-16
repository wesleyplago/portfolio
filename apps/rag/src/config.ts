/**
 * Sem valor padrão de propósito: o microfrontend não sabe onde fica o backend
 * a menos que alguém declare. Sem API declarada (ou fora do ar na subida), ele
 * usa o mock em memória de @portfolio/rag-contracts.
 */
const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);

export const config = {
  apiUrl: clean(import.meta.env.VITE_RAG_API_URL),
  /** Quanto esperar pelo /health na subida antes de cair para o mock. */
  probeTimeoutMs: 2_500,
  /** A primeira busca pode carregar o modelo de embeddings. */
  searchTimeoutMs: 30_000,
};
