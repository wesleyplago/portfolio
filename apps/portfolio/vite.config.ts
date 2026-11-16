import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

const PORT = Number(process.env.PORTFOLIO_PORT ?? 5180);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const payopsEntry = env.VITE_PAYOPS_REMOTE_URL ?? 'http://localhost:5181/remoteEntry.js';
  const ragEntry = env.VITE_RAG_REMOTE_URL ?? 'http://localhost:5182/remoteEntry.js';

  return {
    plugins: [
      react(),
      federation({
        name: 'portfolio',
        // Cada remote é um app separado, com build e deploy próprios.
        remotes: {
          payops: { type: 'module', name: 'payops', entry: payopsEntry },
          rag: { type: 'module', name: 'rag', entry: ragEntry },
        },
        shared: {
          react: { singleton: true, requiredVersion: '^19.0.0' },
          'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        },
        dts: false,
        // Com o padrão (version-first), o build injeta <link rel="modulepreload">
        // e faz import() de TODOS os remoteEntry na subida, em qualquer página:
        // a home baixava PayOps e RAG sem precisar e, com um remote fora do ar,
        // toda página registrava erros de rede. Com loaded-first, remotes
        // carregados por rota (lazy) só são buscados quando a rota abre. Para
        // React singleton, "o que o host já carregou vence" é o desejado.
        // Coberto pelo E2E "páginas sem microfrontend não buscam nenhum remote".
        shareStrategy: 'loaded-first',
      }),
    ],
    server: { port: PORT, strictPort: true, origin: `http://localhost:${PORT}` },
    preview: { port: PORT, strictPort: true },
    build: { target: 'chrome89' },
  };
});
