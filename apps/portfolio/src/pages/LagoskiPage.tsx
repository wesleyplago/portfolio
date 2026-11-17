import { Suspense, lazy, useMemo, useState, type ComponentType } from 'react';
import { ProjectPage } from '../components/ProjectPage';
import { RemoteBoundary } from '../components/RemoteBoundary';
import { projects } from '../content/projects';

const project = projects.find((p) => p.slug === 'lagoski')!;

type Remote = { name: string; devUrl: string; load: () => Promise<{ default: ComponentType }>; label: string };

// Cada um vem de um app separado (apps/lagoski-*), carregado em runtime. Nada do Lagoski entra no bundle do portfólio.
const REMOTES = {
  catalog: { name: 'lagoski-catalog', devUrl: 'localhost:5183', load: () => import('lagoskiCatalog/App'), label: 'a coleção' },
  checkout: { name: 'lagoski-checkout', devUrl: 'localhost:5184', load: () => import('lagoskiCheckout/App'), label: 'o carrinho' },
  orders: { name: 'lagoski-orders', devUrl: 'localhost:5185', load: () => import('lagoskiOrders/App'), label: 'os pedidos' },
  inspector: { name: 'lagoski-inspector', devUrl: 'localhost:5186', load: () => import('lagoskiInspector/App'), label: 'o Event Inspector' },
} satisfies Record<string, Remote>;

/** Um remote com falha isolada: se ele cair, só a área dele mostra o erro. */
function Slot({ remote, className }: { remote: Remote; className?: string }) {
  const [attempt, setAttempt] = useState(0);
  const App = useMemo(() => lazy(remote.load), [remote, attempt]);
  return (
    <div className={className} data-remote={remote.name}>
      <RemoteBoundary name={remote.name} devUrl={remote.devUrl} onRetry={() => setAttempt((n) => n + 1)}>
        <Suspense fallback={<div className="loading" style={{ background: 'var(--brand-surface)' }}>Carregando {remote.label}…</div>}>
          <App />
        </Suspense>
      </RemoteBoundary>
    </div>
  );
}

export function LagoskiPage() {
  return (
    <ProjectPage project={project}>
      <ProjectPage.Cover>
        <a href={`${import.meta.env.BASE_URL}lagoski/arquitetura.html`} className="cover-btn">
          Arquitetura
        </a>
      </ProjectPage.Cover>
      <ProjectPage.Guide />
      <ProjectPage.Demo>
        <div className="lagoski-layout">
          <Slot remote={REMOTES.catalog} />
          <Slot remote={REMOTES.checkout} className="lagoski-side" />
          <Slot remote={REMOTES.orders} className="lagoski-wide" />
          <Slot remote={REMOTES.inspector} className="lagoski-wide" />
        </div>
      </ProjectPage.Demo>
      <ProjectPage.Inside />
    </ProjectPage>
  );
}
