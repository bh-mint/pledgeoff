import { z } from 'zod';

export const SignalsFetchedV1PayloadSchema = z.object({
  ideaId: z.string().uuid(),
  signalIds: z.array(z.string().uuid()),
  signalCount: z.number().int().min(0),
});

export const SignalsFetchedV1Schema = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal('signals.fetched.v1'),
  eventVersion: z.literal(1),
  occurredAt: z.string().datetime(),
  traceId: z.string(),
  payload: SignalsFetchedV1PayloadSchema,
});

export type SignalsFetchedV1 = z.infer<typeof SignalsFetchedV1Schema>;
