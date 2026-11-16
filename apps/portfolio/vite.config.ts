import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

const PORT = 5180;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const payopsEntry = env.VITE_PAYOPS_REMOTE_URL ?? 'http://localhost:5181/remoteEntry.js';

  return {
    plugins: [
      react(),
      federation({
        name: 'portfolio',
        // Cada remote é um app separado, com build e deploy próprios.
        remotes: {
          payops: { type: 'module', name: 'payops', entry: payopsEntry },
        },
        shared: {
          react: { singleton: true, requiredVersion: '^19.0.0' },
          'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        },
        dts: false,
      }),
    ],
    server: { port: PORT, strictPort: true, origin: `http://localhost:${PORT}` },
    preview: { port: PORT, strictPort: true },
    build: { target: 'chrome89' },
  };
});
