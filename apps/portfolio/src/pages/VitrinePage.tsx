import { Suspense, lazy, useMemo, useState } from 'react';
import { ProjectPage } from '../components/ProjectPage';
import { RemoteBoundary } from '../components/RemoteBoundary';
import { projects } from '../content/projects';

// Carregado em runtime do app remoto (apps/vitrine). Nada da vitrine entra no bundle do portfólio.
const loadVitrine = () => import('vitrine/App');

const project = projects.find((p) => p.slug === 'vitrine')!;

export function VitrinePage() {
  // React.lazy guarda uma falha de carregamento; um novo lazy por tentativa permite "Tentar de novo".
  const [attempt, setAttempt] = useState(0);
  const VitrineApp = useMemo(() => lazy(loadVitrine), [attempt]);
  return (
    <ProjectPage project={project}>
      <ProjectPage.Cover />
      <ProjectPage.Guide />
      <ProjectPage.Demo>
        <RemoteBoundary name="vitrine" devUrl="localhost:5187" onRetry={() => setAttempt((n) => n + 1)}>
          <Suspense fallback={<div className="loading" style={{ background: 'var(--brand-surface)' }}>Carregando o microfrontend da vitrine…</div>}>
            <VitrineApp />
          </Suspense>
        </RemoteBoundary>
      </ProjectPage.Demo>
      <ProjectPage.Inside />
    </ProjectPage>
  );
}
