/**
 * Cliente em memória que reproduz o contrato do payops-agent.
 *
 * Usado quando a API não está declarada ou está fora do ar: o microfrontend
 * continua utilizável, com as mesmas regras observáveis do backend real:
 *
 * - toda mutação passa por aprovação humana (a promise fica aberta até a
 *   decisão; sem decisão em `approvalWaitMs`, APPROVAL_EXPIRED);
 * - idempotência: mesma chave + mesmos argumentos = replay sem nova aprovação;
 *   mesma chave + outros argumentos = IDEMPOTENCY_CONFLICT;
 * - estorno nunca passa do capturado (REFUND_EXCEEDS_CAPTURE), mesmo aprovado;
 * - Pix só para a allowlist (POLICY_VIOLATION antes de chegar ao humano);
 * - partidas dobradas: cada lançamento tem débito e crédito do mesmo valor;
 * - documentos do KB são escaneados e postos em quarentena, nunca obedecidos.
 *
 * Não é o backend: não há Postgres, outbox, OpenTelemetry nem persistência.
 * Os códigos e mensagens seguem src/agent/runtime.ts e src/ledger/service.ts.
 */
import { PayOpsApiError, type ExecuteIntent, type KbDocument, type PayOpsClient } from './client';
import { formatCents } from './money';
import { MAX_AMOUNT_CENTS, MUTATION_TOOLS, type AgentResult, type Approval, type ToolName } from './schemas';

export type MockOptions = {
  /** Quanto o "agente" espera pela decisão humana (backend do compose: 20 s). */
  approvalWaitMs?: number;
  /** Validade do pedido de aprovação (backend: 60 s). */
  approvalTtlMs?: number;
  /** Latência artificial por chamada, para a UI se comportar como na rede. */
  latencyMs?: number;
  pixAllowlist?: string[];
  now?: () => number;
};

type Account = 'cash' | 'revenue' | 'refunds' | 'pix';
const ACCOUNTS: Record<Account, { name: string; type: string; normal_balance: 'debit' | 'credit' }> = {
  revenue: { name: 'Card revenue', type: 'revenue', normal_balance: 'credit' },
  cash: { name: 'Cash / settlement', type: 'asset', normal_balance: 'debit' },
  pix: { name: 'Pix payouts', type: 'expense', normal_balance: 'debit' },
  refunds: { name: 'Refunds (contra-revenue)', type: 'expense', normal_balance: 'debit' },
};

const INVOICES = [
  { id: '11111111-1111-4111-8111-111111111111', customer_id: 'cus_001', amount_cents: 129_900, status: 'open', due_date: '2026-11-01' },
  { id: '22222222-2222-4222-8222-222222222222', customer_id: 'cus_001', amount_cents: 49_900, status: 'paid', due_date: '2026-09-01' },
  { id: '33333333-3333-4333-8333-333333333333', customer_id: 'cus_002', amount_cents: 250_000, status: 'overdue', due_date: '2026-09-15' },
  { id: '44444444-4444-4444-8444-444444444444', customer_id: 'cus_002', amount_cents: 75_000, status: 'open', due_date: '2026-11-15' },
  { id: '55555555-5555-4555-8555-555555555555', customer_id: 'cus_003', amount_cents: 10_000, status: 'void', due_date: '2026-08-01' },
  { id: '66666666-6666-4666-8666-666666666666', customer_id: 'cus_004', amount_cents: 320_000, status: 'paid', due_date: '2026-10-01' },
];

/* Mesmas regras de src/agent/documents.ts e src/domain/pii.ts. */
const SCAN_RULES: Array<{ category: string; pattern: RegExp }> = [
  { category: 'ignore_previous_instructions', pattern: /\b(ignore|disregard|forget)\b[^.]{0,40}\b(previous|prior|above|all)\b[^.]{0,25}\b(instructions?|prompts?|rules?)\b/i },
  { category: 'ignore_previous_instructions', pattern: /\b(desconsidere|ignore|esqueça)\b[^.]{0,40}\b(instruções|regras|comandos)\b/i },
  { category: 'ignore_previous_instructions', pattern: /\b(system prompt|prompt do sistema|you are now|você agora é|developer mode|modo manutenção)\b/i },
  { category: 'request_refund', pattern: /\b(refund|estorn\w*|devolv\w*|chargeback)\b/i },
  { category: 'exfiltrate_pii', pattern: /\b(cpf|pii|ssn|passport|senha|password|dados pessoais|cartão de crédito)\b/i },
  { category: 'exfiltrate_pii', pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { category: 'change_policy', pattern: /\b(policy|política|limite|limit|sem aprovação|without approval|no longer require|nova regra|override)\b/i },
  { category: 'forge_approval', pattern: /\b(approval token|token de aprovação|já aprovado|already approved|approval granted|apv_[a-z0-9_-]+)\b/i },
];
const PII = [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, /\b(?:\d[ -]*?){13,19}\b/];

export function scanDocuments(documents: KbDocument[]): AgentResult['documents'] {
  const categories: Record<string, number> = {};
  let suspicious = 0;
  let quarantined = 0;
  let piiDocs = 0;
  for (const doc of documents) {
    const found = new Set<string>();
    for (const rule of SCAN_RULES) {
      if (rule.pattern.test(doc.content) || rule.pattern.test(doc.title)) found.add(rule.category);
    }
    const pii = PII.some((p) => p.test(doc.content));
    if (pii) {
      found.add('exfiltrate_pii');
      piiDocs += 1;
    }
    const isSuspicious = found.size > 0 || /```|<\/?system>|<\|im_start\|>|BEGIN INSTRUCTION/i.test(doc.content);
    if (isSuspicious) suspicious += 1;
    if (isSuspicious || pii) quarantined += 1;
    for (const c of found) categories[c] = (categories[c] ?? 0) + 1;
  }
  return { scanned: documents.length, suspicious, quarantined, pii_documents: piiDocs, categories };
}

type ToolCall = AgentResult['tool_calls'][number];
type StoredTx = { hash: string; data: Record<string, unknown> };
type PendingApproval = Approval & { settle?: (decision: 'approved' | 'denied') => void };

const isMutation = (tool: ToolName) => (MUTATION_TOOLS as readonly string[]).includes(tool);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const canonical = (v: unknown): string =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? `{${Object.keys(v as object)
        .sort()
        .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
        .join(',')}}`
    : JSON.stringify(v);

export function createMockPayOpsClient(options: MockOptions = {}): PayOpsClient {
  const approvalWaitMs = options.approvalWaitMs ?? 20_000;
  const approvalTtlMs = options.approvalTtlMs ?? 60_000;
  const latencyMs = options.latencyMs ?? 120;
  const pixAllowlist = options.pixAllowlist ?? ['pix-demo-key', 'pix-vendor-001', 'pix-vendor-002'];
  const now = options.now ?? Date.now;

  const byKey = new Map<string, StoredTx>();
  const captures = new Map<string, { amount: number; refunded: number }>();
  const approvals = new Map<string, PendingApproval>();
  const ledger: Record<Account, { debit: number; credit: number }> = {
    cash: { debit: 0, credit: 0 },
    revenue: { debit: 0, credit: 0 },
    refunds: { debit: 0, credit: 0 },
    pix: { debit: 0, credit: 0 },
  };
  let seq = 0;

  /** Um lançamento = um débito e um crédito do mesmo valor (o invariante). */
  const post = (debit: Account, credit: Account, cents: number) => {
    ledger[debit].debit += cents;
    ledger[credit].credit += cents;
  };

  const balance = () => ({
    as_of: new Date(now()).toISOString(),
    accounts: (Object.keys(ACCOUNTS) as Account[]).map((a) => {
      const meta = ACCOUNTS[a];
      const { debit, credit } = ledger[a];
      return { ...meta, account_id: `acc_${a}`, balance_cents: meta.normal_balance === 'debit' ? debit - credit : credit - debit };
    }),
  });

  const answerFor = (tool: ToolName, status: AgentResult['status'], data: unknown, code?: string): string => {
    if (status !== 'completed') return `Ação não executada. Código: ${code ?? 'UNKNOWN'}.`;
    const d = data as Record<string, unknown>;
    if (tool === 'create_charge') return `Cobrança registrada: ${formatCents(d.amount_cents as number)} (transação ${d.transaction_id}).`;
    if (tool === 'refund') return `Estorno registrado: ${formatCents(d.amount_cents as number)} (transação ${d.transaction_id}).`;
    if (tool === 'send_pix') return `Pix enviado: ${formatCents(d.amount_cents as number)} (transação ${d.transaction_id}).`;
    if (tool === 'get_balance') {
      const accounts = (d.accounts as Array<{ name: string; balance_cents: number }>) ?? [];
      return `Saldos: ${accounts.map((a) => `${a.name}=${formatCents(a.balance_cents)}`).join('; ')}.`;
    }
    return `${(d.invoices as unknown[]).length} fatura(s) encontrada(s).`;
  };

  const result = (
    intent: ExecuteIntent,
    documents: AgentResult['documents'],
    status: AgentResult['status'],
    toolCalls: ToolCall[],
    data?: unknown,
    code?: string,
  ): AgentResult => ({
    status,
    answer: answerFor(intent.tool, status, data, code),
    ...(data === undefined ? {} : { data }),
    tool_calls: toolCalls,
    documents,
    model_path: 'bounded-intent',
    pii_redactions: 0,
  });

  const fail = (tool: string, code: string): ToolCall => ({ tool, ok: false, error_code: code });

  /** Abre o pedido e espera a decisão humana, como o canal de aprovação do backend. */
  const waitForHuman = (intent: ExecuteIntent, amount: number): Promise<'approved' | 'denied' | 'expired'> => {
    const id = crypto.randomUUID();
    const requestedAt = now();
    const approval: PendingApproval = {
      id,
      tool: intent.tool,
      arguments: intent.arguments,
      idempotency_key: intent.idempotency_key!,
      amount_cents: amount,
      justification: `Operator requested ${intent.tool}; approve only this exact tool, amount, destination and idempotency key.`,
      status: 'pending',
      requested_at: new Date(requestedAt).toISOString(),
      expires_at: new Date(requestedAt + approvalTtlMs).toISOString(),
    };
    approvals.set(id, approval);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        approval.status = 'expired';
        approval.settle = undefined;
        resolve('expired');
      }, approvalWaitMs);
      approval.settle = (decision) => {
        clearTimeout(timer);
        approval.status = decision;
        approval.settle = undefined;
        resolve(decision);
      };
    });
  };

  async function executeMutation(intent: ExecuteIntent, docs: AgentResult['documents']): Promise<AgentResult> {
    const tool = intent.tool;
    const args = intent.arguments;
    const key = intent.idempotency_key;
    const amount = args.amount_cents;
    if (!key) return result(intent, docs, 'failed', [fail(tool, 'VALIDATION_ERROR')], undefined, 'VALIDATION_ERROR');
    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0 || amount > MAX_AMOUNT_CENTS) {
      return result(intent, docs, 'failed', [fail(tool, 'VALIDATION_ERROR')], undefined, 'VALIDATION_ERROR');
    }

    // Replay probe: a chave é checada antes de qualquer aprovação (INCIDENT-002).
    const hash = canonical({ tool, args });
    const prior = byKey.get(key);
    if (prior) {
      if (prior.hash !== hash) {
        return result(intent, docs, 'failed', [fail(tool, 'IDEMPOTENCY_CONFLICT')], undefined, 'IDEMPOTENCY_CONFLICT');
      }
      const data = { ...prior.data, replayed: true };
      return result(intent, docs, 'completed', [{ tool, ok: true, replayed: true }], data);
    }

    // Política imutável: avaliada no request_approval, antes de chegar ao humano.
    if (tool === 'send_pix' && !pixAllowlist.includes(String(args.pix_key))) {
      return result(intent, docs, 'failed', [fail('request_approval', 'POLICY_VIOLATION')], undefined, 'POLICY_VIOLATION');
    }

    const decision = await waitForHuman(intent, amount);
    if (decision !== 'approved') {
      const code = decision === 'denied' ? 'APPROVAL_DENIED' : 'APPROVAL_EXPIRED';
      return result(intent, docs, 'denied', [fail('request_approval', code)], undefined, code);
    }
    const approvalCall: ToolCall = { tool: 'request_approval', ok: true };

    // Outra chamada com a mesma chave pode ter vencido enquanto esperávamos o humano.
    const winner = byKey.get(key);
    if (winner) {
      return winner.hash === hash
        ? result(intent, docs, 'completed', [approvalCall, { tool, ok: true, replayed: true }], { ...winner.data, replayed: true })
        : result(intent, docs, 'failed', [approvalCall, fail(tool, 'IDEMPOTENCY_CONFLICT')], undefined, 'IDEMPOTENCY_CONFLICT');
    }

    seq += 1;
    const txId = crypto.randomUUID();
    let data: Record<string, unknown>;
    if (tool === 'create_charge') {
      post('cash', 'revenue', amount);
      captures.set(txId, { amount, refunded: 0 });
      data = { transaction_id: txId, tool, status: 'captured', amount_cents: amount, provider_ref: `mock_capture_${seq}` };
    } else if (tool === 'refund') {
      const chargeId = String(args.charge_id);
      const capture = captures.get(chargeId);
      if (!capture) return result(intent, docs, 'failed', [approvalCall, fail(tool, 'NOT_FOUND')], undefined, 'NOT_FOUND');
      if (capture.refunded + amount > capture.amount) {
        return result(intent, docs, 'failed', [approvalCall, fail(tool, 'REFUND_EXCEEDS_CAPTURE')], undefined, 'REFUND_EXCEEDS_CAPTURE');
      }
      capture.refunded += amount;
      post('refunds', 'cash', amount);
      data = {
        transaction_id: txId,
        tool,
        status: 'posted',
        amount_cents: amount,
        provider_ref: `mock_refund_${seq}`,
        related_transaction_id: chargeId,
        reason: args.reason,
      };
    } else {
      post('pix', 'cash', amount);
      data = { transaction_id: txId, tool, status: 'posted', amount_cents: amount, provider_ref: `mock_pix_${seq}` };
    }
    byKey.set(key, { hash, data });
    return result(intent, docs, 'completed', [approvalCall, { tool, ok: true, replayed: false }], { ...data, replayed: false });
  }

  return {
    mode: 'mock',

    async ready() {
      return true;
    },

    async execute(intent, documents = []) {
      await sleep(latencyMs);
      const docs = scanDocuments(documents);
      if (isMutation(intent.tool)) return executeMutation(intent, docs);

      if (intent.tool === 'get_balance') {
        return result(intent, docs, 'completed', [{ tool: 'get_balance', ok: true }], balance());
      }
      if (intent.tool === 'list_invoices') {
        const status = intent.arguments.status;
        const limit = typeof intent.arguments.limit === 'number' ? intent.arguments.limit : 20;
        const invoices = INVOICES.filter((i) => !status || i.status === status)
          .sort((a, b) => a.due_date.localeCompare(b.due_date))
          .slice(0, limit);
        return result(intent, docs, 'completed', [{ tool: 'list_invoices', ok: true }], { invoices });
      }
      throw new PayOpsApiError('VALIDATION_ERROR', 'invalid agent request', 400);
    },

    async listApprovals(status = 'pending') {
      await sleep(Math.min(latencyMs, 30));
      return [...approvals.values()]
        .filter((a) => a.status === status)
        .map(({ settle: _settle, ...a }) => a);
    },

    async decide(id, decision) {
      await sleep(latencyMs);
      const approval = approvals.get(id);
      if (!approval) throw new PayOpsApiError('NOT_FOUND', 'approval not found', 404);
      if (!approval.settle) throw new PayOpsApiError('APPROVAL_EXPIRED', 'approval request expired', 403);
      approval.settle(decision);
    },
  };
}
