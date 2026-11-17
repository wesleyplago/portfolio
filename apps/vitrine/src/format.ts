const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });

export const money = (value: number) => brl.format(value);
export const percent = (value: number) => pct.format(value);

/**
 * Preço digitado em reais: "59,90", "1.299,90", "R$ 59,90" ou "59.90".
 * Devolve 0 quando não dá para ler, para cair na mensagem "Preço maior que zero".
 */
export function parsePrice(input: string): number {
  const raw = input.replace(/[^\d.,]/g, '');
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

/** Erro do Zod (validação antes de chamar a API) mostra só a primeira mensagem. */
export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'issues' in error && Array.isArray(error.issues)) {
    const first: unknown = error.issues[0];
    if (first && typeof first === 'object' && 'message' in first) return String(first.message);
  }
  return error instanceof Error ? error.message : String(error);
}
