import AxeBuilder from '@axe-core/playwright';
import { PayOps, expect, test } from './fixtures';

test.describe('navegação do portfólio', () => {
  test('home mostra apresentação, projetos e links externos seguros', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Portfólio/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Engenharia de software para pagamentos e IA');

    const projects = page.locator('article.project');
    await expect(projects.filter({ hasText: 'payops-agent' })).toBeVisible();
    await expect(projects.filter({ hasText: 'rag-eval-harness' })).toBeVisible();

    // Todo link externo abre em nova aba sem vazar window.opener.
    const external = page.locator('a[href^="http"]');
    const count = await external.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      await expect(external.nth(i)).toHaveAttribute('target', '_blank');
      await expect(external.nth(i)).toHaveAttribute('rel', /noreferrer/);
    }
  });

  test('menu leva ao PayOps e volta, marcando o item ativo', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation');

    await nav.getByRole('link', { name: 'PayOps ao vivo' }).click();
    await expect(page).toHaveURL(/\/projetos\/payops$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('payops-agent');
    await expect(nav.getByRole('link', { name: 'PayOps ao vivo' })).toHaveAttribute('aria-current', 'page');

    await nav.getByRole('link', { name: 'Início' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(nav.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page');
  });

  test('CTA do topo e o card do projeto abrem a demo', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Usar o PayOps ao vivo' }).click();
    await expect(page).toHaveURL(/\/projetos\/payops$/);

    await page.goto('/');
    await page.locator('article.project', { hasText: 'payops-agent' }).getByRole('link', { name: 'Demo ao vivo' }).click();
    await expect(page).toHaveURL(/\/projetos\/payops$/);
    await expect(new PayOps(page).root).toBeVisible();
  });

  test('voltar e avançar do navegador funcionam entre rotas', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Usar o PayOps ao vivo' }).click();
    await expect(new PayOps(page).root).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('article.project').first()).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(/\/projetos\/payops$/);
    await expect(new PayOps(page).root).toBeVisible();
  });

  test('link direto para a demo funciona (deep link)', async ({ page }) => {
    const payops = new PayOps(page);
    await payops.open();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('payops-agent');
  });

  test('menu leva ao RAG, outro microfrontend no mesmo host', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation').getByRole('link', { name: 'RAG ao vivo' }).click();
    await expect(page).toHaveURL(/\/projetos\/rag$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('rag-eval-harness');
    // O conteúdo do RAG é coberto pelas jornadas em apps/rag/e2e; aqui basta o remote montar.
    await expect(page.getByRole('heading', { name: /Não foi possível carregar/ })).toHaveCount(0);
  });

  test('páginas sem microfrontend não buscam nenhum remote e não quebram com eles fora do ar', async ({ page }) => {
    const remoteHits: string[] = [];
    await page.route(/localhost:528[1-6]\//, (route) => {
      remoteHits.push(route.request().url());
      return route.abort();
    });
    await page.goto('/');
    await expect(page.locator('article.project').first()).toBeVisible();
    await page.goto('/nao-existe');
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
    expect(remoteHits, 'requisições a remotes em páginas que não os usam').toEqual([]);
  });

  test('rota inexistente mostra 404 com caminho de volta', async ({ page }) => {
    await page.goto('/nao-existe');
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
    await page.getByRole('link', { name: 'Voltar ao início' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('sem violações de acessibilidade graves na home e na demo, nos temas claro e escuro', async ({ page }) => {
    for (const [scheme, path] of [
      ['light', '/'],
      ['light', '/projetos/payops'],
      ['dark', '/'],
      ['dark', '/projetos/payops'],
    ] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      if (path !== '/') await expect(new PayOps(page).root.getByRole('heading', { name: 'PayOps Console' })).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      const serious = results.violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${scheme} ${path} · ${v.id}: ${v.help} (${v.nodes.length}x) → ${v.nodes[0]?.target.join(' ')}`);
      expect(serious, 'violações sérias/críticas de acessibilidade').toEqual([]);
    }
  });
});

test.describe('layout móvel @mobile', () => {
  for (const path of ['/', '/projetos/payops', '/nao-existe']) {
    test(`sem rolagem horizontal em ${path} @mobile`, async ({ page }) => {
      await page.goto(path);
      if (path === '/projetos/payops') await expect(new PayOps(page).root.getByRole('heading', { name: 'PayOps Console' })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'pixels de rolagem horizontal').toBeLessThanOrEqual(0);
      await expect(page.getByRole('navigation')).toBeVisible();
    });
  }

  test('jornada de cobrança funciona no celular @mobile', async ({ page }) => {
    const payops = new PayOps(page);
    await payops.open();
    await payops.chargeApproved('45,00');
    await payops.expectBalance('Card revenue', 4_500);
  });
});
