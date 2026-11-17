import { expect, test } from 'vitest';
import { brands, fontFaceCss, tokensCss } from './index';

test('tokensCss gera variáveis com prefixo sob o escopo', () => {
  const css = tokensCss(brands.payops, '.payops', 'po');
  expect(css).toContain('.payops{');
  expect(css).toContain('--po-accent:#0d7480');
  expect(css).toContain('--po-on-accent:#ffffff');
  expect(css).toContain('--po-radius-md:4px');
  expect(css).toContain('--po-font-display:"Chivo", ui-sans-serif');
  expect(css).not.toContain('prefers-color-scheme');
});

test('tokensCss inclui bloco escuro só quando brand.dark existe', () => {
  const css = tokensCss(brands.host, ':root', 'h');
  expect(css).toContain('@media (prefers-color-scheme: dark)');
  expect(css).toContain('--h-accent:#7d8aff');
});

test('fontFaceCss usa font-display: swap', () => {
  const css = fontFaceCss([
    { family: 'Chivo', url: '/fonts/chivo.woff2', weight: '400 700' },
    { family: 'Chivo', url: '/fonts/chivo-italic.woff2', weight: '400', style: 'italic' },
  ]);
  expect(css).toContain('@font-face{font-family:"Chivo";src:url(/fonts/chivo.woff2) format("woff2");font-weight:400 700;font-style:normal;font-display:swap}');
  expect(css).toContain('font-style:italic');
});
