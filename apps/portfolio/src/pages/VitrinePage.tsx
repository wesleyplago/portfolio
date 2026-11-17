import { Suspense, lazy, useMemo, useState } from 'react';
import { RemoteBoundary } from '../components/RemoteBoundary';

// Carregado em runtime do app remoto (apps/vitrine). Nada da vitrine entra no bundle do portfólio.
const loadVitrine = () => import('vitrine/App');

export function VitrinePage() {
  // React.lazy guarda uma falha de carregamento; um novo lazy por tentativa permite "Tentar de novo".
  const [attempt, setAttempt] = useState(0);
  const VitrineApp = useMemo(() => lazy(loadVitrine), [attempt]);
  return (
    <section className="section">
      <div className="page-head">
        <div>
          <p className="eyebrow">Projeto · demo ao vivo</p>
          <h1>Vitrine de afiliados</h1>
          <p className="lead">
            Vitrine de ofertas da Shopee e do Mercado Livre com links de afiliado, e um backoffice para cadastrar
            produtos e acompanhar cliques e pedidos.
          </p>
        </div>
      </div>
      <div className="callout">
        Use as abas para alternar entre a vitrine pública e o backoffice, que pede login de um único usuário admin. Sem a
        vitrine-api configurada, tudo roda com um mock em memória que segue o mesmo contrato.
      </div>
      <RemoteBoundary name="vitrine" devUrl="localhost:5187" onRetry={() => setAttempt((n) => n + 1)}>
        <Suspense fallback={<div className="loading">Carregando o microfrontend da vitrine…</div>}>
          <VitrineApp />
        </Suspense>
      </RemoteBoundary>
    </section>
  );
}
