import { z } from 'zod';
import { parseBrlToCents } from './money';

/* ------------------------------------------------------------------ */
/* Regras espelhadas do backend (src/tools/schemas.ts do payops-agent).  */
/* O backend continua sendo a autoridade: aqui é só UX e tipagem.       */
/* ------------------------------------------------------------------ */

export const MAX_AMOUNT_CENTS = 100_000_00;

const amountField = z
  .string()
  .min(1, 'Informe o valor')
  .transform((value, ctx) => {
    const cents = parseBrlToCents(value);
    if (!Number.isInteger(cents) || cents <= 0) {
      ctx.addIssue({ code: 'custom', message: 'Valor inválido' });
      return z.NEVER;
    }
    if (cents > MAX_AMOUNT_CENTS) {
      ctx.addIssue({ code: 'custom', message: 'Acima do teto de R$ 100.000,00' });
      return z.NEVER;
    }
    return cents;
  });

const descriptionField = z.string().trim().min(1, 'Obrigatório').max(140, 'Máximo de 140 caracteres');

export const ChargeFormSchema = z.object({
  amount: amountField,
  customer_id: z
    .string()
    .trim()
    .regex(/^cus_[a-z0-9_]{1,40}$/i, 'Use o formato cus_xxx'),
  description: descriptionField,
});

export const RefundFormSchema = z.object({
  charge_id: z.uuid('Selecione ou cole o ID da cobrança'),
  amount: amountField,
  reason: descriptionField,
});

/**
 * A allowlist de destinos Pix NÃO é validada aqui de propósito: é política do
 * servidor. Assim a interface mostra o bloqueio acontecendo no backend.
 */
export const PixFormSchema = z.object({
  pix_key: z.string().trim().min(3, 'Chave muito curta').max(128),
  amount: amountField,
  description: descriptionField,
});

export type ChargeFormInput = z.input<typeof ChargeFormSchema>;
export type RefundFormInput = z.input<typeof RefundFormSchema>;
export type PixFormInput = z.input<typeof PixFormSchema>;

/* ----------------------------- Respostas ----------------------------- */

export const ToolNameSchema = z.enum(['create_charge', 'refund', 'send_pix', 'get_balance', 'list_invoices']);
export type ToolName = z.infer<typeof ToolNameSchema>;
export const MUTATION_TOOLS = ['create_charge', 'refund', 'send_pix'] as const;

export const ToolCallSchema = z.looseObject({
  tool: z.string(),
  ok: z.boolean(),
  error_code: z.string().optional(),
  replayed: z.boolean().optional(),
  approval_id: z.string().optional(),
});

export const AgentResultSchema = z.looseObject({
  status: z.enum(['completed', 'failed', 'denied']),
  answer: z.string(),
  data: z.unknown().optional(),
  tool_calls: z.array(ToolCallSchema),
  documents: z.looseObject({
    scanned: z.number(),
    suspicious: z.number(),
    quarantined: z.number(),
    pii_documents: z.number(),
    categories: z.record(z.string(), z.number()),
  }),
  trace_id: z.string().optional(),
  model_path: z.string(),
  pii_redactions: z.number().optional(),
});
export type AgentResult = z.infer<typeof AgentResultSchema>;

export const MutationDataSchema = z.looseObject({
  transaction_id: z.string(),
  tool: z.string(),
  status: z.string(),
  amount_cents: z.number(),
  provider_ref: z.string().optional(),
  related_transaction_id: z.string().optional(),
  replayed: z.boolean().optional(),
});
export type MutationData = z.infer<typeof MutationDataSchema>;

export const BalanceDataSchema = z.looseObject({
  as_of: z.string(),
  accounts: z.array(
    z.looseObject({
      name: z.string(),
      type: z.string(),
      normal_balance: z.enum(['debit', 'credit']),
      balance_cents: z.number(),
    }),
  ),
});
export type BalanceData = z.infer<typeof BalanceDataSchema>;

export const InvoicesDataSchema = z.looseObject({
  invoices: z.array(
    z.looseObject({
      id: z.string(),
      customer_id: z.string(),
      amount_cents: z.number(),
      status: z.string(),
      due_date: z.string(),
    }),
  ),
});
export type InvoicesData = z.infer<typeof InvoicesDataSchema>;

export const ApprovalSchema = z.looseObject({
  id: z.string(),
  tool: z.string(),
  arguments: z.record(z.string(), z.unknown()),
  idempotency_key: z.string(),
  amount_cents: z.number().nullable().optional(),
  justification: z.string().nullable().optional(),
  status: z.string(),
  requested_at: z.string(),
  expires_at: z.string().nullable().optional(),
});
export type Approval = z.infer<typeof ApprovalSchema>;

export const ApprovalListSchema = z.object({ approvals: z.array(ApprovalSchema) });

export const ApiErrorSchema = z.object({
  error: z.looseObject({ code: z.string(), message: z.string() }),
});
