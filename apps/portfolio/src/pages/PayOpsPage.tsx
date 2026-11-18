import { Suspense, lazy, useMemo, useState } from 'react';
import { ProjectPage } from '../components/ProjectPage';
import { RemoteBoundary } from '../components/RemoteBoundary';
import { projects } from '../content/projects';

// Carregado em runtime do app remoto (apps/payops). Nada do PayOps entra no bundle do portfólio.
const loadPayOps = () => import('payops/App');

const project = projects.find((p) => p.slug === 'payops')!;

export function PayOpsPage() {
  // React.lazy guarda uma falha de carregamento; um novo lazy por tentativa permite "Tentar de novo".
  const [attempt, setAttempt] = useState(0);
  const PayOpsApp = useMemo(() => lazy(loadPayOps), [attempt]);
  return (
    <ProjectPage project={project}>
      <ProjectPage.Cover />
      <ProjectPage.Guide />
      <ProjectPage.Demo>
        <RemoteBoundary name="payops" onRetry={() => setAttempt((n) => n + 1)}>
          <Suspense fallback={<div className="loading" style={{ background: 'var(--brand-surface)' }}>Carregando o microfrontend do PayOps…</div>}>
            <PayOpsApp />
          </Suspense>
        </RemoteBoundary>
      </ProjectPage.Demo>
      <ProjectPage.Inside />
    </ProjectPage>
  );
}
