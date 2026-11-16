import { test as base, expect, type Locator, type Page } from '@playwright/test';

/**
 * Guard automático: todo teste falha se a página registrar erro de console ou
 * exceção não tratada, salvo padrões liberados com allowErrors().
 */
export const test = base.extend<{ _guard: void }>({
  _guard: [
    async ({ page }, use, testInfo) => {
      const consoleErrors: string[] = [];
      const allowed: RegExp[] = [];
      (testInfo as unknown as { allow: (p: RegExp) => void }).allow = (p) => allowed.push(p);
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(`console: ${msg.text()}`);
      });
      page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
      await use();
      const unexpected = consoleErrors.filter((e) => !allowed.some((p) => p.test(e)));
      expect(unexpected, 'erros de console inesperados').toEqual([]);
    },
    { auto: true },
  ],
});

/** Permite erros de console que o teste provoca de propósito. */
export function allowErrors(pattern: RegExp) {
  (test.info() as unknown as { allow: (p: RegExp) => void }).allow(pattern);
}

export { expect };

/* ------------------------------ PayOps ------------------------------ */

export class PayOps {
  readonly root: Locator;
  constructor(readonly page: Page) {
    this.root = page.locator('.payops');
  }

  async open() {
    await this.page.goto('/projetos/payops');
    await expect(this.root.getByRole('heading', { name: 'PayOps Console' })).toBeVisible();
  }

  tab(name: string) {
    return this.root.getByRole('tab', { name });
  }

  async goTab(name: string) {
    await this.tab(name).click();
    await expect(this.tab(name)).toHaveAttribute('aria-selected', 'true');
  }

  field(label: string) {
    return this.root.getByLabel(label, { exact: false });
  }

  /** Card do aprovador humano. */
  get inbox() {
    return this.root.locator('section.human');
  }

  get approvalCards() {
    return this.inbox.locator('.po-approval');
  }

  /** Entradas de atividade, mais recente primeiro. */
  get entries() {
    return this.root.locator('article.po-entry');
  }

  async approveNext() {
    const card = this.approvalCards.first();
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Aprovar só esta ação' }).click();
  }

  async denyNext() {
    const card = this.approvalCards.first();
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Negar' }).click();
  }

  /** Saldo de uma conta no card "Saldos do ledger", em centavos. */
  async balance(account: string): Promise<number> {
    const text = await this.root
      .locator('section.po-card', { hasText: 'Saldos do ledger' })
      .locator('.po-balance-item', { hasText: account })
      .locator('b')
      .innerText();
    return Math.round(Number(text.replace(/[^\d,-]/g, '').replace(',', '.')) * 100);
  }

  async expectBalance(account: string, cents: number) {
    await expect.poll(() => this.balance(account), { message: `saldo de ${account}` }).toBe(cents);
  }

  /** Cobra e aprova; devolve o ID da transação. */
  async chargeApproved(amount: string, customer = 'cus_demo'): Promise<string> {
    await this.goTab('Cobrar');
    await this.field('Valor (R$)').fill(amount);
    await this.field('Cliente').fill(customer);
    await this.root.getByRole('button', { name: 'Pedir cobrança ao agente' }).click();
    await this.approveNext();
    const entry = this.entries.first();
    await expect(entry).toContainText('concluído');
    const answer = await entry.locator('.po-answer').innerText();
    const id = answer.match(/transação ([0-9a-f-]{36})/)?.[1];
    expect(id, 'ID da transação na resposta').toBeTruthy();
    return id!;
  }
}

export const brl = (s: string) => new RegExp(s.replace(/[.$]/g, '\\$&').replace(/\s/g, '\\s'));
