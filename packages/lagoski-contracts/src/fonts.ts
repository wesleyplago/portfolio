/**
 * URL absoluta de um asset importado com `?url`. Este pacote é empacotado dentro de cada remote (não é
 * `shared` no Module Federation), então `import.meta.url` aponta para o chunk do próprio remote e a
 * fonte sai da origem dele, respeitando o `--base` do build.
 */
const abs = (url: string) => new URL(url, import.meta.url).href;

const unquote = (family: string) => family.replace(/^["']|["']$/g, '');

/**
 * Registra as fontes da marca Lagoski pela API FontFace, uma vez por documento: se outro remote (ou a
 * página) já registrou a mesma família com o mesmo peso, não registra de novo, e o navegador baixa o
 * arquivo uma vez só. Sozinho, cada remote registra as próprias. As faces só baixam quando usadas.
 * As URLs vêm de imports `?url` feitos em cada app; `text` é obrigatória, `display` e `mono` opcionais.
 */
export function registerLagoskiFonts(urls: { display?: string; text: string; mono?: string }): void {
  if (typeof document === 'undefined' || typeof FontFace === 'undefined') return;
  const faces = [
    ...(urls.display ? [{ family: 'Newsreader', url: urls.display, weight: '600' }] : []),
    { family: 'Hanken Grotesk', url: urls.text, weight: '100 900' },
    ...(urls.mono ? [{ family: 'JetBrains Mono', url: urls.mono, weight: '400' }] : []),
  ];
  const existing = [...document.fonts];
  for (const f of faces) {
    if (existing.some((e) => unquote(e.family) === f.family && e.weight === f.weight && e.style === 'normal')) continue;
    document.fonts.add(
      new FontFace(f.family, `url(${abs(f.url)}) format("woff2")`, { weight: f.weight, style: 'normal', display: 'swap' }),
    );
  }
}
