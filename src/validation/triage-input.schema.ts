import { z } from 'zod';

export const triageInputSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
});

export type TriageInput = z.infer<typeof triageInputSchema>;
