import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Espelho de src/api/server.ts do rag-eval-harness.                    */
/* O backend continua sendo a autoridade: aqui é UX e tipagem.          */
/* ------------------------------------------------------------------ */

export const SearchRequestSchema = z.object({
  query: z.string().trim().min(2, 'Digite pelo menos 2 caracteres').max(500, 'Máximo de 500 caracteres'),
  k: z.number().int().min(1).max(50).default(5),
});
export type SearchRequest = z.input<typeof SearchRequestSchema>;

export const SearchHitSchema = z.object({
  chunkId: z.number().int(),
  score: z.number(),
  sectionPath: z.string(),
  documentSlug: z.string(),
  documentTitle: z.string(),
  content: z.string(),
  isTable: z.boolean(),
});
export type SearchHit = z.infer<typeof SearchHitSchema>;

export const AbstentionReasonSchema = z.enum(['ok', 'below_threshold', 'no_results']);
export type AbstentionReason = z.infer<typeof AbstentionReasonSchema>;

export const SearchResponseSchema = z.object({
  query: z.string(),
  abstained: z.boolean(),
  reason: AbstentionReasonSchema,
  topScore: z.number().nullable(),
  results: z.array(SearchHitSchema),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

export const HealthSchema = z.object({
  status: z.literal('ok'),
  ready: z.boolean(),
  model: z.string(),
  uptimeSeconds: z.number(),
});
export type Health = z.infer<typeof HealthSchema>;

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
