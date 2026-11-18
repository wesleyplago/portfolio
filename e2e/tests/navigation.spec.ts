import AxeBuilder from '@axe-core/playwright';
import { PayOps, expect, test } from './fixtures';

test.describe('navegação do portfólio', () => {
  test('home mostra apresentação, projetos e links externos seguros', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Portfólio/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Engenharia de pagamentos e IA que não cobra duas vezes');

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

    await nav.getByRole('button', { name: 'Projetos' }).click();
    await nav.getByRole('link', { name: 'payops-agent' }).click();
    await expect(page).toHaveURL(/\/projetos\/payops$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('payops-agent');
    // O submenu fecha ao navegar; reabrir mostra o item ativo.
    await expect(nav.getByRole('button', { name: 'Projetos' })).toHaveAttribute('aria-expanded', 'false');
    await nav.getByRole('button', { name: 'Projetos' }).click();
    await expect(nav.getByRole('link', { name: 'payops-agent' })).toHaveAttribute('aria-current', 'page');

    await page.getByRole('link', { name: 'wesleyplago' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('submenu de projetos por teclado', async ({ page }) => {
    await page.goto('/');
    const btn = page.getByRole('button', { name: 'Projetos' });
    await btn.focus();
    await page.keyboard.press('Enter');
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('link', { name: /Vitrine/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(btn).toBeFocused();
  });

  test('skip link é o primeiro Tab e leva ao conteúdo', async ({ page }) => {
    await page.goto('/projetos/payops');
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' });
    await expect(skip).toBeAttached();
    await page.keyboard.press('Tab');
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
  });

  test('submenu fecha com clique fora', async ({ page }) => {
    await page.goto('/');
    const btn = page.getByRole('button', { name: 'Projetos' });
    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await page.getByRole('heading', { level: 1 }).click();
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  test('host usa Host Grotesk', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toHaveCSS('font-family', /Host Grotesk/);
  });

  test('remote não vaza estilo para o host', async ({ page }) => {
    await page.goto('/projetos/lagoski');
    await expect(page.locator('.lgk-catalog')).toBeVisible();
    await expect(page.locator('body')).toHaveCSS('font-family', /Host Grotesk/);
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(238, 240, 243)');
  });

  test('"Ver os projetos" leva à banda do PayOps e "Abrir a demo" da banda abre a demo', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Ver os projetos' }).click();
    await expect(page).toHaveURL(/\/#payops$/);

    await page.goto('/');
    await page.locator('article.project', { hasText: 'payops-agent' }).getByRole('link', { name: 'Abrir a demo' }).click();
    await expect(page).toHaveURL(/\/projetos\/payops$/);
    await expect(new PayOps(page).root).toBeVisible();
  });

  test('voltar e avançar do navegador funcionam entre rotas', async ({ page }) => {
    await page.goto('/');
    await page.locator('#payops').getByRole('link', { name: 'Abrir a demo' }).click();
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
    await page.getByRole('navigation').getByRole('button', { name: 'Projetos' }).click();
    await page.getByRole('navigation').getByRole('link', { name: 'rag-eval-harness' }).click();
    await expect(page).toHaveURL(/\/projetos\/rag$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('rag-eval-harness');
    // O conteúdo do RAG é coberto pelas jornadas em apps/rag/e2e; aqui basta o remote montar.
    await expect(page.getByRole('heading', { name: /Não foi possível carregar/ })).toHaveCount(0);
  });

  test('páginas sem microfrontend não buscam nenhum remote e não quebram com eles fora do ar', async ({ page }) => {
    const remoteHits: string[] = [];
    await page.route(/localhost:528[1-7]\//, (route) => {
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
      // A entrada do hero anima a opacidade; o contraste se mede com ela concluída.
      else {
        await expect(page.locator('.hero > *')).toHaveCount(3);
        for (const part of await page.locator('.hero > *').all()) await expect(part).toHaveCSS('opacity', '1');
      }
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      const serious = results.violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${scheme} ${path} · ${v.id}: ${v.help} (${v.nodes.length}x) → ${v.nodes[0]?.target.join(' ')}`);
      expect(serious, 'violações sérias/críticas de acessibilidade').toEqual([]);
    }
  });
});

test.describe('layout móvel @mobile', () => {
  // Raiz de cada microfrontend: mede a rolagem só depois do remote montar.
  const roots: Record<string, string> = {
    '/projetos/payops': '.payops',
    '/projetos/rag': '.rag',
    '/projetos/vitrine': '.vt',
    '/projetos/lagoski': '.lgk-catalog',
  };
  for (const width of [390, 320]) {
    for (const path of ['/', '/projetos/payops', '/projetos/rag', '/projetos/vitrine', '/projetos/lagoski', '/nao-existe']) {
      test(`sem rolagem horizontal em ${path} a ${width}px @mobile`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(path);
        if (roots[path]) await expect(page.locator(roots[path]).first()).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, 'pixels de rolagem horizontal').toBeLessThanOrEqual(0);
        await expect(page.getByRole('navigation')).toBeVisible();
      });
    }
  }

  test('jornada de cobrança funciona no celular @mobile', async ({ page }) => {
    const payops = new PayOps(page);
    await payops.open();
    await payops.chargeApproved('45,00');
    await payops.expectBalance('Card revenue', 4_500);
  });
});
