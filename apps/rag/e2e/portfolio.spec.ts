import { expect, test } from '@playwright/test';

/** Navegação do portfólio (host) e carregamento dos microfrontends. */

test.describe('portfólio', () => {
  test('home lista os projetos e leva às demos', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Início' })).toBeVisible();
    await expect(page.getByText('payops-agent').first()).toBeVisible();
    await expect(page.getByText('rag-eval-harness').first()).toBeVisible();

    // Card do rag-eval-harness tem link para a demo ao vivo.
    await page.locator('a[href="/projetos/rag"]').filter({ hasNotText: 'RAG ao vivo' }).first().click();
    await expect(page).toHaveURL(/\/projetos\/rag$/);
    await expect(page.getByRole('heading', { level: 1, name: 'rag-eval-harness' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'RAG sobre regulação de pagamentos' })).toBeVisible();
  });

  test('menu navega entre Início, PayOps e RAG sem recarregar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'RAG ao vivo' }).click();
    await expect(page.getByRole('heading', { name: 'RAG sobre regulação de pagamentos' })).toBeVisible();

    await page.getByRole('link', { name: 'PayOps ao vivo' }).click();
    await expect(page).toHaveURL(/\/projetos\/payops$/);
    await expect(page.getByRole('heading', { level: 1, name: 'payops-agent' })).toBeVisible();
    await expect(page.locator('.payops')).toBeVisible();

    await page.getByRole('link', { name: 'RAG ao vivo' }).click();
    await expect(page.locator('.rag')).toBeVisible();

    await page.getByRole('link', { name: 'Início' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('rota desconhecida mostra a página 404', async ({ page }) => {
    await page.goto('/nao-existe');
    await expect(page.locator('main')).toContainText(/não encontrad|404/i);
  });

  test('CSS do microfrontend não vaza para o portfólio', async ({ page }) => {
    // Mede o host antes e depois de o remote montar, na mesma página (navegação SPA).
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'RAG ao vivo' })).toBeVisible();
    const probe = () =>
      page.evaluate(() => {
        const nav = document.querySelector('.nav');
        return {
          body: getComputedStyle(document.body).backgroundColor,
          font: getComputedStyle(document.body).fontFamily,
          nav: nav ? getComputedStyle(nav).backgroundColor : null,
        };
      });
    const before = await probe();
    await page.getByRole('link', { name: 'RAG ao vivo' }).click();
    await expect(page.locator('.rag')).toBeVisible();
    expect(await probe()).toEqual(before);
  });
});
