import { afterEach, describe, expect, test, vi } from 'vitest';
import { registerLagoskiFonts } from './fonts';

class FakeFontFace {
  style: string;
  weight: string;
  constructor(readonly family: string, readonly source: string, d: { weight: string; style?: string }) {
    this.weight = d.weight;
    this.style = d.style ?? 'normal';
  }
}

function fakeDocument() {
  const fonts = new Set<FakeFontFace>();
  vi.stubGlobal('FontFace', FakeFontFace);
  vi.stubGlobal('document', { fonts });
  return fonts;
}

describe('registerLagoskiFonts', () => {
  afterEach(() => vi.unstubAllGlobals());

  test('registra cada família uma vez por documento, mesmo com vários remotes', () => {
    const fonts = fakeDocument();
    registerLagoskiFonts({ display: '/a/newsreader.woff2', text: '/a/hanken.woff2' });
    registerLagoskiFonts({ display: '/b/newsreader.woff2', text: '/b/hanken.woff2' });
    registerLagoskiFonts({ text: '/c/hanken.woff2', mono: '/c/jetbrains.woff2' });
    expect([...fonts].map((f) => f.family).sort()).toEqual(['Hanken Grotesk', 'JetBrains Mono', 'Newsreader']);
    const hanken = [...fonts].find((f) => f.family === 'Hanken Grotesk')!;
    expect(hanken.source).toMatch(/\/a\/hanken\.woff2\) format\("woff2"\)$/);
  });

  test('peso diferente da mesma família (ex.: JetBrains variável do host) não impede o registro', () => {
    const fonts = fakeDocument();
    fonts.add(new FakeFontFace('"JetBrains Mono"', 'url(/host.woff2)', { weight: '100 800' }));
    registerLagoskiFonts({ text: '/c/hanken.woff2', mono: '/c/jetbrains.woff2' });
    expect([...fonts].filter((f) => f.family === 'JetBrains Mono')).toHaveLength(1);
    expect(fonts.size).toBe(3);
  });

  test('fora do navegador não faz nada', () => {
    expect(() => registerLagoskiFonts({ text: '/x.woff2' })).not.toThrow();
  });
});
