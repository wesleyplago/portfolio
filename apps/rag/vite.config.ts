import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

const PORT = Number(process.env.RAG_PORT ?? 5182);

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'rag',
      filename: 'remoteEntry.js',
      // O host consome apenas este módulo: o microfrontend inteiro.
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
