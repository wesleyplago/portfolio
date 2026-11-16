import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BalanceDataSchema,
  MUTATION_TOOLS,
  MutationDataSchema,
  PayOpsApiError,
  type AgentResult,
  type Approval,
  type BalanceData,
  type KbDocument,
  type PayOpsClient,
  type ToolName,
} from '@portfolio/payops-contracts';

export type Intent = {
  tool: ToolName;
  arguments: Record<string, unknown>;
  idempotency_key?: string;
};

export type ActivityEntry = {
  id: string;
  at: Date;
  intent: Intent;
  label: string;
  kind: 'operation' | 'replay' | 'attack' | 'read';
  state: 'waiting' | 'done' | 'error';
  result?: AgentResult;
  error?: string;
};

export type SessionCharge = { id: string; amount_cents: number; customer_id: string; refunded_cents: number };

const isMutation = (tool: ToolName) => (MUTATION_TOOLS as readonly string[]).includes(tool);
const errorText = (err: unknown) =>
  err instanceof PayOpsApiError ? `${err.code}: ${err.message}` : err instanceof Error ? err.message : String(err);

export function usePayOps(client: PayOpsClient) {
  const [online, setOnline] = useState<boolean | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [approvalsError, setApprovalsError] = useState<string | null>(null);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [charges, setCharges] = useState<SessionCharge[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const patch = useCallback((id: string, update: Partial<ActivityEntry>) => {
    if (!mounted.current) return;
    setActivity((list) => list.map((e) => (e.id === id ? { ...e, ...update } : e)));
  }, []);

  const refreshBalance = useCallback(async () => {
    try {
      const r = await client.execute({ tool: 'get_balance', arguments: {} }, [], 'ui: refresh balance');
      const parsed = BalanceDataSchema.safeParse(r.data);
      if (parsed.success && mounted.current) setBalance(parsed.data);
    } catch {
      /* status indicator covers connectivity */
    }
  }, [client]);

  const refreshApprovals = useCallback(async () => {
    try {
      const list = await client.listApprovals('pending');
      if (!mounted.current) return;
      setApprovals(list);
      setApprovalsError(null);
    } catch (err) {
      if (mounted.current) setApprovalsError(errorText(err));
    }
  }, [client]);

  // Health + saldo inicial.
  useEffect(() => {
    let alive = true;
    const check = async () => {
      const ok = await client.ready();
      if (!alive) return;
      setOnline(ok);
    };
    void check();
    void refreshBalance();
    // O mock está sempre disponível; só a API real precisa de health check.
    const t = client.mode === 'live' ? setInterval(check, 5_000) : undefined;
    return () => {
      alive = false;
      if (t) clearInterval(t);
    };
  }, [client, refreshBalance]);

  // O canal humano consulta pedidos pendentes continuamente.
  useEffect(() => {
    void refreshApprovals();
    const t = setInterval(refreshApprovals, 1_000);
    return () => clearInterval(t);
  }, [refreshApprovals]);

  const run = useCallback(
    async (intent: Intent, opts: { label: string; kind?: ActivityEntry['kind']; documents?: KbDocument[] }) => {
      const finalIntent: Intent =
        isMutation(intent.tool) && !intent.idempotency_key
          ? { ...intent, idempotency_key: crypto.randomUUID() }
          : intent;
      const id = crypto.randomUUID();
      const entry: ActivityEntry = {
        id,
        at: new Date(),
        intent: finalIntent,
        label: opts.label,
        kind: opts.kind ?? (isMutation(intent.tool) ? 'operation' : 'read'),
        state: 'waiting',
      };
      setActivity((list) => [entry, ...list].slice(0, 50));
      try {
        const result = await client.execute(finalIntent, opts.documents ?? []);
        patch(id, { state: 'done', result });

        if (result.status === 'completed' && isMutation(finalIntent.tool)) {
          const data = MutationDataSchema.safeParse(result.data);
          const replayed = result.tool_calls.some((t) => t.replayed) || data.data?.replayed === true;
          if (data.success && !replayed && mounted.current) {
            if (finalIntent.tool === 'create_charge') {
              setCharges((list) => [
                {
                  id: data.data.transaction_id,
                  amount_cents: data.data.amount_cents,
                  customer_id: String(finalIntent.arguments.customer_id ?? ''),
                  refunded_cents: 0,
                },
                ...list,
              ]);
            } else if (finalIntent.tool === 'refund') {
              const chargeId = String(finalIntent.arguments.charge_id);
              setCharges((list) =>
                list.map((c) =>
                  c.id === chargeId ? { ...c, refunded_cents: c.refunded_cents + data.data.amount_cents } : c,
                ),
              );
            }
          }
          void refreshBalance();
        }
        return result;
      } catch (err) {
        patch(id, { state: 'error', error: errorText(err) });
        return undefined;
      }
    },
    [client, patch, refreshBalance],
  );

  const decide = useCallback(
    async (approval: Approval, decision: 'approved' | 'denied') => {
      setApprovals((list) => list.filter((a) => a.id !== approval.id));
      try {
        await client.decide(approval.id, decision);
      } catch (err) {
        setApprovalsError(errorText(err));
      }
      void refreshApprovals();
    },
    [client, refreshApprovals],
  );

  const waiting = activity.some((e) => e.state === 'waiting' && isMutation(e.intent.tool));

  return { mode: client.mode, online, activity, approvals, approvalsError, balance, charges, run, decide, refreshBalance, waiting };
}
