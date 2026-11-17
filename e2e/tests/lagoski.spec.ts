import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';
import { allowErrors, expect, test } from './fixtures';

/**
 * Jornadas do Lagoski em modo demo: os quatro microfrontends sobem sem BFF e
 * usam o sistema simulado no navegador (mesmo contrato, mesmas regras).
 */
class Lagoski {
  readonly catalog: Locator;
  readonly checkout: Locator;
  readonly orders: Locator;
  readonly inspector: Locator;

  constructor(readonly page: Page) {
    this.catalog = page.locator('.lgk-catalog');
    this.checkout = page.locator('.lgk-checkout');
    this.orders = page.locator('.lgk-orders');
    this.inspector = page.locator('.lgk-inspector');
  }

  async open() {
    await this.page.goto('/projetos/lagoski');
    await expect(this.page.getByRole('heading', { level: 1 })).toHaveText('Lagoski');
    await expect(this.catalog.getByRole('article').first()).toBeVisible();
    await expect(this.inspector.getByText('modo demo · barramento simulado')).toBeVisible();
  }

  product(name: string) {
    return this.catalog.getByRole('article', { name });
  }

  async addToCart(name: string, size = 'M') {
    const card = this.product(name);
    await card.getByRole('group', { name: 'Tamanho' }).getByRole('button', { name: size, exact: true }).click();
    await card.getByRole('button', { name: 'Adicionar ao carrinho' }).click();
    await expect(card.getByRole('status')).toContainText('no carrinho');
  }

  async placeOrder() {
    await this.checkout.getByRole('button', { name: 'Fechar pedido' }).click();
    await expect(this.checkout.getByText('Seu carrinho está vazio')).toBeVisible();
  }

  status() {
    return this.checkout.locator('[data-status]');
  }

  async waitCheckout() {
    await expect(this.checkout.getByText('Stripe Checkout (simulado)')).toBeVisible({ timeout: 10_000 });
  }

  async pay(card: string) {
    await this.checkout.getByLabel('Número do cartão').fill(card);
    await this.checkout.getByRole('button', { name: /^Pagar/ }).click();
  }

  eventTypes() {
    return this.inspector.locator('.li-event').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.type));
  }

  topologyRow(consumer: string, topicPrefix: string) {
    return this.inspector.locator('tbody tr', { hasText: `${consumer} ← ${topicPrefix}` });
  }
}

test.describe('Lagoski (microfrontends + barramento simulado)', () => {
  test('menu e card da home levam à demo', async ({ page }) => {
    await page.goto('/');
    await page.locator('article.project', { hasText: 'Lagoski' }).getByRole('link', { name: 'Demo ao vivo' }).click();
    await expect(page).toHaveURL(/\/projetos\/lagoski$/);
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Lagoski ao vivo' })).toHaveAttribute('aria-current', 'page');
  });

  test('caminho feliz: compra paga com 4242 vai até a entrega, com saga no Inspector e e-mails', async ({ page }) => {
    test.setTimeout(45_000);
    const lg = new Lagoski(page);
    await lg.open();
    await lg.addToCart('Ondas do Lago');
    await lg.addToCart('Farol', 'G');
    await expect(lg.checkout.getByRole('list', { name: 'Itens do carrinho' }).getByRole('listitem')).toHaveCount(2);
    await expect(lg.checkout.getByText('R$ 164,80')).toBeVisible();

    await lg.placeOrder();
    await lg.waitCheckout();
    await expect(lg.status()).toHaveAttribute('data-status', 'AWAITING_PAYMENT');
    await lg.pay('4242 4242 4242 4242');

    await expect(lg.status()).toHaveAttribute('data-status', 'DELIVERED', { timeout: 20_000 });
    await expect(lg.checkout.getByText(/Rastreio: LG\d{9}BR/)).toBeVisible();

    // O Inspector foca o pedido e mostra a saga inteira, contexto por contexto.
    await expect.poll(() => lg.eventTypes()).toEqual(
      expect.arrayContaining([
        'lagoski.ordering.order.placed.v1',
        'lagoski.inventory.stock.reserved.v1',
        'lagoski.payment.payment.requested.v1',
        'lagoski.payment.payment.authorized.v1',
        'lagoski.ordering.order.confirmed.v1',
        'lagoski.inventory.stock.committed.v1',
        'lagoski.fulfillment.shipment.dispatched.v1',
        'lagoski.fulfillment.shipment.delivered.v1',
      ]),
    );
    await expect(lg.orders.locator('.lo-mail', { hasText: 'confirmado' })).toBeVisible();
    await expect(lg.orders.locator('.lo-mail', { hasText: 'a caminho' })).toBeVisible();
    await expect(lg.orders.locator('.lo-order').first()).toContainText('Entregue');

    // Estoque baixado de 25 para 24 no SKU comprado.
    await expect(lg.product('Ondas do Lago').getByText(/24 disponíveis/)).toBeVisible();
  });

  test('cartão recusado fica no checkout; deixar expirar cancela e libera o estoque', async ({ page }) => {
    const lg = new Lagoski(page);
    await lg.open();
    await lg.addToCart('Pinhão');
    await expect(lg.product('Pinhão').getByText(/25 disponíveis/)).toBeVisible();
    await lg.placeOrder();
    await lg.waitCheckout();
    await expect(lg.product('Pinhão').getByText(/24 disponíveis/)).toBeVisible();

    await lg.pay('4000 0000 0000 0002');
    await expect(lg.checkout.getByRole('alert')).toContainText('Cartão recusado');
    await expect(lg.status()).toHaveAttribute('data-status', 'AWAITING_PAYMENT');

    await lg.checkout.getByRole('button', { name: 'Deixar o checkout expirar' }).click();
    await expect(lg.status()).toHaveAttribute('data-status', 'CANCELLED');
    await expect(lg.status()).toContainText('pagamento não concluído');
    await expect(lg.product('Pinhão').getByText(/25 disponíveis/)).toBeVisible();
    await expect.poll(() => lg.eventTypes()).toContain('lagoski.inventory.stock.released.v1');
  });

  test('sem estoque: o Inventory rejeita a reserva e o Payment nem é acionado', async ({ page }) => {
    const lg = new Lagoski(page);
    await lg.open();
    await lg.addToCart('Serra Geral');
    await lg.inspector.getByRole('button', { name: 'Zerar o estoque dos itens do carrinho' }).click();
    await expect(lg.inspector.getByRole('status')).toContainText('Estoque zerado');
    await lg.placeOrder();
    await expect(lg.status()).toHaveAttribute('data-status', 'CANCELLED');
    await expect(lg.status()).toContainText('sem estoque');
    const types = await lg.eventTypes();
    expect(types).toContain('lagoski.inventory.stock.reservation-rejected.v1');
    expect(types.filter((t) => t?.startsWith('lagoski.payment.'))).toEqual([]);
  });

  test('mensagem envenenada vai para a DLQ e pode ser reprocessada', async ({ page }) => {
    const lg = new Lagoski(page);
    await lg.open();
    await lg.inspector.getByRole('button', { name: 'Publicar uma mensagem envenenada' }).click();
    const inventory = lg.topologyRow('inventory', 'ordering');
    await expect(inventory.locator('td.hot')).toHaveText(/^1/, { timeout: 15_000 });
    await expect(lg.topologyRow('payment', 'ordering').locator('td.hot')).toHaveText(/^1/, { timeout: 15_000 });
    // Quem não assina order.placed (filtro) nunca recebeu a mensagem.
    await expect(lg.topologyRow('fulfillment', 'ordering').locator('td.hot')).toHaveCount(0);
    await inventory.getByRole('button', { name: 'Reprocessar' }).click();
    await expect(inventory.locator('td').nth(2)).not.toHaveText('0');
  });

  test('derrubar o Fulfillment acumula mensagens; religar processa o atraso', async ({ page }) => {
    test.setTimeout(45_000);
    const lg = new Lagoski(page);
    await lg.open();
    await lg.inspector.getByRole('button', { name: 'Derrubar o fulfillment' }).click();
    await lg.addToCart('Básica Lagoski');
    await lg.placeOrder();
    await lg.waitCheckout();
    await lg.pay('4242 4242 4242 4242');
    await expect(lg.status()).toHaveAttribute('data-status', 'CONFIRMED');
    await expect(lg.topologyRow('fulfillment', 'ordering').locator('td.wait')).toHaveText('1');
    // O resto do sistema seguiu: e-mail de confirmação já saiu.
    await expect(lg.orders.locator('.lo-mail', { hasText: 'confirmado' })).toBeVisible();

    await lg.inspector.getByRole('button', { name: 'Religar o fulfillment' }).click();
    await expect(lg.status()).toHaveAttribute('data-status', 'DELIVERED', { timeout: 20_000 });
  });

  test('entrega duplicada é ignorada pelo inbox dos consumidores', async ({ page }) => {
    const lg = new Lagoski(page);
    await lg.open();
    await lg.addToCart('Curvas de Nível');
    await lg.placeOrder();
    await lg.waitCheckout();
    await lg.inspector.getByRole('button', { name: 'Reentregar o último evento (duplicata)' }).click();
    await expect(lg.inspector.getByRole('status')).toContainText('inbox');
    await expect
      .poll(() => lg.inspector.locator('tbody tr td:nth-child(6)').allInnerTexts())
      .toEqual(expect.arrayContaining(['1']));
    await expect(lg.status()).toHaveAttribute('data-status', 'AWAITING_PAYMENT');
  });

  test('um remote fora do ar só derruba a área dele', async ({ page }) => {
    allowErrors(/remoteEntry|Federation|Failed to fetch|ERR_|Loading|RUNTIME-008/i);
    await page.route(/localhost:5286\//, (route) => route.abort());
    await page.goto('/projetos/lagoski');
    await expect(page.locator('[data-remote="lagoski-inspector"]').getByRole('heading', { name: /Não foi possível carregar/ })).toBeVisible();
    const lg = new Lagoski(page);
    await expect(lg.catalog.getByRole('article').first()).toBeVisible();
    await lg.addToCart('Farol');
    await lg.placeOrder();
    await lg.waitCheckout();
  });

  test('sem violações de acessibilidade graves, temas claro e escuro', async ({ page }) => {
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      const lg = new Lagoski(page);
      await lg.open();
      const results = await new AxeBuilder({ page }).include('.lagoski-layout').withTags(['wcag2a', 'wcag2aa']).analyze();
      const serious = results.violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${scheme} · ${v.id}: ${v.help} (${v.nodes.length}x) → ${v.nodes[0]?.target.join(' ')}`);
      expect(serious, 'violações sérias/críticas de acessibilidade').toEqual([]);
    }
  });
});

test.describe('Lagoski no celular @mobile', () => {
  test('sem rolagem horizontal e compra funciona @mobile', async ({ page }) => {
    const lg = new Lagoski(page);
    await lg.open();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'pixels de rolagem horizontal').toBeLessThanOrEqual(0);
    await lg.addToCart('Ondas do Lago');
    await lg.placeOrder();
    await lg.waitCheckout();
    await lg.pay('4242 4242 4242 4242');
    await expect(lg.status()).toHaveAttribute('data-status', 'CONFIRMED');
  });
});
