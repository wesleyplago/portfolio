function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const ch = (i: number) => parseInt(h.slice(i, i + 2), 16) / 255;
  return [ch(0), ch(2), ch(4)];
}

function luminance(hex: string): number {
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = rgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Razão de contraste WCAG 2.x entre duas cores hex (#rrggbb). */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Matiz HSL em graus (0–360). Cores acromáticas retornam 0. */
export function hue(hex: string): number {
  const [r, g, b] = rgb(hex);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

/**
 * Cor de hover do botão primário: o destaque misturado 20% com preto ou branco,
 * para o lado que afasta do texto (onAccent). Muda visivelmente em toda marca,
 * inclusive quando accent == ink (Vitrine), e o contraste com o texto só sobe.
 */
export function accentHover(accent: string, onAccent: string): string {
  const toward = contrast(onAccent, '#000000') > contrast(onAccent, '#ffffff') ? 0 : 1;
  const hex = (c: number) => Math.round((c * 0.8 + toward * 0.2) * 255).toString(16).padStart(2, '0');
  return `#${rgb(accent).map(hex).join('')}`;
}
