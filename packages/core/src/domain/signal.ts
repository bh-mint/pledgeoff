import { z } from 'zod';

export const SignalSourceSchema = z.enum(['reddit', 'hn', 'github']);
export type SignalSource = z.infer<typeof SignalSourceSchema>;

export const SignalSchema = z.object({
  id: z.string().uuid(),
  ideaId: z.string().uuid(),
  source: SignalSourceSchema,
  url: z.string().url(),
  title: z.string().min(1).max(500),
  summary: z.string().max(2000),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  fetchedAt: z.string().datetime(),
});

export type Signal = z.infer<typeof SignalSchema>;
