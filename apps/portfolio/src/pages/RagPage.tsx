import { Suspense, lazy, useMemo, useState } from 'react';
import { RemoteBoundary } from '../components/RemoteBoundary';
import { projects } from '../content/projects';

// Carregado em runtime do app remoto (apps/rag). Nada do RAG entra no bundle do portfólio.
const loadRag = () => import('rag/App');

const project = projects.find((p) => p.slug === 'rag-eval-harness')!;

export function RagPage() {
  // React.lazy guarda uma falha de carregamento; um novo lazy por tentativa permite "Tentar de novo".
  const [attempt, setAttempt] = useState(0);
  const RagApp = useMemo(() => lazy(loadRag), [attempt]);
  return (
    <section className="section">
      <div className="page-head">
        <div>
          <p className="eyebrow">Projeto · demo ao vivo</p>
          <h1>{project.name}</h1>
          <p className="lead">{project.description}</p>
        </div>
        <a href={project.repo} className="btn" target="_blank" rel="noreferrer">
          Código ↗
        </a>
      </div>
      <div className="callout">
        Faça perguntas sobre regulação de pagamentos e veja os trechos que o retrieval devolve, com documento, seção e
        score. Se a API do rag-eval-harness estiver configurada e no ar, a busca usa ela; senão, roda com um mock em
        memória que segue o mesmo contrato.
      </div>
      <RemoteBoundary name="rag" devUrl="localhost:5182" onRetry={() => setAttempt((n) => n + 1)}>
        <Suspense fallback={<div className="loading">Carregando o microfrontend do RAG…</div>}>
          <RagApp />
        </Suspense>
      </RemoteBoundary>
    </section>
  );
}
