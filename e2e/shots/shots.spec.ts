import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { PayOps } from '../tests/fixtures';

/**
 * Gera as capturas estáticas usadas na home (apps em modo demo).
 * frame: até 1280×800 e crop: até 640×480 a partir do canto superior esquerdo do root (nunca além dele).
 */
const OUT = resolve(import.meta.dirname, '../../apps/portfolio/src/assets/shots');
mkdirSync(OUT, { recursive: true });

async function capture(page: Page, root: Locator, name: string) {
  await page.addStyleTag({ content: '::-webkit-scrollbar{display:none}html{scrollbar-width:none}' });
  await page.setViewportSize({ width: 1280, height: 820 });
  await root.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600); // animações de entrada
  await root.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  const box = (await root.boundingBox())!;
  // Recorte limitado à caixa do root: nenhum pixel da página hospedeira entra na imagem.
  const x = Math.ceil(box.x);
  const y = Math.ceil(box.y);
  const clip = (w: number, h: number) => ({
    x,
    y,
    width: Math.min(w, Math.floor(box.x + box.width) - x),
    height: Math.min(h, Math.floor(box.y + box.height) - y),
  });
  const opts = { type: 'jpeg', quality: 75 } as const;
  await page.screenshot({ ...opts, path: `${OUT}/${name}-frame.jpg`, clip: clip(1280, 800) });
  await page.screenshot({ ...opts, path: `${OUT}/${name}-crop.jpg`, clip: clip(640, 480) });
}

test('payops: estorno com aprovação pendente', async ({ page }) => {
  const payops = new PayOps(page);
  await payops.open();
  await payops.chargeApproved('100,00');
  await payops.goTab('Estornar');
  await payops.field('Valor do estorno (R$)').fill('30,00');
  await payops.root.getByRole('button', { name: 'Pedir estorno ao agente' }).click();
  await expect(payops.approvalCards.first()).toBeVisible();
  await capture(page, payops.root, 'payops');
});

test('rag: busca por Pix', async ({ page }) => {
  await page.goto('/projetos/rag');
  const root = page.locator('.rag');
  await root.getByRole('textbox').fill('Pix');
  await root.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(root.locator('.rg-hit').first()).toBeVisible();
  await capture(page, root, 'rag');
});

test('lagoski: camiseta no carrinho', async ({ page }) => {
  await page.goto('/projetos/lagoski');
  const catalog = page.locator('.lgk-catalog');
  const card = catalog.getByRole('article').first();
  await expect(card).toBeVisible();
  await card.getByRole('group', { name: 'Tamanho' }).getByRole('button', { name: 'M', exact: true }).click();
  await card.getByRole('button', { name: 'Adicionar ao carrinho' }).click();
  await expect(card.getByRole('status')).toContainText('no carrinho');
  await expect(page.locator('.lgk-inspector').getByText('modo demo · barramento simulado')).toBeVisible();
  await capture(page, page.locator('.lagoski-layout'), 'lagoski');
});

test('vitrine: ofertas', async ({ page }) => {
  await page.context().route(/mercadolivre|amazon|shopee|magazineluiza/, (r) =>
    r.fulfill({ status: 200, contentType: 'text/html', body: 'loja' }),
  );
  await page.goto('/projetos/vitrine');
  const root = page.locator('.vt');
  await expect(root.getByText('modo demo · produtos de exemplo')).toBeVisible();
  await expect(root.locator('.vt-card')).toHaveCount(4);
  await capture(page, root, 'vitrine');
});
