import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';
import { allowErrors, expect, test } from './fixtures';

/**
 * Jornadas da vitrine de afiliados (remote `vitrine`) em modo mock:
 * 4 produtos publicados + 1 rascunho de exemplo, admin fixo do modo demo.
 */
const ADMIN = { username: 'admin', password: 'vitrine@2026' };
const STORE_HOSTS = /^https:\/\/([a-z0-9-]+\.)*(shopee\.com\.br|mercadolivre\.com(\.br)?)\//;

class Vitrine {
  readonly root: Locator;
  constructor(readonly page: Page) {
    this.root = page.locator('.vt');
  }

  async open() {
    // Nenhum teste sai para a loja de verdade: a aba nova recebe uma página falsa.
    await this.page.context().route(STORE_HOSTS, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Loja</title>loja' }),
    );
    await this.page.goto('/projetos/vitrine');
    await expect(this.root.getByText('modo demo · produtos de exemplo')).toBeVisible();
    await expect(this.cards).toHaveCount(4);
  }

  get cards() {
    return this.root.locator('.vt-card');
  }

  card(title: string) {
    return this.cards.filter({ hasText: title });
  }

  async goTab(name: 'Vitrine' | 'Backoffice') {
    const tab = this.root.getByRole('tab', { name });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  }

  async login(username = ADMIN.username, password = ADMIN.password) {
    await this.goTab('Backoffice');
    await this.root.getByLabel('Usuário').fill(username);
    await this.root.getByLabel('Senha').fill(password);
    await this.root.getByRole('button', { name: 'Entrar' }).click();
  }

  async loginOk() {
    await this.login();
    await expect(this.root.getByText('Logado como admin')).toBeVisible();
  }

  row(title: string) {
    return this.root.locator('tbody tr', { hasText: title });
  }

  stat(label: string) {
    return this.root.locator('.vt-stats div', { hasText: label }).locator('strong');
  }

  form(heading: string) {
    return this.root.locator('form', { has: this.page.getByRole('heading', { name: heading }) });
  }
}

test.describe('vitrine pública', () => {
  test('menu leva à vitrine, que mostra só produtos publicados', async ({ page }) => {
    const v = new Vitrine(page);
    await page.goto('/');
    await page.getByRole('navigation').getByRole('link', { name: 'Vitrine ao vivo' }).click();
    await expect(page).toHaveURL(/\/projetos\/vitrine$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vitrine de afiliados');
    await expect(v.cards).toHaveCount(4);
    await expect(v.card('Luminária LED')).toHaveCount(0);
    await expect(v.root.getByText(/Somos afiliados da Shopee e do Mercado Livre/)).toBeVisible();
  });

  test('busca e filtro por loja', async ({ page }) => {
    const v = new Vitrine(page);
    await v.open();
    const search = v.root.getByRole('searchbox', { name: 'Buscar produto ou categoria' });

    await search.fill('air fryer');
    await expect(v.cards).toHaveCount(1);
    await expect(v.card('Air fryer 4 litros')).toBeVisible();

    await search.fill('casa');
    await expect(v.cards).toHaveCount(2);

    await search.fill('nada parecido com isto');
    await expect(v.root.getByText('Nenhuma oferta encontrada.')).toBeVisible();
    await expect(v.cards).toHaveCount(0);

    await search.fill('');
    const ml = v.root.getByRole('button', { name: 'Mercado Livre', exact: true });
    await ml.click();
    await expect(ml).toHaveAttribute('aria-pressed', 'true');
    await expect(v.cards).toHaveCount(2);
    await expect(v.cards.locator('.vt-store')).toHaveText(['Mercado Livre', 'Mercado Livre']);

    await v.root.getByRole('button', { name: 'Todas' }).click();
    await expect(v.cards).toHaveCount(4);
  });

  test('preço mostra de/por e desconto calculado', async ({ page }) => {
    const v = new Vitrine(page);
    await v.open();
    const fone = v.card('Fone Bluetooth TWS');
    await expect(fone.locator('s')).toHaveText(/R\$\s129,90/);
    await expect(fone.locator('strong')).toHaveText(/R\$\s79,90/);
    await expect(fone.getByText('38% off')).toBeVisible();
    // Sem preço "de" não há desconto inventado.
    const garrafa = v.card('Garrafa térmica');
    await expect(garrafa.locator('s')).toHaveCount(0);
    await expect(garrafa.getByText(/off/)).toHaveCount(0);
  });

  test('botão Comprar vai direto ao domínio da loja, em nova aba, sem redirect nosso', async ({ page }) => {
    const v = new Vitrine(page);
    await v.open();
    const buttons = v.root.getByRole('link', { name: /^Comprar n[ao] / });
    await expect(buttons).toHaveCount(4);
    for (const link of await buttons.all()) {
      await expect(link).toHaveAttribute('href', STORE_HOSTS);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'sponsored nofollow noopener');
    }
    await expect(v.card('Fone Bluetooth').getByRole('link')).toHaveText('Comprar na Shopee');
    await expect(v.card('Air fryer').getByRole('link')).toHaveText('Comprar no Mercado Livre');

    const [shop] = await Promise.all([
      page.waitForEvent('popup'),
      v.card('Fone Bluetooth').getByRole('link').click(),
    ]);
    await expect(shop).toHaveURL(/^https:\/\/shopee\.com\.br\/search\?keyword=/);
    // A vitrine continua onde estava.
    await expect(page).toHaveURL(/\/projetos\/vitrine$/);
  });
});

test.describe('backoffice', () => {
  test('login valida campos, recusa senha errada e entra com o admin fixo', async ({ page }) => {
    const v = new Vitrine(page);
    await v.open();
    await v.goTab('Backoffice');
    await expect(v.root.getByRole('heading', { name: 'Entrar no backoffice' })).toBeVisible();
    await expect(v.root.getByText(`Modo demo: usuário ${ADMIN.username}, senha ${ADMIN.password}.`)).toBeVisible();

    await v.root.getByRole('button', { name: 'Entrar' }).click();
    await expect(v.root.getByRole('alert')).toHaveText('Informe o usuário');

    await v.login('admin', 'errada');
    await expect(v.root.getByRole('alert')).toHaveText('Usuário ou senha incorretos.');

    await v.login('outro', ADMIN.password);
    await expect(v.root.getByRole('alert')).toHaveText('Usuário ou senha incorretos.');

    // Enter no campo de senha envia o formulário.
    await v.root.getByLabel('Usuário').fill(ADMIN.username);
    await v.root.getByLabel('Senha').fill(ADMIN.password);
    await v.root.getByLabel('Senha').press('Enter');
    await expect(v.root.getByText('Logado como admin')).toBeVisible();
    await expect(v.row('Luminária LED')).toContainText('Rascunho');
  });

  test('sessão sobrevive à troca de aba e Sair volta ao login', async ({ page }) => {
    const v = new Vitrine(page);
    await v.open();
    await v.loginOk();
    await v.goTab('Vitrine');
    await v.goTab('Backoffice');
    await expect(v.root.getByText('Logado como admin')).toBeVisible();

    await v.root.getByRole('button', { name: 'Sair' }).click();
    await expect(v.root.getByRole('heading', { name: 'Entrar no backoffice' })).toBeVisible();
    await expect(v.root.getByLabel('Usuário')).toHaveValue('');
    await expect(v.root.getByLabel('Senha')).toHaveValue('');
  });

  test('clique no Comprar aparece no relatório do backoffice', async ({ page }) => {
    const v = new Vitrine(page);
    await v.open();
    for (let i = 0; i < 2; i += 1) {
      const [shop] = await Promise.all([page.waitForEvent('popup'), v.card('Air fryer').getByRole('link').click()]);
      await shop.close();
    }
    await v.loginOk();
    await expect(v.stat('Cliques')).toHaveText('2');
    await expect(v.row('Air fryer').locator('td').nth(4)).toHaveText('2');
    await expect(v.row('Fone Bluetooth').locator('td').nth(4)).toHaveText('0');
  });

  test('publicar e despublicar refletem na vitrine', async ({ page }) => {
    const v = new Vitrine(page);
    await v.open();
    await v.loginOk();

    await v.row('Luminária LED').getByRole('button', { name: 'Publicar Luminária LED de mesa com 3 tons' }).click();
    await expect(v.row('Luminária LED')).toContainText('Publicado');
    await v.row('Tênis de corrida').getByRole('button', { name: /^Despublicar/ }).click();
    await expect(v.row('Tênis de corrida')).toContainText('Rascunho');

    await v.goTab('Vitrine');
    await expect(v.cards).toHaveCount(4);
    await expect(v.card('Luminária LED')).toBeVisible();
    await expect(v.card('Tênis de corrida')).toHaveCount(0);
  });

  test('cadastro do Mercado Livre pede só o link e coleta o resto do anúncio', async ({ page }) => {
    const v = new Vitrine(page);
    await v.open();
    await v.loginOk();
    const form = v.form('Adicionar do Mercado Livre');
    const link = form.getByLabel('Link de afiliado');
    const save = form.getByRole('button', { name: 'Importar como rascunho' });

    // Um único campo: título, preço, foto e categoria vêm do anúncio.
    await expect(form.getByRole('textbox')).toHaveCount(1);
    await expect(save).toBeDisabled();

    await link.fill('https://bit.ly/3abc');
    await save.click();
    await expect(form.locator('.vt-error')).toHaveText(/domínio da loja/);

    const url = 'https://produto.mercadolivre.com.br/MLB-1234567890-mouse-sem-fio-_JM';
    await link.fill(url);
    await link.press('Enter');
    await expect(form.locator('.vt-error')).toHaveCount(0);
    await expect(v.row('Mouse sem fio')).toContainText('Rascunho');
    await expect(v.row('Mouse sem fio')).toContainText(/R\$\s99,90/);
    await expect(link).toHaveValue('');

    // Rascunho não aparece na vitrine; publicado, o botão Comprar usa o link como veio.
    await v.goTab('Vitrine');
    await expect(v.card('Mouse sem fio')).toHaveCount(0);
    await v.goTab('Backoffice');
    await v.row('Mouse sem fio').getByRole('button', { name: 'Publicar Mouse sem fio' }).click();
    await expect(v.row('Mouse sem fio')).toContainText('Publicado');
    await v.goTab('Vitrine');
    await expect(v.card('Mouse sem fio').getByRole('link', { name: 'Comprar no Mercado Livre' })).toHaveAttribute('href', url);
  });

  test('cadastro do Mercado Livre explica link inválido em português', async ({ page }) => {
    const v = new Vitrine(page);
    await v.open();
    await v.loginOk();
    const form = v.form('Adicionar do Mercado Livre');
    await form.getByLabel('Link de afiliado').fill('mouse sem fio');
    await form.getByRole('button', { name: 'Importar como rascunho' }).click();
    await expect(form.locator('.vt-error')).toHaveText('Cole o link gerado no portal de afiliados');
  });

  test('importação da Shopee recusa outro domínio e cria rascunho', async ({ page }) => {
    const v = new Vitrine(page);
    await v.open();
    await v.loginOk();
    const form = v.form('Adicionar da Shopee');
    const url = form.getByLabel('URL do produto');

    await url.fill('https://lista.mercadolivre.com.br/fone');
    await form.getByRole('button', { name: 'Importar como rascunho' }).click();
    await expect(form.locator('.vt-error')).toHaveText(/domínio da loja/);

    await url.fill('https://shopee.com.br/Caixa-de-Som-Portatil-i.123.456');
    await form.getByRole('button', { name: 'Importar como rascunho' }).click();
    await expect(v.row('Caixa de Som Portatil')).toContainText('Rascunho');
    await expect(url).toHaveValue('');
    await expect(form.locator('.vt-error')).toHaveCount(0);
  });
});

test.describe('qualidade da interface', () => {
  test('sem violações de acessibilidade graves na vitrine e no backoffice, claro e escuro', async ({ page }) => {
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      const v = new Vitrine(page);
      await v.open();
      const check = async (where: string) => {
        const results = await new AxeBuilder({ page }).include('.vt').withTags(['wcag2a', 'wcag2aa']).analyze();
        const serious = results.violations
          .filter((x) => x.impact === 'serious' || x.impact === 'critical')
          .map((x) => `${scheme} ${where} · ${x.id}: ${x.help} (${x.nodes.length}x) → ${x.nodes[0]?.target.join(' ')}`);
        expect(serious, 'violações sérias/críticas de acessibilidade').toEqual([]);
      };
      await check('vitrine');
      await v.goTab('Backoffice');
      await check('login');
      await v.loginOk();
      await check('painel');
    }
  });

  test('o remote fora do ar mostra erro só na área dele, com Tentar de novo', async ({ page }) => {
    allowErrors(/5287|remoteEntry|Failed to fetch|ERR_FAILED|Failed to load|RUNTIME-008|vitrine/i);
    await page.route(/localhost:5287\//, (route) => route.abort());
    await page.goto('/projetos/vitrine');
    await expect(page.getByRole('heading', { name: /Não foi possível carregar o microfrontend “vitrine”/ })).toBeVisible();
    await expect(page.getByRole('navigation')).toBeVisible();
  });
});

test('Vitrine usa a marca própria em bordô, e o backoffice é um painel de trabalho branco', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  const v = new Vitrine(page);
  await v.open();
  await expect(v.root).toHaveCSS('background-color', 'rgb(226, 226, 226)');
  await expect(v.cards.first().locator('.vt-price strong')).toHaveCSS('font-family', /Zilla Slab/);
  await v.goTab('Backoffice');
  await expect(v.root.locator('.vt-bo')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(v.root.locator('.vt-bo .vt-panel').first()).toHaveCSS('background-color', 'rgb(244, 244, 244)');
});

test.describe('vitrine no celular @mobile', () => {
  test('sem rolagem horizontal na vitrine e no backoffice, e o cadastro funciona @mobile', async ({ page }) => {
    const v = new Vitrine(page);
    await v.open();
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(await overflow(), 'rolagem horizontal na vitrine').toBeLessThanOrEqual(0);

    await v.goTab('Backoffice');
    expect(await overflow(), 'rolagem horizontal no login').toBeLessThanOrEqual(0);
    await v.loginOk();
    expect(await overflow(), 'rolagem horizontal no painel').toBeLessThanOrEqual(0);

    await v.row('Luminária LED').getByRole('button', { name: /^Publicar/ }).click();
    await expect(v.row('Luminária LED')).toContainText('Publicado');
  });
});
