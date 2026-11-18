import type { Brand, Palette } from './brands';

export type FontFace = { family: string; url: string; weight: string; style?: 'normal' | 'italic' };

const colorVars: [keyof Palette, string][] = [
  ['bg', 'bg'], ['surface', 'surface'], ['ink', 'ink'], ['muted', 'muted'], ['border', 'border'],
  ['accent', 'accent'], ['onAccent', 'on-accent'], ['ok', 'ok'], ['warn', 'warn'], ['bad', 'bad'],
];

function block(brand: Brand, palette: Palette, scope: string, p: string, mode: Brand['mode']): string {
  const vars = [
    `color-scheme:${mode}`,
    ...colorVars.map(([key, name]) => `--${p}-${name}:${palette[key]}`),
    `--${p}-font-display:${brand.font.display}`,
    `--${p}-font-text:${brand.font.text}`,
    `--${p}-font-mono:${brand.font.mono}`,
    `--${p}-radius-sm:${brand.radius.sm}`,
    `--${p}-radius-md:${brand.radius.md}`,
    `--${p}-radius-lg:${brand.radius.lg}`,
  ];
  return `${scope}{${vars.join(';')}}`;
}

export function tokensCss(brand: Brand, scope: string, prefix: string): string {
  const base = block(brand, brand.color, scope, prefix, brand.mode);
  if (!brand.dark) return base;
  return `${base}@media (prefers-color-scheme: dark){${block(brand, brand.dark, scope, prefix, 'dark')}}`;
}

export function fontFaceCss(faces: FontFace[]): string {
  return faces
    .map(
      (f) =>
        `@font-face{font-family:"${f.family}";src:url(${f.url}) format("woff2");font-weight:${f.weight};font-style:${f.style ?? 'normal'};font-display:swap}`,
    )
    .join('');
}
