import { describe, expect, it } from 'vitest';
import { ChargeFormSchema, PixFormSchema, RefundFormSchema } from './schemas';
import { formatCents, parseBrlToCents } from './money';

describe('money', () => {
  it.each([
    ['123,45', 12345],
    ['1.234,56', 123456],
    ['R$ 10', 1000],
    ['99.90', 9990],
    ['abc', Number.NaN],
  ])('parses %s', (input, cents) => {
    expect(parseBrlToCents(input)).toEqual(cents);
  });

  it('formats BRL', () => {
    expect(formatCents(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56');
  });
});

describe('form schemas mirror backend rules', () => {
  it('converts a valid charge to cents', () => {
    const parsed = ChargeFormSchema.parse({ amount: '123,45', customer_id: 'cus_demo', description: 'x' });
    expect(parsed.amount).toBe(12345);
  });

  it('rejects the R$100k ceiling and a bad customer id', () => {
    const r = ChargeFormSchema.safeParse({ amount: '100.000,01', customer_id: 'demo', description: 'x' });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path[0]).sort()).toEqual(['amount', 'customer_id']);
  });

  it('requires a UUID charge id for refunds', () => {
    expect(RefundFormSchema.safeParse({ charge_id: 'nope', amount: '1', reason: 'x' }).success).toBe(false);
  });

  it('does not enforce the Pix allowlist client-side (server policy)', () => {
    expect(PixFormSchema.safeParse({ pix_key: 'pix-atacante', amount: '10', description: 'x' }).success).toBe(true);
  });
});
