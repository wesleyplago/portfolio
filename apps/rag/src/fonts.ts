import { fontFaceCss } from '@portfolio/brands';
import funnelDisplayUrl from '@fontsource-variable/funnel-display/files/funnel-display-latin-wght-normal.woff2?url';
import funnelSansUrl from '@fontsource-variable/funnel-sans/files/funnel-sans-latin-wght-normal.woff2?url';
import dmMono400Url from '@fontsource/dm-mono/files/dm-mono-latin-400-normal.woff2?url';
import dmMono500Url from '@fontsource/dm-mono/files/dm-mono-latin-500-normal.woff2?url';

/**
 * Fontes self-hosted servidas pelo próprio remote. O CSS é injetado via <style> na página do HOST,
 * então a URL é ancorada no módulo do remote (ver apps/payops/src/fonts.ts).
 */
const abs = (url: string) => new URL(url, import.meta.url).href;

export const fonts = fontFaceCss([
  { family: 'Funnel Display', url: abs(funnelDisplayUrl), weight: '300 800' },
  { family: 'Funnel Sans', url: abs(funnelSansUrl), weight: '300 800' },
  { family: 'DM Mono', url: abs(dmMono400Url), weight: '400' },
  { family: 'DM Mono', url: abs(dmMono500Url), weight: '500' },
]);
