import { fontFaceCss } from '@portfolio/brands';
import chivoUrl from '@fontsource-variable/chivo/files/chivo-latin-wght-normal.woff2?url';
import chivoMonoUrl from '@fontsource-variable/chivo-mono/files/chivo-mono-latin-wght-normal.woff2?url';

/**
 * Fontes self-hosted servidas pelo próprio remote (o host nunca importa assets de um remote).
 * O CSS é injetado via <style> na página do HOST, então uma URL relativa ao remote ("/assets/x")
 * resolveria contra a origem do host. `new URL(url, import.meta.url)` ancora no módulo do remote:
 * funciona em origem própria (e2e) e sob subpasta (/portfolio/mfe/payops/assets/…, `base` do build).
 * Padrão para as Tasks 4–6 e 8.
 */
const abs = (url: string) => new URL(url, import.meta.url).href;

export const fonts = fontFaceCss([
  { family: 'Chivo', url: abs(chivoUrl), weight: '100 900' },
  { family: 'Chivo Mono', url: abs(chivoMonoUrl), weight: '100 900' },
]);
