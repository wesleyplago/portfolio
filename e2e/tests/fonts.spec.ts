import { PayOps, allowErrors, expect, test } from './fixtures';
import { PAYOPS_URL } from '../playwright.config';

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
  await expect(new PayOps(page).root.getByRole('heading', { name: 'PayOps Console' })).toBeVisible();
});
