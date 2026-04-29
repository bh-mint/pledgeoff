import { z } from 'zod';

export const VerdictSchema = z.enum(['GO', 'KILL', 'PIVOT']);
export type Verdict = z.infer<typeof VerdictSchema>;

export const DecisionSchema = z.object({
  id: z.string().uuid(),
  ideaId: z.string().uuid(),
  verdict: VerdictSchema,
  reasoning: z.string().min(1).max(5000),
  confidence: z.number().min(0).max(1),
  signalIds: z.array(z.string().uuid()),
  createdAt: z.string().datetime(),
});

export type Decision = z.infer<typeof DecisionSchema>;
