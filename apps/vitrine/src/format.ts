const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });

export const money = (value: number) => brl.format(value);
export const percent = (value: number) => pct.format(value);

/** Erro do Zod (validação antes de chamar a API) mostra só a primeira mensagem. */
export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'issues' in error && Array.isArray(error.issues)) {
    const first: unknown = error.issues[0];
    if (first && typeof first === 'object' && 'message' in first) return String(first.message);
  }
  return error instanceof Error ? error.message : String(error);
}
