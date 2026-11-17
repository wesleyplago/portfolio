import { expect, test, allowErrors } from './fixtures';

test.describe('página de projeto composta', () => {
  test('capa na marca do app', async ({ page }) => {
    await page.goto('/projetos/rag');
    await expect(page.locator('.cover')).toHaveCSS('background-color', 'rgb(24, 25, 27)');
    await expect(page.locator('.guide li')).toHaveCount(3);
  });

  test('capa mostra métrica, botão da demo e esconde o código quando não há repositório', async ({ page }) => {
    await page.goto('/projetos/vitrine');
    await expect(page.locator('.cover').getByText('marketplaces na mesma vitrine')).toBeVisible();
    await expect(page.locator('.cover').getByRole('link', { name: 'Abrir a demo' })).toHaveAttribute('href', '#demo');
    await expect(page.locator('.cover').getByRole('link', { name: /Ver o código/ })).toHaveCount(0);
    await page.goto('/projetos/payops');
    await expect(page.locator('.cover').getByRole('link', { name: 'Ver o código ↗' })).toBeVisible();
    await expect(page.locator('#demo.demo').getByText('Modo demo')).toBeVisible();
  });

  test('com o remote fora do ar, a capa continua e o erro é legível', async ({ page }) => {
    allowErrors(/.*/);
    await page.route(/payops.*remoteEntry\.js|:5281\//, (r) => r.abort());
    await page.goto('/projetos/payops');
    await expect(page.locator('.cover h1')).toHaveText('payops-agent');
    await expect(page.getByRole('heading', { name: /Não foi possível carregar/ })).toBeVisible();
  });
});
