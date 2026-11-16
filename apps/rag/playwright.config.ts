import { defineConfig, devices } from '@playwright/test';

/**
 * Testes de ponta a ponta do portfólio + microfrontends.
 *
 * Sobe (ou reaproveita, se já estiverem no ar) os três apps de dev. A API do
 * rag-eval-harness é opcional: os testes que precisam dela se pulam sozinhos
 * quando ela não responde, e os de desacoplamento derrubam a API com
 * `page.route` para provar que a UI continua funcionando com o mock.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:5180',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: [
    { command: 'pnpm --filter @portfolio/payops dev', url: 'http://localhost:5181', reuseExistingServer: true },
    { command: 'pnpm --filter @portfolio/rag dev', url: 'http://localhost:5182', reuseExistingServer: true },
    { command: 'pnpm --filter @portfolio/shell dev', url: 'http://localhost:5180', reuseExistingServer: true },
  ],
});
