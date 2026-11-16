import { Suspense, lazy, useMemo, useState } from 'react';
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
        Você faz os dois papéis: pede operações ao agente (esquerda) e decide como o aprovador humano (direita). Requer o
        backend do payops-agent rodando localmente com <code>docker compose up -d</code>.
      </div>
      <RemoteBoundary name="payops" onRetry={() => setAttempt((n) => n + 1)}>
        <Suspense fallback={<div className="loading">Carregando o microfrontend do PayOps…</div>}>
          <PayOpsApp />
        </Suspense>
      </RemoteBoundary>
    </section>
  );
}
