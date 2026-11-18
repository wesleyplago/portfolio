import { expect, test } from './fixtures';

test.describe('home', () => {
  test('hero com o fato e a colagem', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Engenharia de pagamentos e IA que não cobra duas vezes');
    await expect(page.locator('.collage img').first()).toBeVisible();
  });

  test('quatro bandas na marca de cada app, na ordem', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('section.band')).toHaveCount(4);
    await expect(page.locator('section.band').nth(0)).toHaveAttribute('id', 'payops');
    await expect(page.locator('#rag')).toHaveCSS('background-color', 'rgb(24, 25, 27)');
  });

  test('reduced motion: colagem parada e sem botão de pausa', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const jpgs: string[] = [];
    page.on('request', (req) => {
      const name = new URL(req.url()).pathname.split('/').pop()!;
      if (name.endsWith('.jpg')) jpgs.push(name);
    });
    await page.goto('/');
    const collage = page.locator('.collage');
    await expect(collage).toHaveAttribute('data-set', '0');
    await page.waitForTimeout(3200);
    await expect(collage).toHaveAttribute('data-set', '0');
    await expect(page.locator('.collage-set').nth(0).locator('img')).toHaveCount(4);
    await expect(page.locator('.collage-set img')).toHaveCount(4);
    // O recorte do PayOps só existe nos conjuntos 1 a 3 (as bandas usam as capturas -frame).
    expect(jpgs.filter((n) => n.startsWith('payops-crop'))).toEqual([]);
    expect(jpgs.some((n) => n.startsWith('payops-frame'))).toBe(true);
    await expect(page.getByRole('button', { name: /Pausar/ })).toHaveCount(0);
  });

  test('colagem monta só o conjunto 0 e o próximo na primeira tela', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/', { waitUntil: 'load' });
    const sets = page.locator('.collage-set');
    await expect(sets.nth(0).locator('img')).toHaveCount(4);
    await expect(sets.nth(1).locator('img')).toHaveCount(4);
    await expect(sets.nth(2).locator('img')).toHaveCount(0);
    await expect(sets.nth(3).locator('img')).toHaveCount(0);
  });

  test('colagem avança sozinha e o botão pausa e retoma', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const collage = page.locator('.collage');
    await expect(collage).toHaveAttribute('data-set', '0');
    await expect(collage).toHaveAttribute('data-set', '1', { timeout: 6_000 });
    await page.getByRole('button', { name: 'Pausar animação' }).click();
    const paused = await collage.getAttribute('data-set');
    await page.waitForTimeout(3200);
    await expect(collage).toHaveAttribute('data-set', paused!);
    await expect(page.getByRole('button', { name: 'Retomar animação' })).toBeVisible();
  });

  test('ordem das bandas, botões e código só com repositório', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('section.band')).toHaveCount(4);
    expect(await page.locator('section.band').evaluateAll((els) => els.map((e) => e.id))).toEqual(['payops', 'lagoski', 'rag', 'vitrine']);
    await page.locator('#payops').getByRole('link', { name: 'Abrir a demo' }).click();
    await expect(page).toHaveURL(/\/projetos\/payops$/);
    await page.goto('/');
    await expect(page.locator('#payops').getByRole('link', { name: 'Ver o código ↗' })).toBeVisible();
    await expect(page.locator('#vitrine').getByRole('link', { name: /Ver o código/ })).toHaveCount(0);
    const shot = page.locator('#vitrine .app-frame img');
    await shot.scrollIntoViewIfNeeded();
    await expect(shot).toBeVisible();
    await expect.poll(() => shot.evaluate((img: HTMLImageElement) => (img.complete ? img.naturalWidth : 0))).toBeGreaterThan(0);
  });

  test('hero leva aos projetos; sobre e contato existem', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Ver os projetos' })).toHaveAttribute('href', '#payops');
    await expect(page.locator('#sobre').getByRole('heading', { level: 2 })).toHaveText('Como eu trabalho');
    const contato = page.locator('#contato');
    await expect(contato.getByRole('heading', { level: 2 })).toHaveText('Vamos conversar sobre o seu time de pagamentos');
    // LinkedIn e e-mail ainda vazios no profile: os links somem e fica o GitHub.
    await expect(contato.getByRole('link')).not.toHaveCount(0);
    for (const a of await contato.getByRole('link').all()) await expect(a).not.toHaveAttribute('href', /^(mailto:)?$/);
  });
});
