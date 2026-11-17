import { Suspense, lazy, useMemo, useState } from 'react';
import { ProjectPage } from '../components/ProjectPage';
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
    <ProjectPage project={project}>
      <ProjectPage.Cover />
      <ProjectPage.Guide />
      <ProjectPage.Demo>
        <RemoteBoundary name="rag" devUrl="localhost:5182" onRetry={() => setAttempt((n) => n + 1)}>
          <Suspense fallback={<div className="loading" style={{ background: 'var(--brand-surface)' }}>Carregando o microfrontend do RAG…</div>}>
            <RagApp />
          </Suspense>
        </RemoteBoundary>
      </ProjectPage.Demo>
      <ProjectPage.Inside />
    </ProjectPage>
  );
}
