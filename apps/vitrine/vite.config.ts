import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

// 5183–5186 são dos remotes do Lagoski.
const PORT = Number(process.env.VITRINE_PORT ?? 5187);

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'vitrine',
      filename: 'remoteEntry.js',
      // O host consome apenas este módulo: o microfrontend inteiro (vitrine + backoffice).
      exposes: { './App': './src/App.tsx' },
      // React precisa ser uma instância única entre host e remote (hooks quebram com duas).
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
      },
      dts: false,
    }),
  ],
  server: { port: PORT, strictPort: true, origin: `http://localhost:${PORT}`, cors: true },
  preview: { port: PORT, strictPort: true, cors: true },
  build: { target: 'chrome89' },
});
