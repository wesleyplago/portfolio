import { z } from 'zod';
import {
  AgentResultSchema,
  ApiErrorSchema,
  ApprovalListSchema,
  type AgentResult,
  type Approval,
  type ToolName,
} from './schemas';

export type PayOpsClientConfig = {
  baseUrl: string;
  /** Chave do canal do agente (Authorization: Bearer). */
  agentKey: string;
  /** Chave do canal humano. Na demo fica no browser; em produção ficaria atrás de SSO/MFA. */
  approverKey: string;
};

export type KbDocument = { id: string; title: string; content: string };

export class PayOpsApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'PayOpsApiError';
  }
}

async function parseJson<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const err = ApiErrorSchema.safeParse(body);
    throw err.success
      ? new PayOpsApiError(err.data.error.code, err.data.error.message, response.status)
      : new PayOpsApiError('HTTP_ERROR', `HTTP ${response.status}`, response.status);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new PayOpsApiError('CONTRACT_MISMATCH', z.prettifyError(parsed.error), response.status);
  }
  return parsed.data;
}

export function createPayOpsClient(config: PayOpsClientConfig) {
  const base = config.baseUrl.replace(/\/$/, '');

  return {
    async ready(): Promise<boolean> {
      try {
        return (await fetch(`${base}/readyz`)).ok;
      } catch {
        return false;
      }
    },

    /** Pede ao agente. Para mutações, a chamada fica aberta até o humano decidir. */
    async execute(
      intent: { tool: ToolName; arguments: Record<string, unknown>; idempotency_key?: string },
      documents: KbDocument[] = [],
      message = `ui: ${intent.tool}`,
    ): Promise<AgentResult> {
      const response = await fetch(`${base}/v1/agent/execute`, {
        method: 'POST',
        headers: { authorization: `Bearer ${config.agentKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ message, intent, documents }),
      });
      return parseJson(response, AgentResultSchema);
    },

    async listApprovals(status = 'pending'): Promise<Approval[]> {
      const response = await fetch(`${base}/internal/approvals?status=${encodeURIComponent(status)}`, {
        headers: { 'x-approver-key': config.approverKey },
      });
      return (await parseJson(response, ApprovalListSchema)).approvals;
    },

    async decide(id: string, decision: 'approved' | 'denied', decidedBy = 'human:portfolio-ui'): Promise<void> {
      const response = await fetch(`${base}/internal/approvals/${encodeURIComponent(id)}/decision`, {
        method: 'POST',
        headers: { 'x-approver-key': config.approverKey, 'content-type': 'application/json' },
        body: JSON.stringify({ decision, decided_by: decidedBy }),
      });
      await parseJson(response, z.unknown());
    },
  };
}

export type PayOpsClient = ReturnType<typeof createPayOpsClient>;
