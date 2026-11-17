import { fontFaceCss } from '@portfolio/brands';

/**
 * @font-face das fontes da marca Lagoski. As URLs vêm de imports `?url` feitos em cada app (para o Vite
 * resolver o `--base` do remote) e já devem estar absolutas (`new URL(url, import.meta.url).href`).
 * Cada app passa só as faces que usa: `text` é obrigatória; `display` e `mono` são opcionais.
 */
export function lagoskiFonts(urls: { display?: string; text: string; mono?: string }): string {
  return fontFaceCss([
    ...(urls.display ? [{ family: 'Newsreader', url: urls.display, weight: '600' }] : []),
    { family: 'Hanken Grotesk', url: urls.text, weight: '100 900' },
    ...(urls.mono ? [{ family: 'JetBrains Mono', url: urls.mono, weight: '400' }] : []),
  ]);
}
