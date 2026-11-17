import { useEffect, useState } from 'react';
import { connect, type Connection, type LagoskiClient, type ObservedEvent } from '@portfolio/lagoski-contracts';

/** Conexão compartilhada com os outros remotes Lagoski da aba (BFF real ou sistema simulado). */
export function useLagoski(): Connection | null {
  const [connection, setConnection] = useState<Connection | null>(null);
  useEffect(() => {
    let alive = true;
    void connect(import.meta.env.VITE_LAGOSKI_API_URL).then((c) => alive && setConnection(c));
    return () => {
      alive = false;
    };
  }, []);
  return connection;
}

/** Chama `onEvent` para cada evento do barramento (SSE do BFF ou observer do mock). */
export function useBusEvents(client: LagoskiClient | undefined, onEvent: (e: ObservedEvent) => void): void {
  useEffect(() => (client ? client.subscribe(onEvent) : undefined), [client, onEvent]);
}
