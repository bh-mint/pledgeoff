import { z } from 'zod';

export const DecisionReadyV1PayloadSchema = z.object({
  ideaId: z.string().uuid(),
  decisionId: z.string().uuid(),
  verdict: z.enum(['GO', 'KILL', 'PIVOT']),
  confidence: z.number().min(0).max(1),
});

export const DecisionReadyV1Schema = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal('decision.ready.v1'),
  eventVersion: z.literal(1),
  occurredAt: z.string().datetime(),
  traceId: z.string(),
  payload: DecisionReadyV1PayloadSchema,
});

export type DecisionReadyV1 = z.infer<typeof DecisionReadyV1Schema>;
