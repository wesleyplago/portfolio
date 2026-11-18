import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/** Capturas estáticas dos apps em modo demo (reusa os webServers do e2e). */
export default defineConfig({
  testDir: './shots',
  timeout: 60_000,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: base.use?.baseURL, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', viewport: { width: 1280, height: 800 } },
  webServer: base.webServer,
});
