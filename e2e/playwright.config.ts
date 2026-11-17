import { defineConfig, devices } from '@playwright/test';

/**
 * Roda contra o BUILD DE PRODUÇÃO (vite build + vite preview), não contra o
 * dev server: é o que vai para o ar, e Module Federation se comporta diferente
 * nos dois modos.
 *
 * Portas próprias (5280/5281) para não brigar com `pnpm dev` (5180/5181).
 * O PayOps é buildado SEM API declarada → modo mock, determinístico e sem
 * depender do backend. Variáveis do processo têm prioridade sobre .env.local.
 */
const HOST_PORT = 5280;
const PAYOPS_PORT = 5281;
const RAG_PORT = 5282;

export const HOST_URL = `http://localhost:${HOST_PORT}`;
export const PAYOPS_URL = `http://localhost:${PAYOPS_PORT}`;
export const RAG_URL = `http://localhost:${RAG_PORT}`;

// Lagoski: quatro remotes, um por bounded context com UI, em modo demo (sistema simulado).
export const LAGOSKI = { catalog: 5283, checkout: 5284, orders: 5285, inspector: 5286 } as const;
const lagoskiUrl = (name: keyof typeof LAGOSKI) => `http://localhost:${LAGOSKI[name]}`;

const mockPayOpsEnv = {
  VITE_PAYOPS_API_URL: '',
  VITE_PAYOPS_AGENT_KEY: '',
  VITE_PAYOPS_APPROVER_KEY: '',
  VITE_JAEGER_URL: '',
};

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: HOST_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, grepInvert: /@mobile/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: [
    {
      command: `pnpm --filter @portfolio/payops build && pnpm --filter @portfolio/payops exec vite preview --port ${PAYOPS_PORT} --strictPort`,
      cwd: '..',
      url: `${PAYOPS_URL}/remoteEntry.js`,
      env: { ...mockPayOpsEnv, PAYOPS_PORT: String(PAYOPS_PORT) },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // RAG também em modo mock: sem VITE_RAG_API_URL.
      command: `pnpm --filter @portfolio/rag build && pnpm --filter @portfolio/rag exec vite preview --port ${RAG_PORT} --strictPort`,
      cwd: '..',
      url: `${RAG_URL}/remoteEntry.js`,
      env: { VITE_RAG_API_URL: '', RAG_PORT: String(RAG_PORT) },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    ...(Object.keys(LAGOSKI) as Array<keyof typeof LAGOSKI>).map((name) => ({
      command: `pnpm --filter @portfolio/lagoski-${name} build && pnpm --filter @portfolio/lagoski-${name} exec vite preview --port ${LAGOSKI[name]} --strictPort`,
      cwd: '..',
      url: `${lagoskiUrl(name)}/remoteEntry.js`,
      env: { VITE_LAGOSKI_API_URL: '', [`LAGOSKI_${name.toUpperCase()}_PORT`]: String(LAGOSKI[name]) },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    })),
    {
      command: `pnpm --filter @portfolio/shell build && pnpm --filter @portfolio/shell exec vite preview --port ${HOST_PORT} --strictPort`,
      cwd: '..',
      url: HOST_URL,
      env: {
        PORTFOLIO_PORT: String(HOST_PORT),
        VITE_PAYOPS_REMOTE_URL: `${PAYOPS_URL}/remoteEntry.js`,
        VITE_RAG_REMOTE_URL: `${RAG_URL}/remoteEntry.js`,
        VITE_LAGOSKI_CATALOG_REMOTE_URL: `${lagoskiUrl('catalog')}/remoteEntry.js`,
        VITE_LAGOSKI_CHECKOUT_REMOTE_URL: `${lagoskiUrl('checkout')}/remoteEntry.js`,
        VITE_LAGOSKI_ORDERS_REMOTE_URL: `${lagoskiUrl('orders')}/remoteEntry.js`,
        VITE_LAGOSKI_INSPECTOR_REMOTE_URL: `${lagoskiUrl('inspector')}/remoteEntry.js`,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
