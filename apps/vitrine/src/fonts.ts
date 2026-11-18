import { fontFaceCss } from '@portfolio/brands';
import rethinkSansUrl from '@fontsource-variable/rethink-sans/files/rethink-sans-latin-wght-normal.woff2?url';
import zillaSlab600Url from '@fontsource/zilla-slab/files/zilla-slab-latin-600-normal.woff2?url';

/**
 * Fontes self-hosted servidas pelo próprio remote. O CSS é injetado via <style> na página do HOST,
 * então a URL é ancorada no módulo do remote (ver apps/payops/src/fonts.ts).
 */
const abs = (url: string) => new URL(url, import.meta.url).href;

export const fonts = fontFaceCss([
  { family: 'Zilla Slab', url: abs(zillaSlab600Url), weight: '600' },
  { family: 'Rethink Sans', url: abs(rethinkSansUrl), weight: '400 800' },
]);
