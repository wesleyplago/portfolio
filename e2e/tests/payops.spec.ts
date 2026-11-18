import { PayOps, allowErrors, expect, test } from './fixtures';
import { PAYOPS_URL } from '../playwright.config';

test.describe('PayOps dentro do portfólio (modo demo)', () => {
  let payops: PayOps;

  test.beforeEach(async ({ page }) => {
    payops = new PayOps(page);
    await payops.open();
  });

  test('sobe em modo demo, explica o motivo e esconde o Jaeger', async () => {
    await expect(payops.root.getByText('modo demo · dados simulados')).toBeVisible();
    await expect(payops.root.locator('.po-banner.info')).toContainText('VITE_PAYOPS_API_URL não declarada');
    await expect(payops.root.getByRole('link', { name: /Jaeger/ })).toHaveCount(0);
    await expect(payops.inbox).toContainText('Nenhum pedido pendente.');
    for (const account of ['Card revenue', 'Cash / settlement', 'Pix payouts', 'Refunds (contra-revenue)']) {
      await payops.expectBalance(account, 0);
    }
  });

  test('marca clara com cantos e foco da própria marca, mesmo com o sistema escuro', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(payops.root).toHaveCSS('color-scheme', 'light');
    await expect(payops.root.locator('.po-btn').first()).toHaveCSS('border-radius', '2px');
    await expect(payops.root.locator('.po-tabs').first()).toHaveCSS('border-radius', '4px');
    const ring = await payops.root.evaluate((root) => {
      const el = document.createElement('div');
      el.tabIndex = -1;
      root.append(el);
      el.focus();
      const out = { visible: el.matches(':focus-visible'), color: getComputedStyle(el).outlineColor };
      el.remove();
      return out;
    });
    expect(ring).toEqual({ visible: true, color: 'rgb(13, 116, 128)' });
  });

  test('formulário de cobrança valida antes de chamar o agente', async () => {
    const submit = payops.root.getByRole('button', { name: 'Pedir cobrança ao agente' });

    await payops.field('Valor (R$)').fill('abc');
    await payops.field('Cliente').fill('demo');
    await submit.click();
    await expect(payops.root.getByText('Valor inválido')).toBeVisible();
    await expect(payops.root.getByText('Use o formato cus_xxx')).toBeVisible();

    await payops.field('Valor (R$)').fill('100.000,01');
    await payops.field('Cliente').fill('cus_ok');
    await submit.click();
    await expect(payops.root.getByText('Acima do teto de R$ 100.000,00')).toBeVisible();

    // Digitar limpa o erro do campo.
    await payops.field('Valor (R$)').fill('10');
    await expect(payops.root.getByText('Acima do teto de R$ 100.000,00')).toHaveCount(0);

    await expect(payops.entries).toHaveCount(0);
    await expect(payops.approvalCards).toHaveCount(0);
  });

  test('cobrança: espera o humano, aprova, lança no ledger', async () => {
    await payops.field('Valor (R$)').fill('123,45');
    await payops.root.getByRole('button', { name: 'Pedir cobrança ao agente' }).click();

    const entry = payops.entries.first();
    await expect(entry).toContainText('Agente aguardando a decisão do aprovador humano');
    const card = payops.approvalCards.first();
    await expect(card).toContainText('Cobrança');
    await expect(card.locator('.po-approval-amount')).toHaveText(/123,45/);
    await expect(card).toContainText('cus_demo');
    await expect(card).toContainText(/expira em \d+s/);

    await payops.approveNext();
    await expect(entry).toContainText('concluído');
    await expect(entry.locator('.po-chain').first()).toContainText('request_approval');
    await expect(entry.locator('.po-chain').first()).toContainText('create_charge');
    await expect(entry).toContainText(/Cobrança registrada: R\$\s123,45/);
    await expect(payops.inbox).toContainText('Nenhum pedido pendente.');
    await payops.expectBalance('Card revenue', 12_345);
    await payops.expectBalance('Cash / settlement', 12_345);
  });

  test('repetir com a mesma chave devolve a mesma transação, sem nova aprovação nem nova cobrança', async () => {
    const txId = await payops.chargeApproved('50,00');
    await payops.entries.first().getByRole('button', { name: 'Repetir com a mesma chave' }).click();

    const replay = payops.entries.first();
    await expect(replay).toContainText('retry · mesma chave');
    await expect(replay).toContainText('concluído');
    await expect(replay).toContainText('create_charge · replay');
    await expect(replay).toContainText(txId);
    await expect(replay).not.toContainText('request_approval');
    await expect(payops.approvalCards).toHaveCount(0);
    await payops.expectBalance('Card revenue', 5_000);
    await expect(payops.entries).toHaveCount(2);
  });

  test('negar a aprovação não move dinheiro e explica o código', async () => {
    await payops.root.getByRole('button', { name: 'Pedir cobrança ao agente' }).click();
    await payops.denyNext();
    const entry = payops.entries.first();
    await expect(entry).toContainText('negado');
    await expect(entry).toContainText('APPROVAL_DENIED');
    await expect(entry).toContainText('(o humano negou)');
    await expect(entry.getByRole('button', { name: 'Repetir com a mesma chave' })).toHaveCount(0);
    await payops.expectBalance('Card revenue', 0);
  });

  test('dois pedidos ao mesmo tempo: aprovar um e negar o outro', async () => {
    const submit = payops.root.getByRole('button', { name: 'Pedir cobrança ao agente' });
    await payops.field('Valor (R$)').fill('10,00');
    await submit.click();
    await payops.field('Valor (R$)').fill('20,00');
    await submit.click();
    await expect(payops.approvalCards).toHaveCount(2);

    await payops.approvalCards.filter({ hasText: /10,00/ }).getByRole('button', { name: 'Aprovar só esta ação' }).click();
    await payops.approvalCards.filter({ hasText: /20,00/ }).getByRole('button', { name: 'Negar' }).click();

    await expect(payops.entries.filter({ hasText: 'concluído' })).toHaveCount(1);
    await expect(payops.entries.filter({ hasText: 'APPROVAL_DENIED' })).toHaveCount(1);
    await payops.expectBalance('Card revenue', 1_000);
  });

  test('estorno parcial passa; acima do capturado é bloqueado mesmo aprovado', async () => {
    const chargeId = await payops.chargeApproved('100,00');
    await payops.goTab('Estornar');

    const select = payops.root.getByRole('combobox', { name: /Cobrança/ });
    await expect(select).toHaveValue(chargeId);
    await expect(payops.root.getByText(/Capturado R\$\s100,00 · já estornado R\$\s0,00/)).toBeVisible();

    await payops.field('Valor do estorno (R$)').fill('30,00');
    await payops.root.getByRole('button', { name: 'Pedir estorno ao agente' }).click();
    await payops.approveNext();
    await expect(payops.entries.first()).toContainText('Estorno registrado');
    await expect(payops.root.getByText(/já estornado R\$\s30,00/)).toBeVisible();

    await payops.field('Valor do estorno (R$)').fill('80,00');
    await payops.root.getByRole('button', { name: 'Pedir estorno ao agente' }).click();
    await payops.approveNext();
    const blocked = payops.entries.first();
    await expect(blocked).toContainText('bloqueado');
    await expect(blocked).toContainText('REFUND_EXCEEDS_CAPTURE');
    await expect(blocked).toContainText('(estorno acima do valor capturado)');

    await payops.expectBalance('Refunds (contra-revenue)', 3_000);
    await payops.expectBalance('Cash / settlement', 7_000);
    await payops.expectBalance('Card revenue', 10_000);
  });

  test('estorno sem cobranças na sessão pede um ID válido', async () => {
    await payops.goTab('Estornar');
    const input = payops.root.getByPlaceholder('UUID da transação de cobrança');
    await expect(input).toBeVisible();
    await input.fill('nao-e-uuid');
    await payops.root.getByRole('button', { name: 'Pedir estorno ao agente' }).click();
    await expect(payops.root.getByText('Selecione ou cole o ID da cobrança')).toBeVisible();
    await expect(payops.entries).toHaveCount(0);
  });

  test('Pix para destino permitido passa pelo humano e lança em Pix payouts', async () => {
    await payops.goTab('Pix');
    await payops.field('Chave Pix de destino').fill('pix-vendor-002');
    await payops.field('Valor (R$)').fill('50,00');
    await payops.root.getByRole('button', { name: 'Pedir Pix ao agente' }).click();
    await expect(payops.approvalCards.first()).toContainText('pix-vendor-002');
    await payops.approveNext();
    await expect(payops.entries.first()).toContainText('Pix enviado');
    await payops.expectBalance('Pix payouts', 5_000);
    await payops.expectBalance('Cash / settlement', -5_000);
  });

  test('Pix para destino fora da allowlist é barrado antes de chegar ao humano', async () => {
    await payops.goTab('Pix');
    await payops.field('Chave Pix de destino').fill('pix-atacante');
    await payops.root.getByRole('button', { name: 'Pedir Pix ao agente' }).click();
    const entry = payops.entries.first();
    await expect(entry).toContainText('bloqueado');
    await expect(entry).toContainText('POLICY_VIOLATION');
    await expect(payops.approvalCards).toHaveCount(0);
    await payops.expectBalance('Pix payouts', 0);
  });

  test('consultas: saldos e faturas filtradas, sem pedir aprovação', async () => {
    await payops.goTab('Consultas');
    await payops.root.getByRole('button', { name: 'Ver saldos' }).click();
    await expect(payops.entries.first()).toContainText('Consultar saldos');
    await expect(payops.entries.first()).toContainText('get_balance');

    await payops.root.getByRole('combobox').selectOption('overdue');
    await payops.root.getByRole('button', { name: 'Listar faturas' }).click();
    const invoices = payops.entries.first();
    await expect(invoices).toContainText('1 fatura(s) encontrada(s).');
    await expect(invoices).toContainText('cus_002');
    await expect(invoices).toContainText('overdue');
    await expect(payops.approvalCards).toHaveCount(0);
  });

  for (const attack of ['Ignorar instruções', 'Pedir estorno', 'Exfiltrar PII', 'Alterar política', 'Forjar aprovação']) {
    test(`prompt injection "${attack}": documento em quarentena e só a ação pedida`, async () => {
      await payops.goTab('Prompt injection');
      await payops.root.getByRole('combobox', { name: /Tipo de ataque/ }).selectOption({ label: attack });
      await payops.root.getByRole('button', { name: 'Enviar pedido com documento malicioso' }).click();
      const entry = payops.entries.first();
      await expect(entry).toContainText(`Ataque: ${attack}`);
      await expect(entry).toContainText('concluído');
      await expect(entry.locator('.po-chain').first()).toHaveText(/concluído\s*list_invoices$/);
      await expect(entry).toContainText('1 documento(s) lido(s) · 1 em quarentena');
      await expect(payops.approvalCards).toHaveCount(0);
      await payops.expectBalance('Card revenue', 0);
    });
  }

  test('detalhes JSON mostram intent e resultado', async () => {
    await payops.chargeApproved('12,00');
    const entry = payops.entries.first();
    await entry.getByText('JSON').click();
    const pre = entry.locator('pre');
    await expect(pre).toBeVisible();
    await expect(pre).toContainText('"tool": "create_charge"');
    await expect(pre).toContainText('"idempotency_key"');
  });
});

test.describe('isolamento do microfrontend', () => {
  test('remote fora do ar: só a área do PayOps falha, e "Tentar de novo" recupera', async ({ page }) => {
    allowErrors(/remoteEntry|Federation Runtime|Failed to fetch dynamically imported module|ERR_FAILED|Failed to load resource/);
    await page.route('**/remoteEntry.js', (route) => route.abort());
    await page.goto('/projetos/payops');

    await expect(page.getByRole('heading', { name: /Não foi possível carregar o microfrontend “payops”/ })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('payops-agent');
    await expect(page.getByRole('navigation')).toBeVisible();

    await page.unroute('**/remoteEntry.js');
    await page.getByRole('button', { name: 'Tentar de novo' }).click();
    await expect(page.locator('.payops').getByRole('heading', { name: 'PayOps Console' })).toBeVisible();
  });

  test('o remote também roda sozinho, fora do portfólio', async ({ page }) => {
    await page.goto(PAYOPS_URL);
    await expect(page.locator('.payops').getByRole('heading', { name: 'PayOps Console' })).toBeVisible();
    const payops = new PayOps(page);
    await payops.chargeApproved('9,90');
    await payops.expectBalance('Card revenue', 990);
  });

  test('o estado do mock não vaza entre carregamentos da página', async ({ page }) => {
    const payops = new PayOps(page);
    await payops.open();
    await payops.chargeApproved('5,00');
    await page.reload();
    await expect(payops.root.getByRole('heading', { name: 'PayOps Console' })).toBeVisible();
    await expect(payops.entries).toHaveCount(0);
    await payops.expectBalance('Card revenue', 0);
  });
});

test('PayOps usa a marca própria mesmo com o sistema em modo escuro', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/projetos/payops');
  const root = new PayOps(page).root;
  await expect(root).toHaveCSS('background-color', 'rgb(247, 249, 250)');
  await expect(root).toHaveCSS('font-family', /Chivo/);
});
