import { z } from 'zod';

/**
 * Strict schema for LLM triage output. Used to validate provider responses
 * so we never trust raw JSON; invalid shapes are caught and can trigger retry/fallback.
 */
export const triageOutputSchema = z.object({
  category: z.enum(['billing', 'technical', 'account', 'sales', 'other']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  flags: z.object({
    requires_human: z.boolean(),
    is_abusive: z.boolean(),
    missing_info: z.boolean(),
    is_vip_customer: z.boolean(),
  }),
});

export type TriageOutput = z.infer<typeof triageOutputSchema>;
