import { describe, expect, test } from 'vitest';
import { lagoskiTokens } from './theme';

function hexToHsl(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0 };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s };
}

describe('lagoskiTokens', () => {
  test('cores por contexto sem violeta', () => {
    const hexes = new Set(
      [lagoskiTokens('.x'), lagoskiTokens('.x', 'inspector')].flatMap((css) => css.match(/#[0-9a-f]{6}\b/gi) ?? []),
    );
    expect(hexes.size).toBeGreaterThan(20);
    for (const hex of hexes) {
      const { h, s } = hexToHsl(hex);
      expect(h >= 250 && h <= 300 && s > 0.15, `${hex} é violeta/índigo`).toBe(false);
    }
  });

  test('usa a tabela de contextos nas duas variantes', () => {
    expect(lagoskiTokens('.x')).toContain('--lg-catalog: #0f6b62; --lg-catalog-soft: #d9ece8');
    expect(lagoskiTokens('.x', 'inspector')).toContain('--lg-notification: #e0c27a');
  });

  test('loja em osso e verde', () => {
    const css = lagoskiTokens('.x');
    expect(css).toContain('--lg-bg:#e5e1d8');
    expect(css).toContain('--lg-accent:#3b6131');
  });

  test('inspector é escuro', () => expect(lagoskiTokens('.x', 'inspector')).toContain('--lg-bg:#1c1411'));

  test('color-scheme: shop claro, inspector escuro', () => {
    expect(lagoskiTokens('.x')).toContain('color-scheme:light');
    expect(lagoskiTokens('.x', 'inspector')).toContain('color-scheme:dark');
  });

  test('sem bloco prefers-color-scheme', () => {
    expect(lagoskiTokens('.x')).not.toContain('prefers-color-scheme');
    expect(lagoskiTokens('.x', 'inspector')).not.toContain('prefers-color-scheme');
  });
});
