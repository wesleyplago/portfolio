import { Component, type ReactNode } from 'react';

type Props = {
  name: string;
  children: ReactNode;
  onRetry?: () => void;
  /** Onde o remote roda em dev, para a mensagem de ajuda. */
  devUrl?: string;
};
type State = { error: Error | null };

/**
 * Isola a falha de um microfrontend: se o remote estiver fora do ar ou quebrar
 * ao renderizar, só esta área mostra o erro; o resto do portfólio continua.
 */
export class RemoteBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="remote-error">
        <h3>Não foi possível carregar o microfrontend “{this.props.name}”.</h3>
        <p>
          Ele roda como um app separado. Suba os apps com <code>pnpm dev</code> na raiz do monorepo
          {import.meta.env.DEV && this.props.devUrl && (
            <>
              {' '}
              (este fica em <code>{this.props.devUrl}</code>)
            </>
          )}{' '}
          e recarregue.
        </p>
        <details>
          <summary>Detalhes</summary>
          <pre>{this.state.error.message}</pre>
        </details>
        <button className="btn" onClick={() => {
            this.props.onRetry?.();
            this.setState({ error: null });
          }}>
          Tentar de novo
        </button>
      </div>
    );
  }
}
