/** "1.234,56" | "1234.56" | "1234" -> 123456 cents. Returns NaN when unparseable. */
export function parseBrlToCents(input: string): number {
  const raw = input.trim().replace(/^R\$\s*/i, '');
  if (!/^[\d.,]+$/.test(raw)) return Number.NaN;
  // pt-BR: '.' thousands, ',' decimals. Plain "1234.56" is accepted too.
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : Number.NaN;
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
