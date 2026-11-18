import { PayOps, allowErrors, expect, test } from './fixtures';
import { PAYOPS_URL, RAG_URL } from '../playwright.config';

test('PayOps carrega Chivo do próprio remote', async ({ page }) => {
  const woff = page.waitForResponse((r) => /chivo.*\.woff2$/.test(r.url()) && r.ok());
  await page.goto('/projetos/payops');
  expect(new URL((await woff).url()).origin).toBe(PAYOPS_URL);
  await expect.poll(() => page.evaluate(() => document.fonts.check('16px "Chivo"'))).toBe(true);
});

test('com a fonte bloqueada o texto continua visível', async ({ page }) => {
  allowErrors(/Failed to load resource/);
  await page.route(/\.woff2$/, (r) => r.abort());
  await page.goto('/projetos/payops');
  const root = new PayOps(page).root;
  await expect(root.getByRole('heading', { name: 'PayOps Console' })).toBeVisible();
  // a fonte foi mesmo bloqueada: a face nunca chega a "loaded"
  await expect.poll(() => page.evaluate(() => document.fonts.check('16px "Chivo"'))).toBe(false);
  // e o texto aparece com a fonte de reserva: o @font-face injetado usa swap (não block)
  const faceCss = await root.locator('style').first().textContent();
  expect(faceCss).toMatch(/@font-face\s*\{[^}]*font-family:\s*["']?Chivo["']?[^}]*font-display:\s*swap/);
});

test('RAG carrega Funnel Sans e DM Mono do próprio remote', async ({ page }) => {
  const woff = page.waitForResponse((r) => /funnel-sans.*\.woff2$/.test(r.url()) && r.ok());
  await page.goto('/projetos/rag');
  expect(new URL((await woff).url()).origin).toBe(RAG_URL);
  await expect.poll(() => page.evaluate(() => document.fonts.check('16px "Funnel Sans"'))).toBe(true);
});

test('RAG usa a marca própria mesmo com o sistema em modo claro', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/projetos/rag');
  const root = page.locator('.rag');
  await expect(root).toHaveCSS('background-color', 'rgb(24, 25, 27)');
  await expect(root).toHaveCSS('font-family', /Funnel/);
});
