import { z } from 'zod';

export const VerdictSchema = z.enum(['GO', 'KILL', 'PIVOT']);
export type Verdict = z.infer<typeof VerdictSchema>;

export const DimensionSchema = z.object({
  name: z.string(),
  weight: z.number().min(0).max(1),
  score: z.number().min(0).max(100),
});
export type Dimension = z.infer<typeof DimensionSchema>;

export const DecisionSchema = z.object({
  id: z.string().uuid(),
  ideaId: z.string().uuid(),
  verdict: VerdictSchema,
  reasoning: z.string().min(1).max(5000),
  confidence: z.number().min(0).max(1),
  signalIds: z.array(z.string().uuid()),
  dimensions: z.array(DimensionSchema).optional(),
  createdAt: z.string().datetime(),
});

export type Decision = z.infer<typeof DecisionSchema>;
