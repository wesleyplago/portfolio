import { describe, expect, test } from 'vitest';
import { accentHover, brands, contrast, hue, type Palette } from './index';

const roles = ['ink', 'muted', 'accent', 'ok', 'warn', 'bad'] as const;

function saturation(hex: string): number {
  const ch = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255;
  const [r, g, b] = [ch(1), ch(3), ch(5)];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  return max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
}

for (const b of Object.values(brands)) {
  for (const p of [b.color, b.dark].filter(Boolean) as Palette[]) {
    describe(`${b.id}${p === b.dark ? ' (dark)' : ''}`, () => {
      test('contraste AA', () => {
        for (const r of roles) {
          for (const g of ['bg', 'surface'] as const) {
            expect(contrast(p[r], p[g])).toBeGreaterThanOrEqual(4.5);
          }
        }
        expect(contrast(p.onAccent, p.accent)).toBeGreaterThanOrEqual(4.5);
      });
      test('hover do botão primário muda a cor e mantém AA', () => {
        const hover = accentHover(p.accent, p.onAccent);
        expect(hover).not.toBe(p.accent);
        expect(contrast(p.onAccent, hover)).toBeGreaterThanOrEqual(contrast(p.onAccent, p.accent));
      });
      test('nada de violeta', () => {
        for (const v of Object.values(p)) {
          if (saturation(v) <= 0.15) continue;
          const h = hue(v);
          expect(h >= 250 && h <= 300).toBe(false);
        }
      });
    });
  }
}

test('marcas distintas: nenhum accent nem família de display repetidos', () => {
  const ids = ['host', 'payops', 'rag', 'vitrine', 'lagoski'] as const;
  const accents = ids.map((i) => brands[i].color.accent);
  const displays = ids.map((i) => brands[i].font.display);
  expect(new Set(accents).size).toBe(ids.length);
  expect(new Set(displays).size).toBe(ids.length);
});

test('contrast("#000000", "#ffffff") === 21', () => {
  expect(contrast('#000000', '#ffffff')).toBe(21);
});

test('hue de cores acromáticas é 0', () => {
  expect(hue('#ffffff')).toBe(0);
  expect(hue('#808080')).toBe(0);
});
