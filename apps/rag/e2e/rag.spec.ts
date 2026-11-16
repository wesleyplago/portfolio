import { expect, test, type Page } from '@playwright/test';

/**
 * Jornadas do microfrontend do RAG dentro do portfólio.
 *
 * - "API real": precisam do rag-eval-harness no ar (VITE_RAG_API_URL em
 *   apps/rag/.env.local). Pulam sozinhos se a API não responder.
 * - "desacoplamento": derrubam a API (ou o próprio remote) com page.route e
 *   verificam que a UI continua utilizável com o mock.
 */

const API = process.env.RAG_API_URL ?? 'http://localhost:3001';
const RAG = '/projetos/rag';

const rag = (page: Page) => page.locator('.rag');
const hits = (page: Page) => page.locator('.rag .rg-hit');
const example = (page: Page, name: string) => rag(page).getByRole('button', { name, exact: true });

/** Falha o teste se a página lançar erro de JavaScript não tratado. */
function failOnPageErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return () => expect(errors, 'erros de JavaScript na página').toEqual([]);
}

async function apiIsUp(): Promise<boolean> {
  try {
    const response = await fetch(`${API}/health`, { signal: AbortSignal.timeout(2_000) });
    const body = (await response.json()) as { ready?: boolean };
    return response.ok && body.ready === true;
  } catch {
    return false;
  }
}

async function killApi(page: Page) {
  await page.route(`${API}/**`, (route) => route.abort('connectionrefused'));
}

test.describe('RAG com a API real', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!(await apiIsUp()), `API do rag-eval-harness fora do ar em ${API}`);
    await page.goto(RAG);
    await expect(rag(page).getByText('API real online')).toBeVisible();
  });

  test('pergunta semântica devolve trechos com documento, seção e score', async ({ page }) => {
    const assertNoErrors = failOnPageErrors(page);
    await example(page, 'Semântica').click();
    await expect(hits(page).first()).toBeVisible();
    // A UI mostra o que a API devolveu; a qualidade do ranking é medida no eval, não aqui.
    await expect(hits(page)).toHaveCount(5);
    await expect(hits(page).filter({ hasText: 'Mecanismo Especial de Devolução' }).first()).toBeVisible();
    await expect(hits(page).first()).toContainText(/score \d\.\d{4}/);
    await expect(hits(page).first()).toContainText(/chunk \d+ · /);
    await expect(rag(page).locator('.rg-meta')).toContainText('API real');
    await expect(rag(page).locator('.rg-meta')).toContainText(/\d+ ms/);
    assertNoErrors();
  });

  test('CNPJ alfanumérico vai para busca exata', async ({ page }) => {
    await example(page, 'CNPJ alfanumérico').click();
    await expect(hits(page).first()).toContainText('busca exata');
    await expect(hits(page).first()).toContainText('chunk 126412780');
  });

  test('pergunta fora do corpus faz o sistema se abster', async ({ page }) => {
    await example(page, 'Fora do corpus').click();
    await expect(rag(page).getByText('O sistema se absteve.')).toBeVisible();
    await expect(hits(page)).toHaveCount(0);
  });

  test('top-k controla quantos trechos voltam', async ({ page }) => {
    const textarea = rag(page).getByRole('textbox');
    await textarea.fill('Quais são as modalidades de arranjos de pagamento?');
    await rag(page).getByRole('combobox').selectOption('3');
    await rag(page).getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(hits(page)).toHaveCount(3);

    await rag(page).getByRole('combobox').selectOption('10');
    await textarea.press('Enter');
    await expect(hits(page)).toHaveCount(10);
  });
});

test.describe('RAG em qualquer modo', () => {
  test('valida a pergunta antes de chamar a API', async ({ page }) => {
    await page.goto(RAG);
    await expect(rag(page).locator('.rg-pill').first()).toBeVisible();
    let searches = 0;
    page.on('request', (r) => r.url().endsWith('/search') && searches++);
    await rag(page).getByRole('textbox').fill('a');
    await rag(page).getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(rag(page).getByText('Digite pelo menos 2 caracteres')).toBeVisible();
    expect(searches).toBe(0);
  });

  test('histórico guarda as buscas e refaz ao clicar', async ({ page }) => {
    await page.goto(RAG);
    await example(page, 'Arranjos').click();
    await expect(hits(page).first()).toBeVisible();
    await example(page, 'Fora do corpus').click();
    await expect(rag(page).getByText('O sistema se absteve.')).toBeVisible();

    const history = rag(page).locator('.rg-history-item');
    await expect(history).toHaveCount(2);
    await expect(history.first()).toContainText('absteve');

    await history.nth(1).click(); // a busca de arranjos, mais antiga
    await expect(hits(page).first()).toContainText('Modalidades');
    await expect(history).toHaveCount(3);
  });

  test('expande e recolhe um trecho longo', async ({ page }) => {
    await page.goto(RAG);
    await example(page, 'Semântica').click();
    const expand = hits(page).getByRole('button', { name: 'Ver trecho inteiro' }).first();
    await expect(expand).toBeVisible();
    await expand.click();
    await expect(hits(page).getByRole('button', { name: 'Recolher' }).first()).toBeVisible();
  });

  test('aba de resultados do eval mostra o snapshot publicado', async ({ page }) => {
    await page.goto(RAG);
    await rag(page).getByRole('tab', { name: 'Resultados do eval' }).click();
    const table = rag(page).locator('table').first();
    for (const config of ['bm25', 'dense', 'hybrid']) await expect(table).toContainText(config);
    await expect(table).toContainText('0.820');
    await expect(table).toContainText('não medido');
    await expect(rag(page).getByRole('link', { name: /results\/results-.*\.json/ })).toBeVisible();

    await rag(page).getByRole('tab', { name: 'Buscar' }).click();
    await expect(rag(page).getByRole('textbox')).toBeVisible();
  });

  test('cabe na tela do celular sem rolagem horizontal @mobile', async ({ page }) => {
    await page.goto(RAG);
    await example(page, 'Semântica').click();
    await expect(hits(page).first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe('desacoplamento', () => {
  test('API fora do ar na subida: usa o mock e continua funcionando', async ({ page }) => {
    const assertNoErrors = failOnPageErrors(page);
    await killApi(page);
    await page.goto(RAG);

    await expect(rag(page).getByText('modo demo · dados simulados')).toBeVisible();
    await expect(rag(page).getByText('Modo demo:')).toBeVisible();

    await example(page, 'Semântica').click();
    await expect(hits(page).first()).toContainText('Mecanismo Especial de Devolução');
    await expect(rag(page).locator('.rg-meta')).toContainText('mock');

    await example(page, 'CNPJ alfanumérico').click();
    await expect(hits(page).first()).toContainText('busca exata');

    await example(page, 'Fora do corpus').click();
    await expect(rag(page).getByText('O sistema se absteve.')).toBeVisible();
    assertNoErrors();
  });

  test('API cai no meio da sessão: mostra o erro e oferece o mock', async ({ page }) => {
    test.skip(!(await apiIsUp()), 'precisa da API no ar para começar em modo real');
    await page.goto(RAG);
    await expect(rag(page).getByText('API real online')).toBeVisible();

    await killApi(page);
    await example(page, 'Arranjos').click();
    await expect(rag(page).getByText('NETWORK_ERROR')).toBeVisible();

    await rag(page).getByRole('button', { name: 'Continuar em modo demo (mock)' }).click();
    await expect(rag(page).getByText('modo demo · dados simulados')).toBeVisible();
    await example(page, 'Arranjos').click();
    await expect(hits(page).first()).toContainText('Modalidades');
  });

  test('remote do RAG fora do ar: só a área dele falha e o retry recupera', async ({ page }) => {
    await page.route('http://localhost:5182/**', (route) => route.abort('connectionrefused'));
    await page.goto(RAG);

    await expect(page.getByText('Não foi possível carregar o microfrontend “rag”.')).toBeVisible();
    await expect(page.getByText('localhost:5182', { exact: true })).toBeVisible();
    // O resto do portfólio continua navegável.
    await expect(page.getByRole('heading', { level: 1, name: 'rag-eval-harness' })).toBeVisible();

    await page.unroute('http://localhost:5182/**');
    await page.getByRole('button', { name: 'Tentar de novo' }).click();
    await expect(page.getByRole('heading', { name: 'RAG sobre regulação de pagamentos' })).toBeVisible();
  });

  test('remote roda sozinho, fora do portfólio', async ({ page }) => {
    await page.goto('http://localhost:5182/');
    await expect(page.getByRole('heading', { name: 'RAG sobre regulação de pagamentos' })).toBeVisible();
  });
});
